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
 *
 * ⚠ **卒業は課金者だけのものではない。**入口(`I don't need this anymore`)は
 *   無課金でも常時出す(spec §2 自主卒業)。無料で使い続けた人が離れるのも、
 *   このアプリが目指した成功であって、課金者限定にすると
 *   「金を払った人だけが卒業できる」という逆の意味になる。
 *
 * ⚠ ただし**解約ボタンは購読している人にだけ出すこと。**無課金の人を Apple の
 *   管理画面へ送っても解約するものが無く、意味の分からない行き止まりになる
 *   (実機で発覚 2026-09-07)。
 */

import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { isPro, openManageSubscriptions } from '@/lib/purchases';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function GraduationModal({ visible, onClose }: Props) {
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // 取れなければキャッシュで通る。課金の障害でこの画面を止めない
    isPro().then((active) => {
      if (!cancelled) setIsPaid(active);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* ⚠ Modal の中は別のビュー階層。provider が無いと inset が 0 になる */}
      <SafeAreaProvider>
        <View style={styles.backdrop}>
          <ThemedView style={styles.sheet}>
            <ThemedText type="subtitle">{t.graduation.title}</ThemedText>

            <ThemedText>
              {t.graduation.body}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t.graduation.note}
            </ThemedText>

            <View style={styles.actions}>
              {isPaid ? (
                <>
                  {/*
                    ⚠ 開発者側からサブスクを解約することは技術的にできない。
                      できるのは Apple の管理画面へ送ることまで。
                      むしろ自動でやるより、自分の手で解約ボタンを押すほうが儀式として強い。
                  */}
                  <Button label={t.graduation.end} onPress={openManageSubscriptions} />
                  <Button label={t.graduation.notYet} variant="plain" onPress={onClose} />
                </>
              ) : (
                // ⚠ 無課金の人に解約を勧めない。止めるものが無い以上、
                //   ここで示せるのは「いつ離れてもいい」ということだけ
                <Button label={t.graduation.close} onPress={onClose} />
              )}
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              {isPaid
                ? t.graduation.stillWorks
                : t.graduation.freeNote}
            </ThemedText>
          </ThemedView>
        </View>
      </SafeAreaProvider>
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
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
});
