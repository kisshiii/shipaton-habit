/**
 * 卒業判定(spec §2 卒業の扱い)。
 *
 * ⚠ これは「習慣が身についたことの証明」ではない。21日に科学的根拠はない。
 *   役割は**「もう要らないんじゃないか」と問いを出すこと**。
 *   決めるのはユーザーで、アプリは問いを出すだけ。
 *
 * ⚠ 連続記録(streak)を条件にしないこと。
 *   1日落としただけでリセットされる設計は「未完了を失敗として扱わない」と矛盾する。
 *
 * 日数は `src/constants/graduation.ts` の2定数だけで決まる。9月に調整するため、
 * ここに数値を直書きしないこと。
 */

import { GRADUATION_THRESHOLD, GRADUATION_WINDOW } from '@/constants/graduation';
import { recentDateKeys } from '@/lib/date';
import { getAppState, getDailyRecords, getRoutines } from '@/storage';
import type { DailyRecord } from '@/types';

export type GraduationProgress = {
  /** 判定窓のうち「その日を全部完了」した日数 */
  achievedDays: number;
  /** 判定窓の長さ(日) */
  window: number;
  /** 卒業を提案する閾値(日) */
  threshold: number;
  /** 卒業を提案してよいか。モーダル表示済みなら false */
  shouldOffer: boolean;
};

/**
 * その日が「全部完了」か。
 *
 * 分母0は達成扱いにする。これが起きるのは Day 1 で登録時点に時刻が過ぎていた場合で、
 * ルーティン自体は存在する。インストール時刻で不利にしない(spec §2 判定の細部)。
 */
function isAchieved(record: DailyRecord | undefined): boolean {
  // アプリを開かなかった日はレコードが無い。未達成として扱い、遡って作らない
  if (!record) return false;
  if (record.totalCount === 0) return true;
  return record.completedIds.length >= record.totalCount;
}

/**
 * 直近 `GRADUATION_WINDOW` 日を毎日ローリングで見る。
 *
 * 「Day 30 で判定」にしないのは、そこで未達だった人に**「失敗した瞬間」が生まれる**ため。
 * ローリングなら失敗という瞬間がアプリ内に一度も存在せず、Day 45 で条件を満たした人も
 * その日に卒業できる。
 *
 * ⚠ ルーティンが0件のときは判定そのものを実行しない(`null` を返す)。
 *   ルーティンが無い人は「卒業を提案する相手」ではない。
 *   全削除して30日放置した人が卒業できてしまう穴も同時に塞がる。
 */
export async function evaluateGraduation(): Promise<GraduationProgress | null> {
  const [routines, appState, records] = await Promise.all([
    getRoutines(),
    getAppState(),
    getDailyRecords(),
  ]);

  if (routines.length === 0) return null;
  if (!appState.startedOn) return null;

  const achievedDays = recentDateKeys(GRADUATION_WINDOW).filter((dateKey) =>
    isAchieved(records[dateKey]),
  ).length;

  return {
    achievedDays,
    window: GRADUATION_WINDOW,
    threshold: GRADUATION_THRESHOLD,
    // 卒業モーダルは1回だけ。閉じた後もアプリは通常通り使える
    shouldOffer: achievedDays >= GRADUATION_THRESHOLD && !appState.graduatedAt,
  };
}
