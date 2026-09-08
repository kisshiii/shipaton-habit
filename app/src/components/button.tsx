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
 */

import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'plain';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** 通信待ちなど。押せない状態にしてスピナーを出す */
  busy?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
}: Props) {
  const theme = useTheme();
  const isOff = disabled || busy;

  const surface: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: theme.accent }
      : variant === 'secondary'
        ? { borderColor: theme.accent, borderWidth: 1 }
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
            color={variant === 'primary' ? theme.accentText : theme.accent}
          />
        )}
        <ThemedText
          type="smallBold"
          themeColor={variant === 'primary' ? 'accentText' : 'accent'}
          style={styles.label}>
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
    borderRadius: Spacing.two,
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
