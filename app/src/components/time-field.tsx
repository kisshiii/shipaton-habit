/**
 * 時刻の入力。
 *
 * ⚠ **キーボードで打たせないこと。** `07:00` を手で打つのは、毎日決まった時刻を
 *   数件登録するだけの操作に対して重すぎる。コロンの位置も 24 時間制かどうかも
 *   ユーザーには分からない ── 分からせるのではなく、選ばせる。
 *
 * iOS 標準のホイールを出す。`@expo/ui` は既に依存に入っているので
 * ネイティブモジュールは増えない。
 *
 * ⚠ 外との受け渡しは `"HH:MM"` 文字列のまま。保存形式(`RoutineItem.time`)を
 *   Date に変えない ── 日付を持たせると「いつの7時か」という無い概念が生まれる。
 */

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Host, DatePicker } from '@expo/ui/swift-ui';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** "07:00"。空文字なら既定値を出す */
  value: string;
  onChange: (time: string) => void;
  label?: string;
};

/** 既定は 7:00。最初の1件は朝の習慣であることが多い */
const FALLBACK = { hours: 7, minutes: 0 };

function toDate(value: string): Date {
  const match = value.match(/^(\d{1,2}):(\d{1,2})$/);
  const hours = match ? Number(match[1]) : FALLBACK.hours;
  const minutes = match ? Number(match[2]) : FALLBACK.minutes;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function toTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TimeField({ value, onChange, label = 'Time' }: Props) {
  const theme = useTheme();
  const selection = useMemo(() => toDate(value), [value]);

  return (
    <View style={styles.row}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      {/* matchContents で SwiftUI 側の実寸に合わせる。固定高だと機種で切れる */}
      <Host matchContents seedColor={theme.accent}>
        <DatePicker
          selection={selection}
          displayedComponents={['hourAndMinute']}
          onDateChange={(date) => onChange(toTime(date))}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 44,
  },
});
