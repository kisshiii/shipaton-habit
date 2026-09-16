/**
 * ⚠ **開発ビルド専用。App Store 版には入らない。**
 *
 * 卒業は「連続66日」なので、実際に66日待たないと卒業画面と証書が出ない。
 * 見た目の確認とデモ動画の撮影のために、66日分をやり切った状態を作る。
 *
 * 使い方(開発ビルドを起動した状態で):
 *   シミュレーター: xcrun simctl openurl booted "app:///?katsu-dev-seed=graduation"
 *   実機: Safari などで同じ URL を開く
 * → 状態を差し替えてアプリを再読み込みし、Today で卒業画面が開く。
 *
 * ⚠ 読み込みは `_layout.tsx` の `if (__DEV__) { require(...) }` からだけ行う。
 *   本番ビルドではそのブロックごと消えるので、このファイルもバンドルに入らない。
 */

import { GRADUATION_STREAK_DAYS } from '@/constants/graduation';
import { language } from '@/i18n';
import { toDateKey } from '@/lib/date';
import { getAppState, getMessages, getRoutines, replaceAllForDevelopment } from '@/storage';
import type { DailyRecord, KatsuMessage, RoutineItem } from '@/types';

/** URL のクエリ名。`?katsu-dev-seed=graduation` */
export const DEV_SEED_QUERY = 'katsu-dev-seed';

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

/**
 * 66日前を Day 1 とし、昨日までの66日を全部やり切った状態にする。今日はまだ手を付けていない。
 * @returns 差し替えたら true。すでにデモ状態で卒業画面が未表示なら何もせず false
 *   ⚠ 再読み込み後も同じ URL が残るため、false を返さないと再読み込みが止まらない
 */
export async function seedGraduationDemo(): Promise<boolean> {
  const [routines, appState] = await Promise.all([getRoutines(), getAppState()]);
  const isSeeded = routines.some((routine) => routine.id === 'demo-run');
  if (isSeeded && !appState.graduatedAt) return false;

  const demo = DEMO[language];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - GRADUATION_STREAK_DAYS);
  const startedOn = toDateKey(start);

  const demoRoutines: RoutineItem[] = demo.routines.map((routine) => ({
    ...routine,
    createdAt: start.toISOString(),
  }));
  const ids = demoRoutines.map((routine) => routine.id);

  const records: Record<string, DailyRecord> = {};
  for (let offset = 0; offset < GRADUATION_STREAK_DAYS; offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    const date = toDateKey(day);
    records[date] = { date, completedIds: ids, totalCount: ids.length, excludedIds: [] };
  }

  // すでに書いた言葉があれば残す。無ければデモ用の1件を置く
  const existing = await getMessages();
  const messages: KatsuMessage[] = existing.length
    ? existing
    : [{ id: 'demo-word', text: demo.word }];

  await replaceAllForDevelopment({
    routines: demoRoutines,
    records,
    messages,
    // graduatedAt を空にして、Today で卒業画面が出るようにする
    appState: { startedOn, onboardedAt: startedOn },
  });
  return true;
}
