/**
 * 卒業モーダル。
 *
 * ⚠ ここは表彰の場ではない。**問いを出す場所**。
 *   「もう要らないんじゃないか」と聞くだけで、決めるのはユーザー(spec §2)。
 *   スコア・達成率・ランクのような「留まる理由」を足さないこと。
 *
 * ⚠ 卒業証書(spec §3-4)はここから開く。証書は留まる理由ではなく、
 *   **持って出ていくもの**なので、問いと矛盾しない。2026-09-15 に方針変更。
 *
 * 判定で出す場合も、設定から自分で呼ぶ場合も同じものを見せる。
 * 思想としては自主卒業のほうが本体で、アプリが許可を出すのではなく、
 * ユーザーがいつでも降りられる。
 *
 * ⚠ **卒業は課金者だけのものではない。**入口(`I don't need this anymore`)は
 *   無課金でも常時出す(spec §2 自主卒業)。無料で使い続けた人が離れるのも、
 *   このアプリが目指した成功であって、課金者限定にすると
 *   「金を払った人だけが卒業できる」という逆の意味になる。証書も同じく無課金で出す。
 *
 * ⚠ ただし**解約ボタンは購読している人にだけ出すこと。**無課金の人を Apple の
 *   管理画面へ送っても解約するものが無く、意味の分からない行き止まりになる
 *   (実機で発覚 2026-09-07)。
 */

import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Certificate, loadCertificate } from '@/components/certificate';
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
  /** ルーティンが0件の人には証書を出さない。卒業判定と同じ線引き */
  const [hasCertificate, setHasCertificate] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // 取れなければキャッシュで通る。課金の障害でこの画面を止めない
    isPro().then((active) => {
      if (!cancelled) setIsPaid(active);
    });
    loadCertificate().then((details) => {
      if (!cancelled) setHasCertificate(details !== null);
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
                  {/*
                    ⚠ 管理画面から戻ってきたとき、モーダルを開いたままにしないこと。
                      解約を済ませて戻った人に同じ問いを出し続けることになる(実機で発覚 2026-09-13)。
                  */}
                  <Button
                    label={t.graduation.end}
                    onPress={async () => {
                      await openManageSubscriptions();
                      onClose();
                    }}
                  />
                  {hasCertificate && (
                    <Button
                      label={t.graduation.certificate}
                      variant="secondary"
                      onPress={() => setIsCertificateOpen(true)}
                    />
                  )}
                  <Button label={t.graduation.notYet} variant="plain" onPress={onClose} />
                </>
              ) : (
                <>
                  {/*
                    ⚠ 無課金の人に解約を勧めない。止めるものが無い以上、
                      ここで示せるのは「いつ離れてもいい」ということだけ
                  */}
                  <Button label={t.graduation.close} onPress={onClose} />
                  {hasCertificate && (
                    <Button
                      label={t.graduation.certificate}
                      variant="secondary"
                      onPress={() => setIsCertificateOpen(true)}
                    />
                  )}
                </>
              )}
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              {isPaid
                ? t.graduation.stillWorks
                : t.graduation.freeNote}
            </ThemedText>
          </ThemedView>
        </View>

        {/* ⚠ 閉じたらこのモーダルに戻る。証書を見ただけで問いへの答えを決めたことにしない */}
        <Certificate visible={isCertificateOpen} onClose={() => setIsCertificateOpen(false)} />
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
