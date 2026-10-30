/**
 * ローカル通知。端末内で完結する(spec §4: バックエンドなし)。
 *
 * ⚠ 「時刻を過ぎて未完了なら通知」は事前予約では直接書けない。
 *   予約時点では完了状態が分からないため、**先に予約し、完了したら消す**という
 *   逆向きの実装になる(spec §4 通知実装の制約-3)。
 *   設計を誤ると「終わってるのに煽られる」が起きる。ここが事故の起点。
 *
 * ⚠ 通知のペイロードにユーザー本文を入れない。遷移は routineId だけで解決する
 *   (spec §2 入力テキストの安全な取り扱い-3)。
 *
 * ⚠ 文言が0件なら1件も送らない。アプリ側の定型文で埋めない ── 核が死ぬ。
 */

import * as Notifications from 'expo-notifications';

import {
  ACTION_DONE,
  ACTION_SNOOZE,
  IOS_SCHEDULED_LIMIT,
  ROUTINE_CATEGORY,
  SCHEDULE_DAYS_AHEAD,
  SNOOZE_ID_PREFIX,
  SNOOZE_MINUTES,
} from '@/constants/notifications';
import { t } from '@/i18n';
import { toDateKey } from '@/lib/date';
import { isProCached } from '@/lib/purchases';
import { getAppState, getDailyRecords, getMessages, getRoutines } from '@/storage';
import type { KatsuMessage, RoutineItem } from '@/types';

/** 通知に載せるデータ。**ユーザーの本文をここに入れないこと** */
type KatsuNotificationData = {
  routineId: string;
};

/** 通知タップで開いたときに読む routineId を取り出す */
export function routineIdFromResponse(
  response: Notifications.NotificationResponse,
): string | undefined {
  const data = response.notification.request.content.data as
    | Partial<KatsuNotificationData>
    | undefined;
  return typeof data?.routineId === 'string' ? data.routineId : undefined;
}

// --- 権限 -------------------------------------------------------------------

/**
 * 現在の許可状態。**要求はしない。**
 * 理由を説明する前に権限ダイアログを出さないため、取得と要求を分けてある。
 */
export async function getNotificationPermission(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** 許可を求める。⚠ 画面側で理由を説明した後にだけ呼ぶこと */
export async function requestNotificationPermission(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

// --- 通知のボタン(1.0.3、plan §8 追加) ------------------------------------------

/**
 * 通知を長押ししたときのボタンを登録する。起動のたびに呼んでよい(上書きされる)。
 *   - やった ✓      アプリが開き、そのルーティンにチェックが付く
 *   - 10分後にもう一度  アプリを開かずに、同じ言葉を10分後に届け直す
 * ⚠ 「もう一度」はアプリを開かない。iOS が裏で処理を走らせるかは実機で確かめること
 *   (expo-notifications のドキュメントに書かれていない。2026-10-30)
 */
export async function registerNotificationActions(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(ROUTINE_CATEGORY, [
    {
      identifier: ACTION_DONE,
      buttonTitle: t.notifications.done,
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: t.notifications.snooze(SNOOZE_MINUTES),
      options: { opensAppToForeground: false },
    },
  ]);
}

/** 通知が届いた日(ローカル)。届いた日のうちだけ「やった」でチェックを付ける */
export function deliveredOn(response: Notifications.NotificationResponse): string {
  const raw = response.notification.date;
  // 秒で来ることもあるので、ミリ秒にそろえる
  return toDateKey(new Date(raw < 1e12 ? raw * 1000 : raw));
}

/**
 * 同じ通知を、`SNOOZE_MINUTES` 分後にもう一度届ける。
 * ⚠ 本文は本人が書いた言葉そのもの(届いた通知の中身をそのまま使う)。端末の外には出ない
 */
export async function snoozeNotification(response: Notifications.NotificationResponse): Promise<void> {
  const { title, body } = response.notification.request.content;
  const routineId = routineIdFromResponse(response);
  if (!routineId || !body) return;
  const payload: KatsuNotificationData = { routineId };
  await Notifications.scheduleNotificationAsync({
    identifier: `${SNOOZE_ID_PREFIX}.${routineId}.${Date.now()}`,
    content: { title: title ?? undefined, body, data: payload, categoryIdentifier: ROUTINE_CATEGORY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SNOOZE_MINUTES * 60,
    },
  });
}

// --- 試しに届ける -------------------------------------------------------------

/** 試しの通知が届くまでの秒数。画面を見ている間に届く長さにする */
const TRIAL_DELAY_SECONDS = 3;

/**
 * オンボーディングの最後に「試しに今、届けてみる」(plan §7-5)。
 * このアプリの価値は、自分の言葉が通知で届いた瞬間に分かる。最初の時刻を待たせない。
 *
 * ⚠ 本文は本人が今書いた言葉そのもの。端末内のローカル通知で、どこにも送らない。
 * ⚠ data には何も入れない(本文を入れない決まりは同じ。遷移先も要らない)。
 * ⚠ 届く前に `syncScheduledNotifications` の cancelAll が走ると消える。秒数を短くしてある
 */
export async function sendTrialNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: {} },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: TRIAL_DELAY_SECONDS,
    },
  });
}

