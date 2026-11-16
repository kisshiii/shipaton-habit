/**
 * どの日に、どのルーティンへ、どの言葉を出すかを決める。
 *
 * 通知(`notifications.ts`)と、通知を切っている人の Today(`app/index.tsx`)の両方がここを使う。
 * ⚠ **両方で同じ選び方をすること。**Today だけ先頭の言葉に固定していたため、
 *   通知を切っている人には日替わりが届いていなかった(1.0.3 までの不具合。1.0.4 で直した)。
 *
 * React Native や Expo の部品を読み込まない(`scripts/test-messages.js` から直接テストする)。
 */

import { FREE_MESSAGE_LIMIT } from '@/constants/messages';
import type { KatsuMessage, RoutineItem } from '@/types';

/**
 * そのルーティンに使う文言を選ぶ。
 *
 * 項目ごとの出し分けは有料(課金機会③)。
 * ⚠ **無料のときは先頭 `FREE_MESSAGE_LIMIT` 件を、全ルーティン共通で日替わりに使う**(2026-11-10。plan §10)。
 *   画面側はそれより後ろを「ロック中」と表示して触らせないのに、
 *   通知だけがそれを鳴らしていると、ロックが嘘になり ②③ が課金機会として成立しない。
 *   ロック済みの言葉は**消さない**(spec §2)。使わないだけで、再課金すれば戻る。
 */
export function messageFor(
  messages: KatsuMessage[],
  routine: RoutineItem,
  isPaid: boolean,
  dayKey: string,
): KatsuMessage | undefined {
  // ⚠ 無料のときは**割り当てを見ない。**先頭3つを全ルーティンで日替わりにする(2026-11-16、本人判断。spec §2)。
  //   1.0.3 までは割り当ての無いものだけを回していたため、有料のときにルーティンへ割り当てた言葉は、
  //   無料に戻ると先頭3つに入っていてもどこにも届かなかった。画面ではロック表示にもならず、
  //   卒業の画面の「3つ目までの言葉も届き続けます」とも食い違っていた。
  if (!isPaid) {
    const unlocked = messages.slice(0, FREE_MESSAGE_LIMIT);
    if (unlocked.length === 0) return undefined;
    return unlocked[pickIndex(`${dayKey}:${routine.id}`, unlocked.length)];
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
export function pickIndex(seed: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % count;
}

/** "07:30" → 450。読めなければ null */
function minutesOf(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * 通知を切っている人の Today に出す言葉(spec §4 通知実装の制約-1)。
 *
 * 通知が鳴るはずだったルーティンを選び、通知と同じ `messageFor` で言葉を決める。
 *   1. 時刻を過ぎて、まだチェックしていないもののうち一番早いもの(通知が届いているはずのもの)
 *   2. 無ければ、まだチェックしていないもののうち一番早いもの
 *   3. 全部済んでいれば、一番早いもの
 * 言葉が無ければ undefined(アプリ側の定型文で埋めない)。
 */
export function todayWordFor(
  messages: KatsuMessage[],
  routines: RoutineItem[],
  completedIds: string[],
  isPaid: boolean,
  dayKey: string,
  now: Date,
): KatsuMessage | undefined {
  if (messages.length === 0 || routines.length === 0) return undefined;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const sorted = [...routines].sort(
    (a, b) => (minutesOf(a.time) ?? 0) - (minutesOf(b.time) ?? 0),
  );
  const open = sorted.filter((routine) => !completedIds.includes(routine.id));
  const overdue = open.find((routine) => (minutesOf(routine.time) ?? 0) <= nowMinutes);
  const target = overdue ?? open[0] ?? sorted[0];
  return messageFor(messages, target, isPaid, dayKey);
}
