/**
 * App Store の評価を頼む(plan §7-3)。
 *
 * ⚠ **一生に1回だけ。**7日の節目を閉じた直後(本人が手応えを感じた瞬間)にだけ呼ぶ。
 *   卒業画面では頼まない ── 出ていく人に頼みごとをしない。
 * ⚠ iOS 標準のダイアログを使う。実際に出すかどうか・何回出すかは iOS が決める
 *   (同じアプリは1年に3回まで)。こちらで「星5を」と誘導する画面は作らない。
 */

import * as StoreReview from 'expo-store-review';

import { getAppState, markReviewRequested } from '@/storage';

/** 節目の画面が閉じきってから出す。重なると iOS が出さないことがある */
const DELAY_MS = 800;

export async function requestReviewOnce(): Promise<void> {
  if ((await getAppState()).reviewRequestedAt) return;
  if (!(await StoreReview.isAvailableAsync())) return;
  // 先に記録する。ダイアログが出なくても、もう頼まない
  await markReviewRequested();
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  await StoreReview.requestReview().catch(() => {});
}
