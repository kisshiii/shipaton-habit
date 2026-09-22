/**
 * 何もないとき・案内を出すときの共通の形。記号 + 見出し + 一行 + (あれば)ボタン。
 *
 * ⚠ 灰色の箱はここ(案内)だけに使う。一覧や入力を箱で囲まない。
 *   箱に「ここは案内」という意味を持たせる(2026-09-16 デザイン方針)。
 */

import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  symbol: ComponentProps<typeof SymbolView>['name'];
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ symbol, title, body, action }: Props) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.box}>
      <View style={styles.head}>
        <SymbolView
          name={symbol}
          size={20}
          tintColor={theme.accent}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <ThemedText type="smallBold" style={styles.title}>
          {title}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {body}
      </ThemedText>
      {action}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
});