// --- 予約 -------------------------------------------------------------------

/**
 * そのルーティンに使う文言を選ぶ。
 *
 * 項目ごとの出し分けは有料(課金機会③)。
 * ⚠ **無料のときは先頭1件を全ルーティン共通で使う。**
 *   画面側は2つ目以降を「Locked ── still yours」と表示して触らせないのに、
 *   通知だけがそれを鳴らしていると、ロックが嘘になり ②③ が課金機会として成立しない。
 *   ロック済みの言葉は**消さない**(spec §2)。使わないだけで、再課金すれば戻る。
 */
function messageFor(
  messages: KatsuMessage[],
  routine: RoutineItem,
  isPaid: boolean,
  dayKey: string,
): KatsuMessage | undefined {
  // ⚠ 無料に戻ったとき、**割り当ての無い言葉を先に探す。**
  //   有料中に1件目へルーティンを割り当てていると、`messages[0]` を素で返した場合に
  //   「特定のルーティン用に書いた言葉が全ルーティンで鳴る」ことになる。
  //   共通のものが1つも無ければ先頭に落とす(鳴らさないよりは本人の言葉を届ける)。
  if (!isPaid) {
    return messages.find((message) => message.routineId === undefined) ?? messages[0];
  }

  // そのルーティン専用があればその中から。無ければ共通の中から
  const mine = messages.filter((message) => message.routineId === routine.id);
  const pool = mine.length ? mine : messages.filter((message) => message.routineId === undefined);
  if (pool.length === 0) return undefined;
  if (pool.length === 1) return pool[0];

  // ⚠ **`find` で先頭だけを使わないこと。**書いたのに一度も届かない言葉が生まれる。
  //   同じ対象に複数あるなら日替わりで回す(spec §2 複数の言葉の扱い)。
  return pool[pickIndex(`${dayKey}:${routine.id}`, pool.length)];
}

/**
 * 日付とルーティンから決まる添字。
 *
 * ⚠ **`Math.random` を使わないこと。**予約は画面を開くたびに全消し→貼り直しする。
 *   毎回引き直すと、同じ日の通知がアプリを開くたびに別の言葉に化ける。
 *   同じ日・同じ項目なら必ず同じ結果になる必要がある。
 */
function pickIndex(seed: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % count;
}

