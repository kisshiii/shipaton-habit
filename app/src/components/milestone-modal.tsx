/**
 * 節目のお祝い(7日・33日・50日。plan §4)。
 *
 * 卒業画面と同じ紺の全面表示を、それぞれ一生に1回だけ出す。
 * ⚠ 紙吹雪・音・絵文字・感嘆符を使わない。数字と一言だけ(spec §2 デザイン方針)。
 * ⚠ 紺は節目の色。普段の画面に持ち込まない(theme.ts `Ceremony`)。
 */

import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { MilestoneCard, ShareCardModal } from '@/components/share-card';
import { GRADUATION_STREAK_DAYS } from '@/constants/graduation';
import { Ceremony, Fonts, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { getRoutines } from '@/storage';
import type { RoutineItem } from '@/types';

type Props = {
  /** 祝う節目。null なら閉じている */
  day: number | null;
  onClose: () => void;
};

export function MilestoneModal({ day, onClose }: Props) {
  /** カードに載せるルーティン。null なら共有の画面は閉じている */
  const [cardRoutines, setCardRoutines] = useState<RoutineItem[] | null>(null);

  return (
    <Modal visible={day !== null} animationType="fade" onRequestClose={onClose}>
      {/* ⚠ Modal の中は別のビュー階層。provider が無いと inset が 0 になる */}
      <SafeAreaProvider>
        <View style={[styles.fill, { backgroundColor: Ceremony.navy }]}>
          <StatusBar style="light" />
          <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
            {day !== null && (
              <>
                <ScrollView contentContainerStyle={styles.content}>
                  <Text style={styles.number} allowFontScaling={false} accessibilityElementsHidden>
                    {day}
                  </Text>
                  <View style={styles.rule} />
                  <Text style={styles.title} accessibilityRole="header">
                    {t.milestone.title(day, GRADUATION_STREAK_DAYS)}
                  </Text>
                  <Text style={styles.body}>{t.milestone.body(day, GRADUATION_STREAK_DAYS)}</Text>
                </ScrollView>
                {/* ⚠ 主ボタンは画面下に固定する */}
                <View style={styles.actions}>
                  <Button tone="ceremony" label={t.milestone.close} onPress={onClose} />
                  {/* 外から人を連れてくる経路(plan §7-4)。押した人にだけカードを作る */}
                  <Button
                    tone="ceremony"
                    variant="plain"
                    label={t.share.milestoneAction}
                    onPress={async () => setCardRoutines(await getRoutines())}
                  />
                </View>
                <ShareCardModal visible={cardRoutines !== null} onClose={() => setCardRoutines(null)}>
                  <MilestoneCard day={day} routines={cardRoutines ?? []} />
                </ShareCardModal>
              </>
            )}
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
    padding: Spacing.five,
  },
  number: {
    color: Ceremony.cream,
    fontFamily: Fonts?.voice,
    fontSize: 96,
    // 墨で書いた字の太さ。細い数字は上品に寄りすぎる(2026-11-10)
    fontWeight: 800,
    lineHeight: 112,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Ceremony.creamRule,
  },
  title: {
    color: Ceremony.cream,
    fontFamily: Fonts?.voice,
    fontSize: 24,
    lineHeight: 36,
    fontWeight: 600,
  },
  body: {
    color: Ceremony.creamSoft,
    fontSize: 15,
    lineHeight: 24,
  },
  actions: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
});
