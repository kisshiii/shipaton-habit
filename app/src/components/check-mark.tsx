/**
 * Today のチェック。
 *
 * ⚠ 未完了を**空の丸**で出すこと。× や赤や「未達成」の語を使わない。
 *   まだ押していないだけの状態を、失敗として見せない(UX禁止事項)。
 *
 * ⚠ 記号は SF Symbol を使う。`[x]` / `[ ]` のような文字で組むと、
 *   等幅フォントが混ざって仮組みに見える。
 *
 * 付いた瞬間だけ、丸が小さく弾む。押した手応えを残すため(2026-09-16 デザイン方針)。
 * ⚠ 外したときは動かさない。取り消しを演出しない。
 */

import { SymbolView } from 'expo-symbols';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 28;

export function CheckMark({ isChecked }: { isChecked: boolean }) {
  const theme = useTheme();

  return (
    <Animated.View
      // key を変えて付いたときだけ入場アニメーションを走らせる
      key={isChecked ? 'on' : 'off'}
      entering={isChecked ? ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.System) : undefined}
      // ⚠ 行そのものが読み上げラベルを持つ。記号を個別に読ませると二重になる
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <SymbolView
        name={isChecked ? 'checkmark.circle.fill' : 'circle'}
        size={SIZE}
        tintColor={isChecked ? theme.accent : theme.textSecondary}
        // iOS 以外ではシンボルが出ないため、形だけでも残す
        fallback={
          <ThemedText themeColor={isChecked ? 'accent' : 'textSecondary'}>
            {isChecked ? '●' : '○'}
          </ThemedText>
        }
      />
    </Animated.View>
  );
}
