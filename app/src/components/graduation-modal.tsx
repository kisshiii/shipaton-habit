/**
 * 卒業モーダル。
 *
 * ⚠ ここは祝福でも表彰でもない。**問いを出す場所**。
 *   「もう要らないんじゃないか」と聞くだけで、決めるのはユーザー(spec §2)。
 *   証書・スコア・達成率のような「留まる理由」を足さないこと。
 *
 * 判定で出す場合も、設定から自分で呼ぶ場合も同じものを見せる。
 * 思想としては自主卒業のほうが本体で、アプリが許可を出すのではなく、
 * ユーザーがいつでも降りられる。
 */

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { openManageSubscriptions } from '@/lib/purchases';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function GraduationModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.sheet}>
          <ThemedText type="subtitle">You might not need this anymore.</ThemedText>

          <ThemedText>
            You have been doing this on your own for a while now. That was the point.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            This app was designed for you to quit it. Nobody here is going to tell you whether
            you are ready ── you are the only one who knows that.
          </ThemedText>

          <View style={styles.actions}>
            {/*
              ⚠ 開発者側からサブスクを解約することは技術的にできない。
                できるのは Apple の管理画面へ送ることまで。
                むしろ自動でやるより、自分の手で解約ボタンを押すほうが儀式として強い。
            */}
            <Pressable onPress={openManageSubscriptions} hitSlop={Spacing.two}>
              <ThemedText type="smallBold">End my subscription</ThemedText>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={Spacing.two}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Not yet
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            Either way, nothing here stops working.
          </ThemedText>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.one,
  },
});
