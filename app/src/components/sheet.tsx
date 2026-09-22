/**
 * 下から出るシート。ルーティンの編集と、言葉を書く画面で使う。
 *
 * ⚠ 入力欄を一覧の下に常に出しておかないこと。一覧が静かにならない(2026-09-16 デザイン方針)。
 * ⚠ 閉じ方を2つ用意する。背景を押す / 呼び出し側の「やめる」。
 * ⚠ `Modal` の中には専用の `SafeAreaProvider` が要る(paywall.tsx と同じ理由)。
 */

import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Sheet({ visible, onClose, title, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <Body onClose={onClose} title={title}>
          {children}
        </Body>
      </SafeAreaProvider>
    </Modal>
  );
}

function Body({ onClose, title, children }: Omit<Props, 'visible'>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.backdrop}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Close" />
      <ThemedView style={styles.sheet}>
        <View style={[styles.grabber, { backgroundColor: theme.backgroundSelected }]} />
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.content, { paddingBottom: Spacing.four + insets.bottom }]}>
          <ThemedText type="smallBold">{title}</ThemedText>
          {children}
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(10, 12, 20, 0.45)',
  },
  dismissArea: {
    flex: 1,
    minHeight: Spacing.six,
  },
  sheet: {
    flexShrink: 1,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Spacing.two,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
});