/** `startedOn`("2027-01-01")をその日の 0:00 の Date にする。無ければ null */
function parseStartDay(startedOn: string | undefined): Date | null {
  const [year, month, day] = (startedOn ?? '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/** その日のその時刻を表す Date を作る */
function occurrenceAt(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const at = new Date(day);
  at.setHours(hours, minutes, 0, 0);
  return at;
}

/**
 * 予約を消す。「もう一度」の予約だけは、そのルーティンが今日まだ終わっていなければ残す
 * (全消しすると、アプリを開いただけで「10分後にもう一度」が消えてしまう)。
 */
async function cancelPlanned(keepSnoozeFor: (routineId: string) => boolean): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => {
        if (!request.identifier.startsWith(SNOOZE_ID_PREFIX)) return true;
        const routineId = (request.content.data as Partial<KatsuNotificationData> | undefined)?.routineId;
        return !routineId || !keepSnoozeFor(routineId);
      })
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

async function runSync(): Promise<number> {
  const [routines, messages] = await Promise.all([getRoutines(), getMessages()]);
  const todayDone = (await getDailyRecords())[toDateKey(new Date())]?.completedIds ?? [];
  await cancelPlanned(
    (routineId) => routines.some((routine) => routine.id === routineId) && !todayDone.includes(routineId),
  );
  if (routines.length === 0 || messages.length === 0) return 0;

  const status = await getNotificationPermission();
  if (status !== 'granted') return 0;

  // ⚠ ここで通信しない。画面側が更新したキャッシュを読むだけ(課金の障害で通知を止めない)
  const isPaid = await isProCached();

  // 記録は1回だけ読む。日ごとに読むと同じキーを7回パースすることになる
  const [records, appState] = await Promise.all([getDailyRecords(), getAppState()]);
  const now = new Date();
  const planned: Notifications.NotificationRequestInput[] = [];

  // 始める日を先にした人(「1月1日から」など。plan §8)には、その日より前に送らない。
  // 予約はその日から数える ── 年末に入れてそのまま開かなくても、1月1日の分が予約されている
  const startDay = parseStartDay(appState.startedOn);
  const firstDay = startDay && startDay.getTime() > now.getTime() ? startDay : now;

  for (let offset = 0; offset < SCHEDULE_DAYS_AHEAD; offset += 1) {
    const day = new Date(firstDay);
    day.setDate(day.getDate() + offset);
    const completedIds = records[toDateKey(day)]?.completedIds ?? [];

    for (const routine of routines) {
      const at = occurrenceAt(day, routine.time);
      if (at.getTime() <= now.getTime()) continue;
      if (completedIds.includes(routine.id)) continue;

      const message = messageFor(messages, routine, isPaid, toDateKey(day));
      if (!message) continue;

      const data: KatsuNotificationData = { routineId: routine.id };
      planned.push({
        content: { title: routine.title, body: message.text, data, categoryIdentifier: ROUTINE_CATEGORY },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  }

  // ⚠ iOS は64件を超えた分を黙って捨てる。溢れるなら**近い日から捨てずに残す**。
  //   MAX_ROUTINES × SCHEDULE_DAYS_AHEAD は現状21件で収まるが、
  //   どちらかを増やしたときに静かに壊れないよう、ここで頭を打っておく。
  const capped = planned.slice(0, IOS_SCHEDULED_LIMIT);
  await Promise.all(capped.map((request) => Notifications.scheduleNotificationAsync(request)));
  return capped.length;
}

/**
 * 予約を丸ごと引き直す。
 *
 * 差分更新はしない。**全消し → 貼り直し**にしてある。
 * 完了・削除・時刻変更・文言変更のすべてが「予約集合が変わる」という同じ形に潰れ、
 * 「消し忘れて終わってるのに鳴る」事故が構造的に起きなくなるため。
 *
 * ⚠ **直列化している。** `cancelAll → 予約` は不可分ではないので、2つ同時に走ると
 *   片方が貼った予約をもう片方の cancelAll が消したり、二重に貼られたりする。
 *   タブ切り替えとチェックが重なると普通に起きる。
 */
let queue: Promise<number> = Promise.resolve(0);

export function syncScheduledNotifications(): Promise<number> {
  queue = queue.then(runSync, runSync);
  return queue;
}
