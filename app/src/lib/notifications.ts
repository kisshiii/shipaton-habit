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

import { SCHEDULE_DAYS_AHEAD } from '@/constants/notifications';
import { toDateKey } from '@/lib/date';
import { getDailyRecord, getMessages, getRoutines } from '@/storage';
import type { KatsuMessage, RoutineItem } from '@/types';

/** 通知に載せるデータ。**ユーザーの本文をここに入れないこと** */
export type KatsuNotificationData = {
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
 * 項目ごとの出し分けは有料。無料は routineId を持たない1件を全ルーティンで共有する
 * (spec §2 無料版の通知文言)。
 */
function messageFor(messages: KatsuMessage[], routine: RoutineItem): KatsuMessage | undefined {
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

/**
 * 予約を丸ごと引き直す。
 *
 * 差分更新はしない。**全消し → 貼り直し**にしてある。
 * 完了・削除・時刻変更・文言変更のすべてが「予約集合が変わる」という同じ形に潰れ、
 * 「消し忘れて終わってるのに鳴る」事故が構造的に起きなくなるため。
 *
 * 次のものは予約しない:
 * - 既に過ぎた時刻(今日の分)
 * - 今日すでに完了した項目
 * - 文言が1件も無いとき(1件も予約しない)
 */
export async function syncScheduledNotifications(): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [routines, messages] = await Promise.all([getRoutines(), getMessages()]);
  if (routines.length === 0 || messages.length === 0) return 0;

  const status = await getNotificationPermission();
  if (status !== 'granted') return 0;

  const now = new Date();
  let scheduled = 0;

  for (let offset = 0; offset < SCHEDULE_DAYS_AHEAD; offset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const dateKey = toDateKey(day);
    const record = await getDailyRecord(dateKey);
    const completedIds = record?.completedIds ?? [];

    for (const routine of routines) {
      const at = occurrenceAt(day, routine.time);
      if (at.getTime() <= now.getTime()) continue;
      if (completedIds.includes(routine.id)) continue;

      const message = messageFor(messages, routine);
      if (!message) continue;

      const data: KatsuNotificationData = { routineId: routine.id };
      await Notifications.scheduleNotificationAsync({
        content: {
          title: routine.title,
          body: message.text,
          data,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
      scheduled += 1;
    }
  }
  return scheduled;
}

/** すべての予約を取り消す(通知を切ったとき、卒業したときなど) */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
