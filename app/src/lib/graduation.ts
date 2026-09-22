/**
 * 卒業判定(spec §2 卒業の扱い)。
 *
 * 卒業 = その日のルーティンを全部やり切った日が `GRADUATION_STREAK_DAYS` 日続いたこと。
 * 66日は習慣化研究の中央値(spec §8-2)。
 *
 * ⚠ 途切れた日を「失敗」として画面に出さないこと。連続日数のカウンターも出さない
 *   (CLAUDE.md: 連続記録で煽らない)。途切れたら黙って数え直すだけ。
 * ⚠ 今日はまだ終わっていない。やり切っていなくても途切れた扱いにしない。
 * ⚠ 一度卒業したら、その後途切れても取り消さない。卒業日は記録から毎回同じ日が出るので保存しない。
 *
 * 日数は `src/constants/graduation.ts` の定数だけで決まる。ここに数値を直書きしないこと。
 */

import { GRADUATION_STREAK_DAYS } from '@/constants/graduation';
import { dateKeysBetween, todayKey } from '@/lib/date';
import { getAppState, getDailyRecords, getRoutines } from '@/storage';
import type { DailyRecord } from '@/types';

export type GraduationStatus = {
  /** 初めて連続日数に達した日。まだなら null */
  graduatedOn: string | null;
  /** 卒業モーダルを出してよいか。表示済みなら false */
  shouldOffer: boolean;
};

/**
 * その日が「全部完了」か。
 *
 * 分母0には2通りあり、扱いが逆になる(spec §2 判定の細部):
 *   - **Day 1 で登録時点に時刻が過ぎていた** → 達成扱い。ルーティンは存在し、
 *     分母から外した項目が `excludedIds` に残っている。インストール時刻で不利にしない
 *   - **ルーティンが1件も無かった日**(全部消した) → 未達成。やることが無い日を
 *     「やり切った日」に数えると、全部消してアプリを開くだけで連続日数が伸びてしまう
 */
function isAchieved(record: DailyRecord | undefined): boolean {
  // アプリを開かなかった日はレコードが無い。未達成として扱い、遡って作らない
  if (!record) return false;
  if (record.totalCount === 0) return (record.excludedIds?.length ?? 0) > 0;
  return record.completedIds.length >= record.totalCount;
}

/**
 * Day 1 から今日までを1日ずつ見て、初めて連続日数に達した日を返す。
 */
export function findGraduationDate(
  records: Record<string, DailyRecord>,
  startedOn: string,
  today: string = todayKey(),
): string | null {
  let streak = 0;
  for (const dateKey of dateKeysBetween(startedOn, today)) {
    if (isAchieved(records[dateKey])) {
      streak += 1;
      if (streak >= GRADUATION_STREAK_DAYS) return dateKey;
    } else if (dateKey !== today) {
      streak = 0;
    }
  }
  return null;
}

/**
 * ⚠ ルーティンが0件のときは判定そのものを実行しない(`null` を返す)。
 *   ルーティンが無い人は「卒業を提案する相手」ではない。
 */
export async function evaluateGraduation(): Promise<GraduationStatus | null> {
  const [routines, appState, records] = await Promise.all([
    getRoutines(),
    getAppState(),
    getDailyRecords(),
  ]);

  if (routines.length === 0) return null;
  if (!appState.startedOn) return null;

  const graduatedOn = findGraduationDate(records, appState.startedOn);
  return {
    graduatedOn,
    // 卒業モーダルは1回だけ。閉じた後もアプリは通常通り使える
    shouldOffer: graduatedOn !== null && !appState.graduatedAt,
  };
}
