/**
 * ⚠ **開発ビルド・スクリーンショット用ビルド専用。App Store 版には入らない。**
 *
 * 卒業も節目も、実際に日数が経たないと画面に出ない。見た目の確認とストア用の撮影のために、
 * その日数ぶんの記録を作って保存内容を丸ごと差し替える。
 *
 * 状態の種類(`DemoKind`):
 *   - `graduation`  66日やり切った。Today で卒業画面が開く
 *   - `progress`    23日目・直近7日の休み1回。Today の進み具合と、1件チェック済みの今日(撮影用)
 *   - `milestone-1` / `milestone-7` / `milestone-33` / `milestone-50`  その日数に届いた。Today で節目の画面が開く
 *   - `restart`     3回目の休みで数え直した直後。Today に数え直しのお知らせが出る
 *
 * 使い方:
 *   シミュレーター(確認のダイアログが出ない): `xcrun simctl launch <UDID> com.kisshi.gradhabit -katsuDevSeed progress`
 *     → 差し替え終わるまで画面を描かないので、その起動のまま撮れる。起動のたびに差し替え直す
 *   開発ビルドなら URL でも: `app:///?katsu-dev-seed=progress`(差し替えて再読み込みする)
 *
 * ⚠ 読み込みは `_layout.tsx` の `if (__DEV__ || EXPO_PUBLIC_KATSU_DEV_TOOLS)` の中からだけ行う。
 *   本番ビルドではそのブロックごと消えるので、このファイルもバンドルに入らない。
 */

import { GRADUATION_STREAK_DAYS, MILESTONE_DAYS } from '@/constants/graduation';
import { language } from '@/i18n';
import { toDateKey } from '@/lib/date';
import { getMessages, getDevSeedForDevelopment, replaceAllForDevelopment } from '@/storage';
import type { AppState, DailyRecord, KatsuMessage, RoutineItem } from '@/types';

/** URL のクエリ名(`?katsu-dev-seed=progress`)。起動引数の名前は `_layout.tsx` に直接書く(本番で消すため) */
export const DEV_SEED_QUERY = 'katsu-dev-seed';

export const DEMO_KINDS = [
  'graduation',
  'progress',
  'milestone-1',
  'milestone-7',
  'milestone-33',
  'milestone-50',
  'restart',
] as const;
export type DemoKind = (typeof DEMO_KINDS)[number];

export function isDemoKind(value: unknown): value is DemoKind {
  return typeof value === 'string' && (DEMO_KINDS as readonly string[]).includes(value);
}

const DEMO = {
  ja: {
    routines: [
      { id: 'demo-run', time: '06:30', title: 'ランニングに行く' },
      { id: 'demo-english', time: '20:00', title: '英語を15分やる' },
      { id: 'demo-journal', time: '22:00', title: '寝る前に日記を書く' },
    ],
    word: 'やるって決めたのは、お前だろう。',
  },
  en: {
    routines: [
      { id: 'demo-run', time: '06:30', title: 'Go for a run' },
      { id: 'demo-english', time: '20:00', title: 'Study English for 15 minutes' },
      { id: 'demo-journal', time: '22:00', title: 'Write in my journal before bed' },
    ],
    word: 'You decided to do this. Nobody else did.',
  },
} as const;

/** 1日分の作り方。`done` は全部やり切った日、`rest` は何もしなかった日 */
type Day = 'done' | 'rest';

type Plan = {
  /** 昨日までの日々(古い順)。最初の日が Day 1 */
  past: Day[];
  /** 今日チェック済みにするルーティンの数 */
  todayDone: number;
  /** 祝い済みにしておく節目。undefined にすると「1.0.2 で初めての判定」扱いになるので必ず入れる */
  celebrated: number[];
};

const repeat = (day: Day, count: number): Day[] => Array.from({ length: count }, () => day);

function planFor(kind: DemoKind, routineCount: number): Plan {
  switch (kind) {
    case 'graduation':
      // 昨日までに66日。今日はまだ手を付けていない
      return { past: repeat('done', GRADUATION_STREAK_DAYS), todayDone: 0, celebrated: [...MILESTONE_DAYS] };
    case 'progress':
      // 23日やり切って、3日前に1回休んだ。今日は1件済み(撮影で「途中」と分かる値にする)
      return {
        past: [...repeat('done', 21), 'rest', ...repeat('done', 2)],
        todayDone: 1,
        celebrated: MILESTONE_DAYS.filter((day) => day <= 23),
      };
    case 'restart':
      // 10日やり切った後に3日続けて休んだ → 昨日で数え直し
      return { past: [...repeat('done', 10), ...repeat('rest', 3)], todayDone: 0, celebrated: [7] };
    default: {
      // milestone-N: 昨日までに N-1 日、今日やり切って N 日目
      const day = Number(kind.split('-')[1]);
      return {
        past: repeat('done', day - 1),
        todayDone: routineCount,
        celebrated: MILESTONE_DAYS.filter((milestone) => milestone < day),
      };
    }
  }
}

/**
 * 状態を差し替える。
 * @param options.force 起動引数から呼ぶとき。毎回差し替える(再読み込みしないので繰り返しにならない)
 * @returns 差し替えたら true。同じ種類を差し替え済みなら何もせず false
 *   ⚠ 再読み込み後も同じ URL が残るため、URL から呼ぶときは false を返さないと再読み込みが止まらない
 */
export async function seedDemo(kind: DemoKind, options: { force?: boolean } = {}): Promise<boolean> {
  if (!options.force && (await getDevSeedForDevelopment()) === kind) return false;

  const demo = DEMO[language];
  const routineIds = demo.routines.map((routine) => routine.id);
  const plan = planFor(kind, routineIds.length);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - plan.past.length);
  const startedOn = toDateKey(start);

  const routines: RoutineItem[] = demo.routines.map((routine) => ({
    ...routine,
    createdAt: start.toISOString(),
  }));

  const records: Record<string, DailyRecord> = {};
  const recordFor = (date: string, completedIds: string[]): DailyRecord => ({
    date,
    completedIds,
    totalCount: routineIds.length,
    excludedIds: [],
  });
  plan.past.forEach((day, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = toDateKey(date);
    records[key] = recordFor(key, day === 'done' ? routineIds : []);
  });
  const today = toDateKey(new Date());
  records[today] = recordFor(today, routineIds.slice(0, plan.todayDone));

  // すでに書いた言葉があれば残す。無ければデモ用の1件を置く
  const existing = await getMessages();
  const messages: KatsuMessage[] = existing.length
    ? existing
    : [{ id: 'demo-word', text: demo.word }];

  // graduatedAt を空にして、卒業した状態なら Today で卒業画面が出るようにする
  const appState: AppState = {
    startedOn,
    onboardedAt: startedOn,
    celebratedMilestones: plan.celebrated,
  };

  await replaceAllForDevelopment({ routines, records, messages, appState }, kind);
  return true;
}
