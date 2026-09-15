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
 * 今日を末尾とする直近 `days` 日分の日付キー(古い順)。
 * 卒業判定のローリング窓に使う。
 */
export function recentDateKeys(days: number, endingOn: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    const day = new Date(endingOn);
    day.setDate(day.getDate() - back);
    keys.push(toDateKey(day));
  }
  return keys;
}

/**
 * 日付キーを読める形にする。`2026-09-07` -> `Monday, 7 September`。
 *
 * ⚠ 保存キーをそのまま画面に出さないこと。開発中の画面に見える。
 * ⚠ 年を出さない。今日のことしか扱わない画面に西暦は要らない。
 */
export function formatDateKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * 日付キーを年まで含めて読める形にする。`2026-09-15` -> `2026年9月15日` / `September 15, 2026`。
 * 卒業証書のように、後から見返す・人に見せるものに使う。
 */
export function formatFullDateKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 2つの日付キーの間の日数。両端を含む(同じ日なら 1)。
 * ⚠ UTC で数える。ローカル時刻で引くと夏時間の切り替え日に1時間ずれて日数が狂う
 */
export function countDaysInclusive(fromKey: string, toKey: string): number {
  const toUtc = (key: string) => {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / 86_400_000) + 1;
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
