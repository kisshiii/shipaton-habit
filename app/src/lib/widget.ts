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
import { getRoutines, getTodayRecord, markCompletedOnDay } from '@/storage';
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
    await writeWidgetAfterChecks();
  });
}

/**
 * 書く直前にもう一度、押した分が増えていないかを見る。増えていれば拾ってから書き直す。
 * ⚠ アプリとウィジェットは別々に「読む → 直す → 書く」をするので、間に押された分を上書きで消しかねない。
 *   完全には防げない(expo-widgets 側に手を入れないと無理)が、すき間をごく短くする
 */
async function writeWidgetAfterChecks(): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // ⚠ 書けたら「拾い済み」を忘れる。書いた時点でウィジェット側の押した記録は空になっているので、
    //   古い記録で付け直すおそれはもう無い。忘れないと、Today で外したあとにウィジェットで
    //   付け直した2回目が拾われずに消えていた(1.0.4 で直した)
    if (await writeWidget()) consumed.clear();
    const more = await takeWidgetChecks();
    if (!more) return;
  }
}

/**
 * ウィジェットで押したチェックをアプリの記録に移す。移した件数を返す。
 *
 * アプリが動いていない間に押されても、押した項目はタイムラインの props(`checkedIds`)に残っている
 * (expo-widgets 57.0.9: ボタンの onPress が返した値を、ウィジェット側が App Group のタイムラインに上書きする)。
 * それを読み、**押した日(`forDay`)の記録に**付ける。その日に一度もアプリを開かなかった人でも、
 * ウィジェットでやり切った日は「やった日」になる(2026-11-03 に決定。spec §2)。
 * ウィジェットは表示の日と押した日が同じときしか押せない(katsu-progress.tsx の check())ので、
 * 本人が過去日を直す手段にはならない。付けたら通知の予約を引き直し、ウィジェットを書き直して `checkedIds` を空に戻す。
 * 押したイベント(`addUserInteractionListener`)は使わない ── ウィジェット側の別プロセスで出るため、
 * アプリには届かず、溜めてもおかれない。
 *
 * 呼ぶところ: 起動時(`_layout.tsx`)と Today を読み直すたび。押した分が無ければ何も書かない。
 */
export function applyWidgetChecks(): Promise<number> {
  return serialized(async () => {
    const taken = await takeWidgetChecks();
    if (taken === null) return 0;
    await writeWidgetAfterChecks();
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

/**
 * 拾い済みの項目(`forDay:id`)。書き直しに失敗して `checkedIds` が残っても、二度は付けない。
 * 付けたあとに本人が Today で外したのを、ウィジェットの古い記録で付け直さないため
 */
const consumed = new Set<string>();

/** 押した分を押した日の記録に付ける。付けた件数を返す。新しく押した分が1つも無ければ null */
async function takeWidgetChecks(): Promise<number | null> {
  try {
    const entries = await KatsuProgress.getTimeline();
    let hasAny = false;
    const byDay = new Map<string, string[]>();
    for (const { props } of entries) {
      // forDay の無い表示(1.0.3 より前の書き方)は、いつ押したか分からないので付けない
      if (!props?.forDay) continue;
      for (const id of props.checkedIds ?? []) {
        const key = props.forDay + ':' + id;
        if (consumed.has(key)) continue;
        hasAny = true;
        byDay.set(props.forDay, [...(byDay.get(props.forDay) ?? []), id]);
      }
    }
    if (!hasAny) return null;
    // ⚠ 付けるだけ。付け外しではない(付いていれば何もしない)
    let applied = 0;
    for (const [day, ids] of byDay) {
      applied += await markCompletedOnDay(day, ids);
      // 記録できてから「拾い済み」にする。先に入れると、書き込みに失敗した分が二度と拾われない
      for (const id of ids) consumed.add(day + ':' + id);
    }
    if (byDay.has(todayKey())) await syncScheduledNotifications();
    return applied;
  } catch {
    // 黙る。ウィジェットの都合で画面を止めない
    return null;
  }
}

/** 書けたら true(どの書き方でも、押した記録 `checkedIds` は空に戻る) */
async function writeWidget(): Promise<boolean> {
  try {
    const [status, record, routines] = await Promise.all([
      evaluateGraduation(),
      getTodayRecord(),
      getRoutines(),
    ]);
    // ルーティンが無い人には何も出さない(判定そのものをしない人。spec §2)
    if (!status) {
      KatsuProgress.updateSnapshot({ dayLabel: '', todayLabel: '', ratio: 0, routines: [], checkedIds: [] });
      return true;
    }
    const { progress } = status;
    const labels = progressLabels();
    const spoken = { doneText: t.today.doneHint, notDoneText: t.today.notDoneHint };
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
            dayLabelDone: t.today.dayOf(1, GRADUATION_STREAK_DAYS),
            ratioDone: 1 / GRADUATION_STREAK_DAYS,
            ...spoken,
          },
        },
        {
          // 1日目を開かずに過ぎたら、ボタンを引っ込める(押しても、その日の分として記録できないため)
          date: new Date(year, month - 1, date + 1),
          props: {
            dayLabel: t.today.dayOf(0, GRADUATION_STREAK_DAYS),
            todayLabel: '',
            ratio: 0,
            routines: [],
            checkedIds: [],
          },
        },
      ]);
      return true;
    }
    const day =
      progress.graduatedOn !== null
        ? GRADUATION_STREAK_DAYS
        : Math.min(progress.doneDays, GRADUATION_STREAK_DAYS);
    const base: Pick<
      KatsuProgressProps,
      'dayLabel' | 'ratio' | 'progressLabels' | 'checkedIds' | 'doneText' | 'notDoneText'
    > = {
      dayLabel: t.today.dayOf(day, GRADUATION_STREAK_DAYS),
      ratio: day / GRADUATION_STREAK_DAYS,
      progressLabels: labels,
      checkedIds: [],
      ...spoken,
    };
    // ウィジェットで今日を全部やり切ったときの日数。今日がまだなら1つ進む(卒業後は 66 / 66 のまま)
    const todayDone = progress.todayDoneByHand || record.completedIds.length >= Math.max(record.totalCount, 1);
    const dayIfDone =
      progress.graduatedOn !== null || todayDone ? day : Math.min(day + 1, GRADUATION_STREAK_DAYS);
    const doneExtras = {
      dayLabelDone: t.today.dayOf(dayIfDone, GRADUATION_STREAK_DAYS),
      ratioDone: dayIfDone / GRADUATION_STREAK_DAYS,
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
          ...doneExtras,
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
          // 明日をウィジェットだけで全部やり切ったときも、日数を1つ進めて見せる(2026-11-03、シミュレーターで発見)。
          // 今日がやり切りでも休みでも、明日やり切れば今の日数 + 1(休みで数え直す日だけは、開いたときに引き直す)
          ...(progress.graduatedOn !== null
            ? {}
            : {
                dayLabelDone: t.today.dayOf(Math.min(day + 1, GRADUATION_STREAK_DAYS), GRADUATION_STREAK_DAYS),
                ratioDone: Math.min(day + 1, GRADUATION_STREAK_DAYS) / GRADUATION_STREAK_DAYS,
              }),
        },
      },
      // 2日以上開いていないときは、ボタンを引っ込めて日数だけにする。
      // 古い表示のまま押せると、押したのに記録されない(その日の分ではない)ことになる
      { date: dayAfter, props: { ...base, todayLabel: '', routines: [] } },
    ]);
    return true;
  } catch {
    // 黙る。ウィジェットの都合で画面を止めない
    return false;
  }
}
