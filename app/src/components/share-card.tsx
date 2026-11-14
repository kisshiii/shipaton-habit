/**
 * 共有カード(plan §7-4)。節目のカードと、言葉のカード。
 *
 * ⚠ **端末内で完結させること。**画像はこの端末で作り、共有シートに渡すだけ。
 *   どこにも上げない。行き先は本人が共有シートで選ぶ。
 * ⚠ **言葉は、本人が「カードにする」を選んだときだけ載せる。**節目のカードにも証書にも
 *   自動では載せない(spec §3-4)。
 * ⚠ 祝福するが、可愛くしない。紙吹雪・絵文字・感嘆符・スコアを入れない。
 * ⚠ 配色はテーマに従わせない。共有した画像が、送った人の端末設定で変わらないようにする。
 */

import { useRef, useState, type ReactNode } from 'react';
import { Image, Modal, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/button';
import { GRADUATION_STREAK_DAYS } from '@/constants/graduation';
import { Ceremony, Fonts, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import type { RoutineItem } from '@/types';

/** ⚠ collapsable={false}: 中身だけの View は描画時に畳まれ、画像化できなくなる */
async function shareView(view: View): Promise<void> {
  const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
  await Share.share({ url: uri });
}

function CardFrame({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.mark}
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      {children}
      {/* 見出しがもう KATSU のときは、下にもう一度出さない(2026-11-10。足元を「KATSU」だけにしてから重なっていた) */}
      {eyebrow !== t.certificate.footer && <Text style={styles.footer}>{t.certificate.footer}</Text>}
    </View>
  );
}

/** 節目のカード。日数と、毎日やっていること。⚠ 言葉は載せない */
export function MilestoneCard({ day, routines }: { day: number; routines: RoutineItem[] }) {
  return (
    <CardFrame eyebrow={t.share.milestoneEyebrow}>
      <Text style={styles.headline}>{t.today.dayOf(day, GRADUATION_STREAK_DAYS)}</Text>
      <View style={styles.rule} />
      <View style={styles.section}>
        <Text style={styles.label}>{t.share.habitsLabel}</Text>
        {routines.map((routine) => (
          <View key={routine.id} style={styles.habit}>
            <Text style={styles.habitTime}>{routine.time}</Text>
            <Text style={styles.habitTitle}>{routine.title}</Text>
          </View>
        ))}
      </View>
    </CardFrame>
  );
}

/** 言葉のカード。⚠ 本人が選んだときだけ作る */
export function WordsCard({ text }: { text: string }) {
  return (
    <CardFrame eyebrow={t.share.wordsEyebrow}>
      <Text style={styles.words}>{text}</Text>
    </CardFrame>
  );
}

/**
 * カードを見せてから共有する画面。紺の全面。
 * 共有を押したときにだけ画像にする。閉じれば何も残らない(一時ファイルは OS が片づける)。
 */
export function ShareCardModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const cardRef = useRef<View>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsBusy(true);
    try {
      await shareView(cardRef.current);
    } catch {
      // 共有をやめた場合も含めて黙る。追いかけない
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      {/* ⚠ Modal の中は別のビュー階層。provider が無いと inset が 0 になる */}
      <SafeAreaProvider>
        <View style={[styles.fill, { backgroundColor: Ceremony.navy }]}>
          <StatusBar style="light" />
          <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.content}>
              <View ref={cardRef} collapsable={false}>
                {children}
              </View>
              <Text style={styles.note}>{t.share.note}</Text>
            </ScrollView>
            <View style={styles.actions}>
              <Button tone="ceremony" label={t.share.share} onPress={handleShare} busy={isBusy} />
              <Button tone="ceremony" variant="plain" label={t.share.close} onPress={onClose} />
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.four,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    backgroundColor: Ceremony.navy,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: 7,
  },
  eyebrow: {
    color: Ceremony.creamSoft,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headline: {
    color: Ceremony.cream,
    fontFamily: Fonts?.voice,
    fontSize: 40,
    lineHeight: 52,
    fontWeight: 700,
  },
  words: {
    color: Ceremony.cream,
    fontFamily: Fonts?.voice,
    fontSize: 30,
    lineHeight: 44,
    fontWeight: 600,
    paddingVertical: Spacing.three,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Ceremony.creamRule,
  },
  section: {
    gap: Spacing.two,
  },
  label: {
    color: Ceremony.creamSoft,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  habit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  habitTime: {
    color: Ceremony.creamSoft,
    fontFamily: Fonts?.mono,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  habitTitle: {
    flex: 1,
    color: Ceremony.cream,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 600,
  },
  footer: {
    color: Ceremony.creamSoft,
    fontSize: 12,
    letterSpacing: 0.5,
    paddingTop: Spacing.two,
  },
  note: {
    color: Ceremony.creamSoft,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: Spacing.four,
  },
  actions: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
});
