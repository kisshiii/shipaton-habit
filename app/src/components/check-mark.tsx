/**
 * Today のチェック。
 *
 * ⚠ 未完了を**空の丸**で出すこと。× や赤や「未達成」の語を使わない。
 *   まだ押していないだけの状態を、失敗として見せない(UX禁止事項)。
 *
 * ⚠ 記号は SF Symbol を使う。`[x]` / `[ ]` のような文字で組むと、
 *   等幅フォントが混ざって仮組みに見える。
 */

import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 26;

export function CheckMark({ isChecked }: { isChecked: boolean }) {
  const theme = useTheme();

  return (
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
  );
}
