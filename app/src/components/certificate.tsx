/**
 * 卒業証書(spec §3-4 卒業後に何が残るか)。
 *
 * ⚠ **残るのは習慣そのもの。**証書はその記録であって、アプリに留まる理由ではない。
 *   スコア・ランク・バッジ・連続記録を足さないこと。
 *
 * ⚠ **祝福するが、可愛くしない。**紙吹雪・絵文字・「おめでとう！」を入れない。
 *   アプリの文体(短く、断定で、相手を大人として扱う)を保つ。
 *
 * ⚠ **端末内で完結させること。**画像はこの端末で作り、共有シートに渡すだけ。
 *   サーバーに送らない。**自分の言葉(KATSU の文言)は載せない。**
 *   載るのはルーティンの名前と日付だけで、それも本人が共有を押したときにしか外へ出ない。
 *
 * ⚠ 配色はテーマに従わせない。共有した画像が、送った人の端末設定で変わらないようにする。
 *   紺と生成りはアイコンと同じ色。
 */

import { useEffect, useRef, useState } from 'react';
import { Image, Modal, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { countDaysInclusive, formatFullDateKey, todayKey } from '@/lib/date';
import { evaluateGraduation } from '@/lib/graduation';
import { getAppState, getRoutines } from '@/storage';
import type { RoutineItem } from '@/types';

const NAVY = '#0F1B61';
const CREAM = '#FAF0E0';
const CREAM_SOFT = 'rgba(250, 240, 224, 0.7)';
const CREAM_RULE = 'rgba(250, 240, 224, 0.22)';

type Details = {
  routines: RoutineItem[];
  startedOn: string;
  graduatedOn: string;
  days: number;
  achievedDays: number;
  window: number;
  threshold: number;
};

/**
 * 証書に載せるものを集める。出せる相手でなければ `null`。
 * ⚠ ルーティンが0件の人には出さない。卒業判定と同じ線引き(spec §2 判定の細部)。
 */
export async function loadCertificate(): Promise<Details | null> {
  const [routines, appState, progress] = await Promise.all([
    getRoutines(),
    getAppState(),
    evaluateGraduation(),
  ]);
  if (!progress || !appState.startedOn || routines.length === 0) return null;

  // 卒業した日は「証書を開いた日」。自分で降りると決めた日がその人の卒業日
  const graduatedOn = todayKey();
  return {
    routines,
    startedOn: appState.startedOn,
    graduatedOn,
    days: countDaysInclusive(appState.startedOn, graduatedOn),
    achievedDays: progress.achievedDays,
    window: progress.window,
    threshold: progress.threshold,
  };
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function Certificate({ visible, onClose }: Props) {
  const [details, setDetails] = useState<Details | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    loadCertificate().then((next) => {
      if (!cancelled) setDetails(next);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleShare = async () => {
    setIsBusy(true);
    try {
      // ⚠ 一時ファイルに書くだけ。どこにも上げない。行き先は本人が共有シートで選ぶ
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Share.share({ url: uri });
    } catch {
      // 共有をやめた場合も含めて黙る。追いかけない
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <ThemedView style={styles.screen}>
          <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.content}>
              {details && (
                // ⚠ collapsable={false}: 中身だけの View は描画時に畳まれ、画像化できなくなる
                <View ref={cardRef} collapsable={false} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Image
                      source={require('../../assets/images/icon.png')}
                      style={styles.mark}
                      accessibilityIgnoresInvertColors
                    />
                    <Text style={styles.eyebrow}>{t.certificate.eyebrow}</Text>
                  </View>

                  <Text style={styles.headline}>{t.certificate.headline}</Text>

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
                    <Fact label={t.certificate.days} value={t.certificate.daysValue(details.days)} />
                  </View>

                  {/*
                    ⚠ 閾値に届いているときだけ出す。自分で早めに降りた人に
                      「30日のうち4日」を突きつけると、証書が採点表になる
                  */}
                  {details.achievedDays >= details.threshold && (
                    <Text style={styles.achieved}>
                      {t.certificate.achieved(details.achievedDays, details.window)}
                    </Text>
                  )}

                  <Text style={styles.footer}>{t.certificate.footer}</Text>
                </View>
              )}

              <View style={styles.actions}>
                <Button
                  label={t.certificate.share}
                  onPress={handleShare}
                  busy={isBusy}
                  disabled={!details}
                />
                <Button label={t.certificate.close} variant="plain" onPress={onClose} />
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                {t.certificate.note}
              </ThemedText>
            </ScrollView>
          </SafeAreaView>
        </ThemedView>
      </SafeAreaProvider>
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    padding: Spacing.three,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: NAVY,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  eyebrow: {
    color: CREAM_SOFT,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headline: {
    color: CREAM,
    fontFamily: Fonts?.serif,
    fontSize: 30,
    lineHeight: 40,
    fontWeight: 700,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CREAM_RULE,
  },
  section: {
    gap: Spacing.two,
  },
  label: {
    color: CREAM_SOFT,
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
    color: CREAM_SOFT,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  habitTitle: {
    flex: 1,
    color: CREAM,
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
    color: CREAM,
    fontSize: 16,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  achieved: {
    color: CREAM,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    color: CREAM_SOFT,
    fontSize: 12,
    letterSpacing: 0.5,
    paddingTop: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
});
