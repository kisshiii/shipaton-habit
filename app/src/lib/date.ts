/**
 * 日付・時刻のユーティリティ。すべて端末のローカル時刻で扱う。
 * 日付境界は深夜0時(spec §2 完了判定)。
 */

/** Date -> "2026-08-14" (ローカル日付) */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 今日の日付キー */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** Date -> "07:00" (ローカル時刻) */
export function toTimeKey(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * `fromKey` から `toKey` までの日付キー(両端を含む、古い順)。
 * 卒業判定で Day 1 から今日までを1日ずつ見るのに使う。
 * ⚠ 日付はローカルの暦で進める。ミリ秒を足すと夏時間の切り替え日に1日ずれる
 */
export function dateKeysBetween(fromKey: string, toKey: string): string[] {
  const [year, month, day] = fromKey.split('-').map(Number);
  if (!year || !month || !day) return [];
  const cursor = new Date(year, month - 1, day);
  const keys: string[] = [];
  for (let key = toDateKey(cursor); key <= toKey; key = toDateKey(cursor)) {
    keys.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function fromKey(key: string): Date | null {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/**
 * Today の見出し。`2026-09-16` -> `9月16日` / `September 16`。
 *
 * ⚠ 保存キーをそのまま画面に出さないこと。開発中の画面に見える。
 * ⚠ 年を出さない。今日のことしか扱わない画面に西暦は要らない。
 */
export function formatMonthDay(key: string): string {
  return fromKey(key)?.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) ?? key;
}

/** `2026-09-16` -> `水曜日` / `Wednesday` */
export function formatWeekday(key: string): string {
  return fromKey(key)?.toLocaleDateString(undefined, { weekday: 'long' }) ?? '';
}

/**
 * 日付キーを年まで含めて読める形にする。`2026-09-15` -> `2026年9月15日` / `September 15, 2026`。
 * 卒業証書のように、後から見返す・人に見せるものに使う。
 */
export function formatFullDateKey(key: string): string {
  return (
    fromKey(key)?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) ??
    key
  );
}

/** "7:5" のような入力を "07:05" に正規化する。不正な値は null */
export function normalizeTime(input: string): string | null {
  const match = input.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
