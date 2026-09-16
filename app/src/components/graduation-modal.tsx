/**
 * 卒業モーダル。
 *
 * 2つの顔を持つ(spec §2 卒業の扱い):
 *   - **卒業した人**(連続66日): 「もう要らないかもしれない」と問い、卒業証書を渡す
 *   - **まだの人**(`I don't need this anymore` から): やめてかまわないと伝える。
 *     ⚠ **卒業とは呼ばない。証書も出さない。**ただし責めない・引き止めない
 *
 * ⚠ スコア・達成率・連続日数のような「留まる理由」を足さないこと。
 *   証書は留まる理由ではなく、持って出ていくもの。
 *
 * ⚠ **やめることは課金者だけのものではない。**入口は無課金でも常時出す。
 *
 * ⚠ **解約ボタンは購読している人にだけ出すこと。**無課金の人を Apple の
 *   管理画面へ送っても解約するものが無く、意味の分からない行き止まりになる
 *   (実機で発覚 2026-09-07)。
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Certificate, loadCertificate } from '@/components/certificate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GRADUATION_STREAK_DAYS } from '@/constants/graduation';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { isPro, openManageSubscriptions } from '@/lib/purchases';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function GraduationModal({ visible, onClose }: Props) {
  const [isPaid, setIsPaid] = useState(false);
  /** null = 判定中。⚠ 決まる前に文面を出すと、卒業した人に一瞬「まだ」の文が見える */
  const [hasGraduated, setHasGraduated] = useState<boolean | null>(null);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // 取れなければキャッシュで通る。課金の障害でこの画面を止めない
    isPro().then((active) => {
      if (!cancelled) setIsPaid(active);
    });
    loadCertificate().then((details) => {
      if (!cancelled) setHasGraduated(details !== null);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const certificateButton = hasGraduated && (
    <Button
      label={t.graduation.certificate}
      variant="secondary"
      onPress={() => setIsCertificateOpen(true)}
    />
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* ⚠ Modal の中は別のビュー階層。provider が無いと inset が 0 になる */}
      <SafeAreaProvider>
        <View style={styles.backdrop}>
          <ThemedView style={styles.sheet}>
            {hasGraduated === null ? (
              <ActivityIndicator />
            ) : (
              <>
                <ThemedText type="subtitle">
                  {hasGraduated ? t.graduation.title : t.graduation.leaveTitle}
                </ThemedText>

                <ThemedText>
                  {hasGraduated
                    ? t.graduation.body
                    : t.graduation.leaveBody(GRADUATION_STREAK_DAYS)}
                </ThemedText>
                {hasGraduated && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t.graduation.note}
                  </ThemedText>
                )}

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
                      {certificateButton}
                      <Button label={t.graduation.notYet} variant="plain" onPress={onClose} />
                    </>
                  ) : (
                    <>
                      {/*
                        ⚠ 無課金の人に解約を勧めない。止めるものが無い以上、
                          ここで示せるのは「いつ離れてもいい」ということだけ
                      */}
                      <Button label={t.graduation.close} onPress={onClose} />
                      {certificateButton}
                    </>
                  )}
                </View>

                <ThemedText type="small" themeColor="textSecondary">
                  {isPaid ? t.graduation.stillWorks : t.graduation.freeNote}
                </ThemedText>
              </>
            )}
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
