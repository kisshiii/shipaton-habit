/**
 * チェックしたときの手応え(1.0.3、plan §10)。
 *
 * 毎日必ずする唯一の操作なので、ここを気持ちよくする。
 * ⚠ **毎回必ず鳴らす。**ランダムにしない・たまにだけ大きくしない(賭け事の仕組みにしない)。
 * ⚠ チェックを外したときは鳴らさない側(`playUncheck`)。取り消しを演出しない。
 * ⚠ 失敗しても画面を止めない。振動は足しの手応えにすぎない。
 */

import * as Haptics from 'expo-haptics';

import KatsuHaptics from '../../modules/katsu-haptics';

/** 自作の部品で鳴らす。鳴らせなければ false(古いビルド・鳴らせない端末) */
function playNative(name: 'check' | 'allDone'): boolean {
  try {
    return KatsuHaptics?.play(name) ?? false;
  } catch {
    return false;
  }
}

/** 1件チェックした。「トン」 */
export function playCheck(): void {
  if (playNative('check')) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** 今日の分を全部やり切った。連打がだんだん強くなって「ドン」 */
export function playAllDone(): void {
  if (playNative('allDone')) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** チェックを外した。最小限にとどめる */
export function playUncheck(): void {
  Haptics.selectionAsync().catch(() => {});
}
