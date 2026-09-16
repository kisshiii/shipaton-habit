/**
 * ボタン。
 *
 * ⚠ **操作を裸の文字で置かないこと。** `Save` や `Next` を `Text` のまま並べると、
 *   押せるものだと分からず、画面が作りかけに見える。1.0 の画面は3つしかないので、
 *   その3つで押せるものは必ずこれを通す。
 *
 * ⚠ タップ領域は最低 44pt。Apple の指針であり、実際に押しにくいのは指の問題ではなく
 *   当たり判定の問題であることが多い。
 *
 * 種類は3つだけに絞る。増やすと画面ごとに強さがばらつく。
 *   primary   … その画面で進む操作。1画面に1つ
 *   secondary … 並列の操作。枠線だけ
 *   plain     … 取り消し・後回し。目立たせない
 *
 * `tone="ceremony"` は紺の画面(オンボーディングの入口・卒業)用。
 * ⚠ テーマに従わず、紺の上で生成りを使う。普段の画面では使わない。
 */

import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Ceremony, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'plain';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** 通信待ちなど。押せない状態にしてスピナーを出す */
  busy?: boolean;
  tone?: 'default' | 'ceremony';
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  tone = 'default',
  style,
}: Props) {
  const theme = useTheme();
  const isOff = disabled || busy;

  const palette =
    tone === 'ceremony'
      ? { fill: Ceremony.cream, onFill: Ceremony.navy, line: Ceremony.creamSoft, text: Ceremony.cream }
      : { fill: theme.accent, onFill: theme.accentText, line: theme.accent, text: theme.accent };
  const labelColor =
    variant === 'primary'
      ? palette.onFill
      : tone === 'ceremony' && variant === 'plain'
        ? Ceremony.creamSoft
        : palette.text;

  const surface: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: palette.fill }
      : variant === 'secondary'
        ? { borderColor: palette.line, borderWidth: 1 }
        : {};

  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityLabel={label}
      // ⚠ 押せない理由を伝える。無反応との区別がつかないのは画面上と同じ問題
      accessibilityState={{ disabled: isOff, busy }}
      style={({ pressed }) => [
        styles.base,
        variant === 'plain' && styles.plain,
        surface,
        // ⚠ 押した手応えを残す。何も変わらないと二度押しされる
        pressed && styles.pressed,
        isOff && styles.off,
        style,
      ]}>
      <View style={styles.inner}>
        {busy && (
          <ActivityIndicator
            size="small"
            color={labelColor}
          />
        )}
        <ThemedText type="smallBold" style={[styles.label, { color: labelColor }]}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.control,
  },
  plain: {
    minHeight: 44,
    paddingHorizontal: Spacing.two,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  off: {
    opacity: 0.4,
  },
});
