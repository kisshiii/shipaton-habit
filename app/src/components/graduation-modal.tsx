/**
 * 卒業モーダル。
 *
 * 卒業した人にだけ出す(spec §2 卒業の扱い):
 *   - **卒業した人**(やり切った日が66日): 紺一色の画面。証書をこの画面にそのまま置き、
 *     購読している人には「習慣になったなら、もう課金は要らない」と伝え、解約の画面への道を置く
 *     (2026-11-03 に文言を書き直し。「もう要らないかもしれない」では何を聞かれているか分からなかった)。
 *     受け取るを押すと画像になって共有シートが開く
 *   - **まだの人**には出さない(2026-11-10。「I don't need this anymore」のボタンと、やめる人向けのシートはやめた。
 *     無課金で66日前の人には、押しても説明と「閉じる」しか無かった。plan §10)。
 *     解約は Routines 画面の「サブスクを解約する」から直接 Apple の画面へ
 *
 * ⚠ 紺の画面は節目だけのもの(オンボーディングの入口・節目のお祝い・卒業)。
 *   66日前にやめる人には出さない。節目の色を安売りしない(2026-09-16 デザイン方針)。
 * ⚠ スコア・達成率・連続日数のような「留まる理由」を足さないこと。
 *   証書は留まる理由ではなく、持って出ていくもの。
 * ⚠ **やめることは課金者だけのものではない。**入口は無課金でも常時出す。
 * ⚠ **解約ボタンは購読している人にだけ出すこと。**無課金の人を Apple の
 *   管理画面へ送っても解約するものが無く、意味の分からない行き止まりになる
 *   (実機で発覚 2026-09-07)。
 */

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import {
  CertificateCard,
  loadCertificate,
  shareCertificate,
  type CertificateDetails,
} from '@/components/certificate';
import { Ceremony, Fonts, Radius, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { isPro, openManageSubscriptions } from '@/lib/purchases';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function GraduationModal({ visible, onClose }: Props) {
  const [isPaid, setIsPaid] = useState(false);
  /**
   * undefined = 判定中 / null = まだ卒業していない。
   * ⚠ 決まる前に文面を出すと、卒業した人に一瞬「まだ」の文が見える
   */
  const [details, setDetails] = useState<CertificateDetails | null | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // 取れなければキャッシュで通る。課金の障害でこの画面を止めない
    isPro().then((active) => {
      if (!cancelled) setIsPaid(active);
    });
    loadCertificate().then((next) => {
      if (cancelled) return;
      setDetails(next);
      // まだ卒業していない人には出すものが無い。見えない画面を開いたままにしない
      if (next === null) onClose();
    });
    return () => {
      cancelled = true;
    };
    // onClose は親が描くたびに作り直される。依存に入れると、開いている間ずっと読み直すことになる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /**
   * ⚠ 管理画面から戻ってきたとき、モーダルを開いたままにしないこと。
   *   解約を済ませて戻った人に同じ問いを出し続けることになる(実機で発覚 2026-09-13)。
   * ⚠ 開発者側からサブスクを解約することは技術的にできない。できるのは Apple の
   *   管理画面へ送ることまで。自分の手で解約ボタンを押すほうが儀式として強い。
   */
  const handleEnd = async () => {
    await openManageSubscriptions();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* ⚠ Modal の中は別のビュー階層。provider が無いと inset が 0 になる */}
      <SafeAreaProvider>
        {details === undefined ? (
          <View style={styles.backdrop}>
            <ActivityIndicator color={Ceremony.cream} />
          </View>
        ) : details ? (
          <Graduated details={details} isPaid={isPaid} onEnd={handleEnd} onClose={onClose} />
        ) : null}
      </SafeAreaProvider>
    </Modal>
  );
}

function Graduated({
  details,
  isPaid,
  onEnd,
  onClose,
}: {
  details: CertificateDetails;
  isPaid: boolean;
  onEnd: () => void;
  onClose: () => void;
}) {
  const cardRef = useRef<View>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleTake = async () => {
    setIsBusy(true);
    try {
      await shareCertificate(cardRef);
    } catch {
      // 共有をやめた場合も含めて黙る。追いかけない
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: Ceremony.navy }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.ceremony}>
          <CertificateCard ref={cardRef} details={details} />

          {/* 問いは画像に入れない。証書は記録で、問いはこの瞬間の本人に向けたもの */}
          <View style={styles.question}>
            {/* 購読している人には「もう課金は要らない」、していない人には「続けても終えてもいい」(2026-11-03) */}
            <Text style={styles.questionTitle}>{isPaid ? t.graduation.title : t.graduation.titleFree}</Text>
            <Text style={styles.questionNote}>{isPaid ? t.graduation.note : t.graduation.noteFree}</Text>
          </View>

          {/* ⚠ 重みは 受け取る > 解約 > まだ続ける。解約を勧めすぎず、隠しもしない */}
          <View style={styles.actions}>
            <Button
              tone="ceremony"
              label={t.graduation.certificate}
              onPress={handleTake}
              busy={isBusy}
            />
            {isPaid && (
              <Button tone="ceremony" variant="secondary" label={t.graduation.end} onPress={onEnd} />
            )}
            <Button
              tone="ceremony"
              variant="plain"
              label={isPaid ? t.graduation.notYet : t.graduation.close}
              onPress={onClose}
            />
          </View>

          <Text style={styles.footnote}>{t.certificate.note}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(10, 12, 20, 0.5)',
  },
  sheet: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.card,
  },
  ceremony: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.four,
  },
  question: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  questionTitle: {
    color: Ceremony.cream,
    fontFamily: Fonts?.voice,
    fontSize: 20,
    lineHeight: 32,
    fontWeight: 600,
  },
  questionNote: {
    color: Ceremony.creamSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  footnote: {
    color: Ceremony.creamSoft,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: Spacing.four,
  },
});
