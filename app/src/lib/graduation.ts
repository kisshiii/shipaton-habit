/**
 * 卒業判定(spec §2 卒業の扱い / plan §1)。
 *
 * 卒業 = その日のルーティンを全部やり切った日を `GRADUATION_STREAK_DAYS` 日数えたこと。
 * やり切れなかった日は自動で「休み」。休みは直近 `REST_WINDOW_DAYS` 日で `MAX_REST_DAYS` 回まで
 * 使え、その回数を超えたら数え直す。休みの日は66日に入らない。
 * ルーティンの追加・削除・名前の変更でも数え直す(その日が新しい起点)。
 *
 * ⚠ 数え直しを「失敗」「リセット」として画面に出さないこと(CLAUDE.md)。
 * ⚠ 今日はまだ終わっていない。やり切っていなくても休みにしない。
 * ⚠ 一度卒業したら、その後何があっても取り消さない。卒業日は記録から毎回同じ日が出るので保存しない。
 *
 * 日数は `src/constants/graduation.ts` の定数だけで決まる。ここに数値を直書きしないこと。
 */

import { GRADUATION_STREAK_DAYS, MAX_REST_DAYS, REST_WINDOW_DAYS } from '@/constants/graduation';
import { dateKeysBetween, todayKey } from '@/lib/date';
import { getAppState, getDailyRecords, getRoutines } from '@/storage';
import type { DailyRecord } from '@/types';

export type GraduationProgress = {
  /** 今の起点からやり切った日の数(今日をやり切っていれば今日も含む) */
  doneDays: number;
  /** 今の起点以降で、今日を含む直近 `REST_WINDOW_DAYS` 日の休みの回数。今日は休みに数えない */
  restsInWindow: number;
  /** 休まずに続いている日数。休むか、ルーティンを変えると0に戻る。卒業には影響しない */
  unbrokenDays: number;
  /** 今の数え始めの日。Day 1、休みでの数え直しの翌日、ルーティンを変えた日のどれか */
  countStartedOn: string;
  /**
   * 最後の数え直しが休みによるものなら、その休みの日。お知らせを1回だけ出すのに使う。
   * その後にルーティンを変えていれば null(本人が分かってやったことなので、お知らせは要らない)
   */
  restRestartOn: string | null;
  /** 初めて `GRADUATION_STREAK_DAYS` 日に達した日。まだなら null */
  graduatedOn: string | null;
};

export type GraduationStatus = {
  progress: GraduationProgress;
  /** 初めて卒業の日数に達した日。まだなら null */
  graduatedOn: string | null;
  /** 卒業モーダルを出してよいか。表示済みなら false */
  shouldOffer: boolean;
};

/**
 * その日が「全部やり切った日」か。
 *
 * 分母0には2通りあり、扱いが逆になる(spec §2 判定の細部):
 *   - **Day 1(またはルーティンを変えた日)で、その時点で時刻が過ぎていた** → やり切った日。
 *     ルーティンは存在し、分母から外した項目が `excludedIds` に残っている。登録した時刻で不利にしない
 *   - **ルーティンが1件も無かった日**(全部消した) → 休み。やることが無い日を
 *     「やり切った日」に数えると、全部消してアプリを開くだけで日数が伸びてしまう
 */
function isAchieved(record: DailyRecord | undefined): boolean {
  // アプリを開かなかった日はレコードが無い。休みとして扱い、遡って作らない
  if (!record) return false;
  if (record.totalCount === 0) return (record.excludedIds?.length ?? 0) > 0;
  return record.completedIds.length >= record.totalCount;
}

/**
 * Day 1 から今日までを1日ずつ見て、今の進み具合と卒業日を返す。
 *
 * @param changedOn ルーティンを変えた日(追加・削除・名前の変更)。その日が新しい起点になる。
 *   全部渡すこと。最後の1つだけだと、卒業した後の変更で卒業日が消える
 */
export function computeProgress(
  records: Record<string, DailyRecord>,
  startedOn: string,
  changedOn: readonly string[] = [],
  today: string = todayKey(),
): GraduationProgress {
  const changes = new Set(changedOn);
  let doneDays = 0;
  let unbrokenDays = 0;
  let countStartedOn = startedOn;
  let restRestartOn: string | null = null;
  let graduatedOn: string | null = null;
  /** 今の起点以降の休み。1日ずつ進むので、日付ではなく何日目かで持つ */
  let rests: number[] = [];

  const days = dateKeysBetween(startedOn, today);
  days.forEach((dateKey, index) => {
    if (changes.has(dateKey)) {
      doneDays = 0;
      unbrokenDays = 0;
      rests = [];
      countStartedOn = dateKey;
      restRestartOn = null;
    }

    if (isAchieved(records[dateKey])) {
      doneDays += 1;
      unbrokenDays += 1;
      if (graduatedOn === null && doneDays >= GRADUATION_STREAK_DAYS) graduatedOn = dateKey;
      return;
    }
    if (dateKey === today) return;

    unbrokenDays = 0;
    rests = [...rests.filter((day) => index - day < REST_WINDOW_DAYS), index];
    if (rests.length > MAX_REST_DAYS) {
      // 数え直す。この休みも含めて、ここまでの休みは次の期間に持ち越さない
      doneDays = 0;
      rests = [];
      restRestartOn = dateKey;
      countStartedOn = days[index + 1] ?? today;
    }
  });

  const todayIndex = days.length - 1;
  return {
    doneDays,
    restsInWindow: rests.filter((day) => todayIndex - day < REST_WINDOW_DAYS).length,
    unbrokenDays,
    countStartedOn,
    restRestartOn,
    graduatedOn,
  };
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

  const progress = computeProgress(records, appState.startedOn, appState.routineChangedOn);
  return {
    progress,
    graduatedOn: progress.graduatedOn,
    // 卒業モーダルは1回だけ。閉じた後もアプリは通常通り使える
    shouldOffer: progress.graduatedOn !== null && !appState.graduatedAt,
  };
}
