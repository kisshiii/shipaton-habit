/**
 * ウィジェット(`src/widgets/katsu-progress.tsx`)に今の進み具合を渡す(plan §7-6)。
 *
 * 呼ぶところ: Today を開いたとき・チェックしたとき・ルーティンを変えたとき。
 * 深夜0時に今日の件数が 0 に戻るよう、翌日0時の分も予約しておく。
 *
 * ⚠ ユーザーの言葉を渡さない。渡すのは日数と件数だけ。
 * ⚠ 失敗してもアプリを止めない。ウィジェットは足しの表示にすぎない。
 */

import { GRADUATION_STREAK_DAYS } from '@/constants/graduation';
import { t } from '@/i18n';
import { formatMonthDay } from '@/lib/date';
import { evaluateGraduation } from '@/lib/graduation';
import { getRoutines, getTodayRecord } from '@/storage';
import KatsuProgress, { type KatsuProgressProps } from '@/widgets/katsu-progress';

export async function syncWidget(): Promise<void> {
  try {
    const [status, record, routines] = await Promise.all([
      evaluateGraduation(),
      getTodayRecord(),
      getRoutines(),
    ]);
    // ルーティンが無い人には何も出さない(判定そのものをしない人。spec §2)
    if (!status) {
      KatsuProgress.updateSnapshot({ dayLabel: '', todayLabel: '', ratio: 0 });
      return;
    }
    const { progress } = status;
    // 始める日を先にした人(plan §8)。その日まで日数を出さない
    if (!progress.hasStarted) {
      // 1日目の 0:00 に、アプリを開かなくても `Day 0 / 66` に切り替わるようにしておく
      const [year, month, date] = progress.countStartedOn.split('-').map(Number);
      KatsuProgress.updateTimeline([
        {
          date: new Date(),
          props: { dayLabel: t.widget.startsOn(formatMonthDay(progress.countStartedOn)), todayLabel: '', ratio: 0 },
        },
        {
          date: new Date(year, month - 1, date),
          props: {
            dayLabel: t.today.dayOf(0, GRADUATION_STREAK_DAYS),
            todayLabel: t.today.progress(0, routines.length),
            ratio: 0,
          },
        },
      ]);
      return;
    }
    const day =
      progress.graduatedOn !== null
        ? GRADUATION_STREAK_DAYS
        : Math.min(progress.doneDays, GRADUATION_STREAK_DAYS);
    const base: Omit<KatsuProgressProps, 'todayLabel'> = {
      dayLabel: t.today.dayOf(day, GRADUATION_STREAK_DAYS),
      ratio: day / GRADUATION_STREAK_DAYS,
    };
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    KatsuProgress.updateTimeline([
      { date: new Date(), props: { ...base, todayLabel: t.today.progress(record.completedIds.length, record.totalCount) } },
      // 日付が変わったら今日の件数は 0 から。日数は次に開いたときに引き直す。
      // ⚠ 分母は今日の記録ではなくルーティンの数(今日の分母は、時刻が過ぎて外した項目のぶん少ないことがある)
      { date: midnight, props: { ...base, todayLabel: t.today.progress(0, routines.length) } },
    ]);
  } catch {
    // 黙る。ウィジェットの都合で画面を止めない
  }
}
