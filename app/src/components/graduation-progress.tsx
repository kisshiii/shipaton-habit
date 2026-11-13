/**
 * Today の上部に出す、卒業までの進み具合(plan §4)。
 *
 *   Day 23 / 66
 *   ━━━━━━━━━━━━━━━━━━━━━━──────────────────
 *   Rest days in the last 7: 1 of 2  ·  5 days without a rest
 *
 * ⚠ ふだんは日付の見出しより目立たせない。大きくなるのは、やり切って日数が増えた一瞬だけ(2026-11-13。plan §10)。
 * ⚠ 休みを使い切っても赤くしない・警告しない。`danger` を使わない。
 * ⚠ 卒業した後は `66 / 66` で止め、休みと休まず続いた日数は出さない。
 *   長く使うほど増える数字を作らない(spec §9-11)。
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe, ReduceMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { GRADUATION_STREAK_DAYS, MAX_REST_DAYS, REST_WINDOW_DAYS } from '@/constants/graduation';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { formatMonthDay } from '@/lib/date';
import type { GraduationProgress as Progress } from '@/lib/graduation';

type Props = {
  progress: Progress;
};

/**
 * 日数が増えた瞬間の動き。いったん大きく出て、元の大きさに落ち着く(約0.7秒)。
 * ⚠ 紙吹雪も音も無し。「視差効果を減らす」の設定の人には動かさない
 */
const POP = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.7 }] },
  40: { opacity: 1, transform: [{ scale: 1.7 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
})
  .duration(700)
  .reduceMotion(ReduceMotion.System);

export function GraduationProgress({ progress }: Props) {
  const theme = useTheme();
  // 画面を開いたときの日数。開いただけでは動かさず、増えたときだけ動かす
  const [dayAtOpen] = useState(() =>
    progress.graduatedOn !== null ? GRADUATION_STREAK_DAYS : Math.min(progress.doneDays, GRADUATION_STREAK_DAYS),
  );
  // 始める日を先にした人は、その日まで数えない(plan §8)
  if (!progress.hasStarted) {
    return (
      <ThemedText type="smallBold" style={styles.container}>
        {t.today.startsOn(formatMonthDay(progress.countStartedOn))}
      </ThemedText>
    );
  }
  const isGraduated = progress.graduatedOn !== null;
  const day = isGraduated ? GRADUATION_STREAK_DAYS : Math.min(progress.doneDays, GRADUATION_STREAK_DAYS);
  const ratio = day / GRADUATION_STREAK_DAYS;

  const details = isGraduated
    ? []
    : [
        t.today.rests(progress.restsInWindow, MAX_REST_DAYS, REST_WINDOW_DAYS),
        // 0日は出さない。休んだことを数字で突きつけない
        ...(progress.unbrokenDays > 0 ? [t.today.unbroken(progress.unbrokenDays)] : []),
      ];
  const dayLabel = t.today.dayOf(day, GRADUATION_STREAK_DAYS);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={[dayLabel, ...details].join(', ')}
      accessibilityValue={{ min: 0, max: GRADUATION_STREAK_DAYS, now: day }}>
      {/*
        全部やり切った瞬間に数字が動く(plan §8・§10)。key が変わると入れ替わり、大きく出てから落ち着く。
        ⚠ チェックを外して日数が戻ったときは動かさない(取り消しを演出しない)
      */}
      <Animated.View key={day} entering={day > dayAtOpen ? POP : undefined} style={styles.day}>
        <ThemedText type="smallBold">{dayLabel}</ThemedText>
      </Animated.View>
      {/* ⚠ 色は文字と同じ系統。accent は押せるもの・選ばれたものにだけ使う(theme.ts) */}
      <View style={[styles.track, { backgroundColor: theme.line }]}>
        <View
          style={[styles.fill, { backgroundColor: theme.textSecondary, width: `${ratio * 100}%` }]}
        />
      </View>
      {details.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {details.join('  ·  ')}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  day: {
    // 文字の幅の箱にして、左端を軸に大きくする(画面の外にはみ出さない)
    alignSelf: 'flex-start',
    transformOrigin: 'left center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
