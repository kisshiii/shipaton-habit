/**
 * ウィジェット(`src/widgets/katsu-progress.tsx`)に今の進み具合を渡す(plan §7-6)。
 *
 * 呼ぶところ: Today を開いたとき・チェックしたとき・ルーティンを変えたとき。
 * 深夜0時に今日の件数が 0 に戻るよう、翌日0時の分も予約しておく。
 *
 * ウィジェットでチェックした分は `applyWidgetChecks()` で拾う(2026-11-01)。
 * 押した記録はウィジェットのタイムライン(App Group)の props にしか残らないため、
 * **タイムラインを書き直す前に必ず拾う。**拾わずに `syncWidget()` すると押した分が消える。
 *
 * ⚠ ユーザーの言葉を渡さない。渡すのは日数・件数・ルーティン名だけ。
 * ⚠ 失敗してもアプリを止めない。ウィジェットは足しの表示にすぎない。
 */

import { GRADUATION_STREAK_DAYS } from '@/constants/graduation';
import { MAX_ROUTINES } from '@/constants/routines';
import { t } from '@/i18n';
import { formatMonthDay, toDateKey, todayKey } from '@/lib/date';
import { evaluateGraduation } from '@/lib/graduation';
import { syncScheduledNotifications } from '@/lib/notifications';
import { getRoutines, getTodayRecord, markCompletedToday } from '@/storage';
import type { DailyRecord, RoutineItem } from '@/types';
import KatsuProgress, { type KatsuProgressProps, type WidgetRoutine } from '@/widgets/katsu-progress';

/** `progressLabels[分母][分子]`。ウィジェットの中で押したあとの件数表示に使う */
function progressLabels(): string[][] {
  return Array.from({ length: MAX_ROUTINES + 1 }, (_, total) =>
    Array.from({ length: total + 1 }, (_, done) => t.today.progress(done, total)),
  );
}

/** ウィジェットに並べる今日のルーティン。記録が無い日(翌日0時の分)は全部まだ */
function widgetRoutines(routines: RoutineItem[], record?: DailyRecord): WidgetRoutine[] {
  const excluded = new Set(record?.excludedIds ?? []);
  return routines.slice(0, MAX_ROUTINES).map((routine) => ({
    id: routine.id,
    time: routine.time,
    title: routine.title,
    done: record?.completedIds.includes(routine.id) ?? false,
    ...(excluded.has(routine.id) ? { excluded: true } : {}),
  }));
}

/**
 * 今の状態をウィジェットに書く。
 * ⚠ 書く前に、ウィジェットで押した分を拾う(書き直すと消えるため)。拾い方は `applyWidgetChecks()` を参照
 */
export function syncWidget(): Promise<void> {
  return serialized(async () => {
    await takeWidgetChecks();
    await writeWidget();
  });
}

/**
 * ウィジェットで押したチェックをアプリの記録に移す。移した件数を返す。
 *
 * アプリが動いていない間に押されても、押した項目はタイムラインの props(`checkedIds`)に残っている
 * (expo-widgets 57.0.9: ボタンの onPress が返した値を、ウィジェット側が App Group のタイムラインに上書きする)。
 * それを読み、**その表示の日(`forDay`)が今日のものだけ**付ける(昨日の表示を押した分は捨てる。
 * 過去日の遡り修正はしない)。付けたら通知の予約を引き直し、ウィジェットを書き直して `checkedIds` を空に戻す。
 * 押したイベント(`addUserInteractionListener`)は使わない ── ウィジェット側の別プロセスで出るため、
 * アプリには届かず、溜めてもおかれない。
 *
 * 呼ぶところ: 起動時(`_layout.tsx`)と Today を読み直すたび。押した分が無ければ何も書かない。
 */
export function applyWidgetChecks(): Promise<number> {
  return serialized(async () => {
    const taken = await takeWidgetChecks();
    if (taken === null) return 0;
    await writeWidget();
    return taken;
  });
}

/** 読んで付けて書く、を1つずつ順に。重なると、拾う前のタイムラインで上書きしかねない */
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

