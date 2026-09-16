/**
 * 時刻表の1行。Today と Routines で同じ形に見せる。
 *
 * ⚠ 箱で囲まない。罫線で区切る。ルーティンは「毎日同じ時刻にやること」なので、
 *   時刻の列が縦に揃って見えることが一番の情報(2026-09-16 デザイン方針)。
 * ⚠ 時刻を先に出す。仕様の書き方も `06:30 起きる` の順(spec §2 何を登録するのか)。
 * ⚠ 行そのものが押せる範囲。高さを削らないこと。
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = Pick<
  PressableProps,
  'accessibilityRole' | 'accessibilityState' | 'accessibilityLabel' | 'accessibilityHint'
> & {
  time: string;
  title: string;
  /** 済んだ行。色を落とすだけで、取り消し線や赤は使わない */
  dimmed?: boolean;
  /** 通知から開かれた行 */
  focused?: boolean;
  trailing: ReactNode;
  onPress: () => void;
};

export function TimetableRow({ time, title, dimmed, focused, trailing, onPress, ...a11y }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      {...a11y}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.line },
        focused && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="time" themeColor={dimmed ? 'textSecondary' : 'accent'} style={styles.time}>
        {time}
      </ThemedText>
      <View style={styles.body}>
        <ThemedText numberOfLines={2} themeColor={dimmed ? 'textSecondary' : 'text'}>
          {title}
        </ThemedText>
      </View>
      {trailing}
    </Pressable>
  );
}

/** 一覧の上端の罫線。行は下端にしか線を持たないので、先頭だけここで引く */
export function TimetableList({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.list, { borderTopColor: theme.line }]}>{children}</View>;
}

const styles = StyleSheet.create({
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 64,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  time: {
    width: 56,
  },
  body: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
