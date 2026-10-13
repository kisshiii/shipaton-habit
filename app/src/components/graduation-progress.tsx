/**
 * Today の上部に出す、卒業までの進み具合(plan §4)。
 *
 *   Day 23 / 66
 *   ━━━━━━━━━━━━━━━━━━━━━━──────────────────
 *   Rest days in the last 7: 1 of 2  ·  5 days without a rest
 *
 * ⚠ 日付の見出しより目立たせない。数字だけを大きくしない(spec §2 デザイン方針)。
 * ⚠ 休みを使い切っても赤くしない・警告しない。`danger` を使わない。
 * ⚠ 卒業した後は `66 / 66` で止め、休みと休まず続いた日数は出さない。
 *   長く使うほど増える数字を作らない(spec §9-11)。
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GRADUATION_STREAK_DAYS, MAX_REST_DAYS, REST_WINDOW_DAYS } from '@/constants/graduation';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import type { GraduationProgress as Progress } from '@/lib/graduation';

type Props = {
  progress: Progress;
};

export function GraduationProgress({ progress }: Props) {
  const theme = useTheme();
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
      <ThemedText type="smallBold">{dayLabel}</ThemedText>
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
