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

import { IOS_SCHEDULED_LIMIT, SCHEDULE_DAYS_AHEAD } from '@/constants/notifications';
import { toDateKey } from '@/lib/date';
import { isProCached } from '@/lib/purchases';
import { getDailyRecords, getMessages, getRoutines } from '@/storage';
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
): KatsuMessage | undefined {
  if (!isPaid) return messages[0];
  return (
    messages.find((message) => message.routineId === routine.id) ??
    messages.find((message) => message.routineId === undefined)
  );
}

/** その日のその時刻を表す Date を作る */
function occurrenceAt(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const at = new Date(day);
  at.setHours(hours, minutes, 0, 0);
  return at;
}

async function runSync(): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [routines, messages] = await Promise.all([getRoutines(), getMessages()]);
  if (routines.length === 0 || messages.length === 0) return 0;

  const status = await getNotificationPermission();
  if (status !== 'granted') return 0;

  // ⚠ ここで通信しない。画面側が更新したキャッシュを読むだけ(課金の障害で通知を止めない)
  const isPaid = await isProCached();

  // 記録は1回だけ読む。日ごとに読むと同じキーを7回パースすることになる
  const records = await getDailyRecords();
  const now = new Date();
  const planned: Notifications.NotificationRequestInput[] = [];

  for (let offset = 0; offset < SCHEDULE_DAYS_AHEAD; offset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const completedIds = records[toDateKey(day)]?.completedIds ?? [];

    for (const routine of routines) {
      const at = occurrenceAt(day, routine.time);
      if (at.getTime() <= now.getTime()) continue;
      if (completedIds.includes(routine.id)) continue;

      const message = messageFor(messages, routine, isPaid);
      if (!message) continue;

      const data: KatsuNotificationData = { routineId: routine.id };
      planned.push({
        content: { title: routine.title, body: message.text, data },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  }

  // ⚠ iOS は64件を超えた分を黙って捨てる。溢れるなら**近い日から捨てずに残す**。
  //   MAX_ROUTINES × SCHEDULE_DAYS_AHEAD は現状56件で収まるが、
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