/** 押した分を今日の記録に付ける。付けた件数を返す。押した分が1つも無ければ null */
async function takeWidgetChecks(): Promise<number | null> {
  try {
    const today = todayKey();
    const entries = await KatsuProgress.getTimeline();
    let hasAny = false;
    const ids = new Set<string>();
    for (const { props } of entries) {
      const checkedIds = props?.checkedIds ?? [];
      if (checkedIds.length === 0) continue;
      hasAny = true;
      if (props.forDay === today) checkedIds.forEach((id) => ids.add(id));
    }
    if (!hasAny) return null;
    // ⚠ 付けるだけ。付け外しではない(markCompletedToday は付いていれば何もしない)
    for (const id of ids) await markCompletedToday(id);
    if (ids.size > 0) await syncScheduledNotifications();
    return ids.size;
  } catch {
    // 黙る。ウィジェットの都合で画面を止めない
    return null;
  }
}

async function writeWidget(): Promise<void> {
  try {
    const [status, record, routines] = await Promise.all([
      evaluateGraduation(),
      getTodayRecord(),
      getRoutines(),
    ]);
    // ルーティンが無い人には何も出さない(判定そのものをしない人。spec §2)
    if (!status) {
      KatsuProgress.updateSnapshot({ dayLabel: '', todayLabel: '', ratio: 0, routines: [], checkedIds: [] });
      return;
    }
    const { progress } = status;
    const labels = progressLabels();
    // 始める日を先にした人(plan §8)。その日まで日数もボタンも出さない
    if (!progress.hasStarted) {
      // 1日目の 0:00 に、アプリを開かなくても `Day 0 / 66` に切り替わるようにしておく
      const [year, month, date] = progress.countStartedOn.split('-').map(Number);
      KatsuProgress.updateTimeline([
        {
          date: new Date(),
          props: {
            dayLabel: t.widget.startsOn(formatMonthDay(progress.countStartedOn)),
            todayLabel: '',
            ratio: 0,
            routines: [],
            checkedIds: [],
          },
        },
        {
          // 1日目からはウィジェットでもチェックできる
          date: new Date(year, month - 1, date),
          props: {
            dayLabel: t.today.dayOf(0, GRADUATION_STREAK_DAYS),
            todayLabel: t.today.progress(0, routines.length),
            ratio: 0,
            forDay: progress.countStartedOn,
            routines: widgetRoutines(routines),
            checkedIds: [],
            progressLabels: labels,
          },
        },
      ]);
      return;
    }
    const day =
      progress.graduatedOn !== null
        ? GRADUATION_STREAK_DAYS
        : Math.min(progress.doneDays, GRADUATION_STREAK_DAYS);
    const base: Pick<KatsuProgressProps, 'dayLabel' | 'ratio' | 'progressLabels' | 'checkedIds'> = {
      dayLabel: t.today.dayOf(day, GRADUATION_STREAK_DAYS),
      ratio: day / GRADUATION_STREAK_DAYS,
      progressLabels: labels,
      checkedIds: [],
    };
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const dayAfter = new Date(midnight);
    dayAfter.setDate(dayAfter.getDate() + 1);
    KatsuProgress.updateTimeline([
      {
        date: new Date(),
        props: {
          ...base,
          todayLabel: t.today.progress(record.completedIds.length, record.totalCount),
          forDay: record.date,
          routines: widgetRoutines(routines, record),
        },
      },
      // 日付が変わったら今日の件数は 0 から。日数は次に開いたときに引き直す。
      // ⚠ 分母は今日の記録ではなくルーティンの数(今日の分母は、時刻が過ぎて外した項目のぶん少ないことがある)
      {
        date: midnight,
        props: {
          ...base,
          todayLabel: t.today.progress(0, routines.length),
          forDay: toDateKey(midnight),
          routines: widgetRoutines(routines),
        },
      },
      // 2日以上開いていないときは、ボタンを引っ込めて日数だけにする。
      // 古い表示のまま押せると、押したのに記録されない(その日の分ではない)ことになる
      { date: dayAfter, props: { ...base, todayLabel: '', routines: [] } },
    ]);
  } catch {
    // 黙る。ウィジェットの都合で画面を止めない
  }
}
