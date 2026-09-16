/**
 * 卒業証書(spec §3-4 卒業後に何が残るか)。卒業の画面の中にそのまま置く。
 *
 * ⚠ **残るのは習慣そのもの。**証書はその記録であって、アプリに留まる理由ではない。
 *   スコア・ランク・バッジ・連続日数のカウンターを足さないこと。
 *
 * ⚠ **祝福するが、可愛くしない。**紙吹雪・絵文字・「おめでとう！」を入れない。
 *   アプリの文体(短く、断定で、相手を大人として扱う)を保つ。
 *
 * ⚠ **端末内で完結させること。**画像はこの端末で作り、共有シートに渡すだけ。
 *   サーバーに送らない。**自分の言葉(KATSU の文言)は載せない。**
 *   載るのはルーティンの名前と日付だけで、それも本人が受け取るを押したときにしか外へ出ない。
 *
 * ⚠ 配色はテーマに従わせない。共有した画像が、送った人の端末設定で変わらないようにする。
 *   紺と生成りはアイコンと同じ色。
 */

import { forwardRef, type RefObject } from 'react';
import { Image, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

import { GRADUATION_STREAK_DAYS } from '@/constants/graduation';
import { Ceremony, Fonts, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { formatFullDateKey } from '@/lib/date';
import { evaluateGraduation } from '@/lib/graduation';
import { getAppState, getRoutines } from '@/storage';
import type { RoutineItem } from '@/types';

export type CertificateDetails = {
  routines: RoutineItem[];
  startedOn: string;
  graduatedOn: string;
};

/**
 * 証書に載せるものを集める。卒業していなければ `null`。
 * ⚠ 66日に届く前にやめる人は卒業ではない。証書を出さない(spec §2 卒業の扱い)。
 * ⚠ 卒業日は判定が記録から出す日。証書を開いた日ではない。
 */
export async function loadCertificate(): Promise<CertificateDetails | null> {
  const [routines, appState, status] = await Promise.all([
    getRoutines(),
    getAppState(),
    evaluateGraduation(),
  ]);
  if (!status?.graduatedOn || !appState.startedOn) return null;
  return {
    routines,
    startedOn: appState.startedOn,
    graduatedOn: status.graduatedOn,
  };
}

/**
 * 証書を画像にして共有シートへ渡す。
 * ⚠ 一時ファイルに書くだけ。どこにも上げない。行き先は本人が共有シートで選ぶ
 */
export async function shareCertificate(ref: RefObject<View | null>): Promise<void> {
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  await Share.share({ url: uri });
}

/** 画像になる部分。⚠ collapsable={false}: 中身だけの View は描画時に畳まれ、画像化できなくなる */
export const CertificateCard = forwardRef<View, { details: CertificateDetails }>(
  function CertificateCard({ details }, ref) {
    return (
      <View ref={ref} collapsable={false} style={styles.card}>
        <View style={styles.head}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.mark}
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.eyebrow}>{t.certificate.eyebrow}</Text>
        </View>

        {/* ⚠ 日数は見出しで一度だけ言う。全員が同じ数字なので、長く使っても増えない */}
        {/* ⚠ 一度だけゆっくり出す。弾ませない */}
        <Animated.Text
          entering={FadeIn.duration(900).reduceMotion(ReduceMotion.System)}
          style={styles.headline}>
          {t.certificate.headline(GRADUATION_STREAK_DAYS)}
        </Animated.Text>

        <View style={styles.rule} />

        <View style={styles.section}>
          <Text style={styles.label}>{t.certificate.habitsLabel}</Text>
          {details.routines.map((routine) => (
            <View key={routine.id} style={styles.habit}>
              <Text style={styles.habitTime}>{routine.time}</Text>
              <Text style={styles.habitTitle}>{routine.title}</Text>
            </View>
          ))}
        </View>

        <View style={styles.rule} />

        <View style={styles.facts}>
          <Fact label={t.certificate.started} value={formatFullDateKey(details.startedOn)} />
          <Fact label={t.certificate.graduated} value={formatFullDateKey(details.graduatedOn)} />
        </View>

        <Text style={styles.footer}>{t.certificate.footer}</Text>
      </View>
    );
  },
);

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 34,
    lineHeight: 46,
    fontWeight: 700,
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
  facts: {
    gap: Spacing.two,
  },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  factValue: {
    color: Ceremony.cream,
    fontSize: 16,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  footer: {
    color: Ceremony.creamSoft,
    fontSize: 12,
    letterSpacing: 0.5,
    paddingTop: Spacing.two,
  },
});
