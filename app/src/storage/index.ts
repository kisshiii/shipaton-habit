/**
 * 永続化レイヤ。端末内で完結する(spec §4: バックエンドなし)。
 *
 * ⚠ AsyncStorage への読み書きは、必ずこのファイルを通すこと。
 *   画面から直接 AsyncStorage を触らない。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { MESSAGE_MAX_LENGTH } from '@/constants/messages';
import { MAX_ROUTINES } from '@/constants/routines';
import { normalizeTime, toDateKey, todayKey, toTimeKey } from '@/lib/date';
import { containsSelfHarmText } from '@/lib/self-harm-guard';
import { countChars } from '@/lib/text';
import type { AppState, DailyRecord, KatsuMessage, RoutineItem } from '@/types';

const KEYS = {
  routines: 'katsu.routines',
  records: 'katsu.records',
  messages: 'katsu.messages',
  appState: 'katsu.appState',
  /** ⚠ 開発・撮影用ビルドだけが書く。最後に差し替えたデモ状態の種類 */
  devSeed: 'katsu.devSeed',
} as const;

/** 日付キー -> その日の記録 */
type RecordMap = Record<string, DailyRecord>;

export class RoutineLimitError extends Error {
  constructor() {
    super(`Routine limit reached (${MAX_ROUTINES})`);
    this.name = 'RoutineLimitError';
  }
}

/**
 * Tier 1 ハードストップ。自傷・希死念慮に類する文言は保存させない(spec §2)。
 * ⚠ 検知した事実も、弾いた文言も、記録・送信しない。message に本文を入れないこと。
 */
export class SelfHarmTextError extends Error {
  constructor() {
    super('Blocked by the Tier 1 guard');
    this.name = 'SelfHarmTextError';
  }
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // 壊れた値は握りつぶして初期値に戻す。ユーザーが書いた文言はログに出さない。
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function createId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function byTime(a: RoutineItem, b: RoutineItem): number {
  // "HH:MM" はゼロ埋め済みなので辞書順で時系列になる
  if (a.time !== b.time) return a.time < b.time ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : 1;
}

// --- AppState ---------------------------------------------------------------

export async function getAppState(): Promise<AppState> {
  return readJson<AppState>(KEYS.appState, {});
}

async function patchAppState(patch: Partial<AppState>): Promise<AppState> {
  const next = { ...(await getAppState()), ...patch };
  await writeJson(KEYS.appState, next);
  return next;
}

async function markGraduatedUnlocked(dateKey: string = todayKey()): Promise<void> {
  await patchAppState({ graduatedAt: dateKey });
}

/**
 * Day 1 を選んだ日にする(オンボーディングの「いつから始めるか」。plan §8)。
 * ⚠ オンボーディングからだけ呼ぶ。始めた後に動かすと、数えた日がずれる
 */
async function setStartedOnForOnboardingUnlocked(dateKey: string): Promise<void> {
  await patchAppState({ startedOn: dateKey });
}

async function markOnboardedUnlocked(dateKey: string = todayKey()): Promise<void> {
  await patchAppState({ onboardedAt: dateKey });
}

/** 節目のお祝いを出したことを残す。それより小さい節目もまとめて済みにする */
async function markMilestonesCelebratedUnlocked(days: readonly number[]): Promise<void> {
  const celebrated = new Set([...((await getAppState()).celebratedMilestones ?? []), ...days]);
  await patchAppState({ celebratedMilestones: [...celebrated].sort((a, b) => a - b) });
}

/**
 * 今日 Today を開いたことを残し、今日初めてかどうかを返す(plan §8 その日最初の一言)。
 */
async function markOpenedTodayUnlocked(dateKey: string = todayKey()): Promise<boolean> {
  const isFirst = (await getAppState()).lastOpenedOn !== dateKey;
  if (isFirst) await patchAppState({ lastOpenedOn: dateKey });
  return isFirst;
}

/** 評価を頼んだことを残す。二度と自分からは頼まない(plan §7-3) */
async function markReviewRequestedUnlocked(dateKey: string = todayKey()): Promise<void> {
  await patchAppState({ reviewRequestedAt: dateKey });
}

/** 休みによる数え直しのお知らせを出したことを残す */
async function markRestartNoticeShownUnlocked(restartOn: string): Promise<void> {
  await patchAppState({ restartNoticeShownFor: restartOn });
}

/**
 * ルーティンを変えた日を残す。卒業の数え直しの起点になる(plan §1)。
 * 追加・削除・名前の変更で呼ぶ。時刻の変更では呼ばない。
 */
async function markRoutineChanged(dateKey: string = todayKey()): Promise<void> {
  const changedOn = (await getAppState()).routineChangedOn ?? [];
  if (changedOn.includes(dateKey)) return;
  await patchAppState({ routineChangedOn: [...changedOn, dateKey] });
}

/**
 * ⚠ **開発・撮影用ビルド専用。**卒業画面や節目を確かめる・ストア用に撮るために、保存内容を丸ごと差し替える。
 *   呼び出し側は `if (__DEV__ || EXPO_PUBLIC_KATSU_DEV_TOOLS)` の中からしか呼ばない。ここでも本番では拒否する。
 */
async function replaceAllForDevelopmentUnlocked(
  snapshot: {
    routines: RoutineItem[];
    records: RecordMap;
    messages: KatsuMessage[];
    appState: AppState;
  },
  seed: string,
): Promise<void> {
  if (!(__DEV__ || process.env.EXPO_PUBLIC_KATSU_DEV_TOOLS === '1')) {
    throw new Error('replaceAllForDevelopment is development only');
  }
  await writeJson(KEYS.routines, snapshot.routines);
  await writeJson(KEYS.records, snapshot.records);
  await writeJson(KEYS.messages, snapshot.messages);
  await writeJson(KEYS.appState, snapshot.appState);
  await writeJson(KEYS.devSeed, seed);
}

/** 最後に差し替えたデモ状態の種類。開発・撮影用ビルドでしか書かれない */
export async function getDevSeedForDevelopment(): Promise<string | null> {
  return readJson<string | null>(KEYS.devSeed, null);
}

// --- Routines ---------------------------------------------------------------

/** 時刻順に並べて返す */
export async function getRoutines(): Promise<RoutineItem[]> {
  const routines = await readJson<RoutineItem[]>(KEYS.routines, []);
  return [...routines].sort(byTime);
}

async function saveRoutines(routines: RoutineItem[]): Promise<void> {
  await writeJson(KEYS.routines, [...routines].sort(byTime));
}

/**
 * ルーティンを1件追加する。
 * 最初の1件を保存した日を Day 1 (`startedOn`) として記録する。
 * 2件目以降は、卒業の数え直しの起点として追加した日を残す(plan §1)。
 * 上限に達している場合は RoutineLimitError を投げる。
 */
async function addRoutineUnlocked(input: {
  time: string;
  title: string;
}): Promise<RoutineItem> {
  const time = normalizeTime(input.time);
  if (!time) throw new Error('Invalid time');
  const title = input.title.trim();
  if (!title) throw new Error('Empty title');

  const routines = await getRoutines();
  if (routines.length >= MAX_ROUTINES) throw new RoutineLimitError();

  const routine: RoutineItem = {
    id: createId(),
    time,
    title,
    createdAt: new Date().toISOString(),
  };
  await saveRoutines([...routines, routine]);

  const date = todayKey();
  const appState = await getAppState();
  if (appState.startedOn) {
    await markRoutineChanged(date);
  } else {
    // ⚠ 新しく始めた人は、節目を空で持たせる。undefined のままだと、最初の判定が
    //   「1.0.2 から更新した人」と同じ扱いになり、1日目のお祝いを黙って済みにしてしまう
    await patchAppState({ startedOn: date, celebratedMilestones: appState.celebratedMilestones ?? [] });
  }

  // 追加した日は Day 1 か、数え直しの起点(どちらも数え始めの日)。
  // 登録した時点で既に時刻が過ぎている項目は、その日に限り分母から外す
  // (22時に足した「07:00 起きる」で、その日が確実に休みになるのを防ぐ)。
  // ⚠ 判定はこの1回だけ。結果を DailyRecord に永続化し、以後は再計算しない。
  //   その日のうちに時刻を編集しても除外は覆らない(spec §2 判定の細部)。
  if (time < toTimeKey(new Date())) {
    await excludeFromToday(routine.id);
  }

  // 今日の分母を追従させる
  await getTodayRecordUnlocked();
  return routine;
}

async function updateRoutineUnlocked(
  id: string,
  patch: { time?: string; title?: string },
): Promise<void> {
  const routines = await getRoutines();
  const target = routines.find((routine) => routine.id === id);
  if (!target) return;

  if (patch.time !== undefined) {
    const time = normalizeTime(patch.time);
    if (!time) throw new Error('Invalid time');
    target.time = time;
  }
  // 名前・時刻の変更では数え直さない(2026-11-10 に変更。plan §10)。
  // 「ランニング」を「靴を履く」に小さく直すのは習慣づくりで一番大事な直しで、それを罰しない。
  // 数え直すのは追加と削除だけ
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('Empty title');
    target.title = title;
  }
  await saveRoutines(routines);
}

/**
 * ルーティンを削除する。
 * 今日の記録からもチェック状態を落とし、分母を引き直す。
 * 過去日の記録は再計算しない(spec §2: 分母は固定)。
 * 削除した日を、卒業の数え直しの起点として残す(plan §1)。
 */
async function deleteRoutineUnlocked(id: string): Promise<void> {
  const routines = await getRoutines();
  if (!routines.some((routine) => routine.id === id)) return;
  await saveRoutines(routines.filter((routine) => routine.id !== id));
  await markRoutineChanged();

  // ⚠ そのルーティン専用にしていた言葉を消さない。全ルーティン共通に戻すだけ。
  //   消すと「書いた言葉を消さない」(spec §2 課金が切れたとき)と同じ一線を越える。
  //   放置すると届く先を失ったまま残るので、戻すのが正しい。
  const messages = await getMessages();
  if (messages.some((message) => message.routineId === id)) {
    await saveMessages(
      messages.map((message) =>
        message.routineId === id ? { ...message, routineId: undefined } : message,
      ),
    );
  }

  const date = todayKey();
  const records = await readJson<RecordMap>(KEYS.records, {});
  const today = records[date];
  if (today) {
    // ⚠ 分母から外した印も消す。残すと、全部消した日が「外した項目がある日」=やり切った日に見える
    records[date] = {
      ...today,
      completedIds: today.completedIds.filter((completedId) => completedId !== id),
      excludedIds: (today.excludedIds ?? []).filter((excludedId) => excludedId !== id),
    };
    await writeJson(KEYS.records, records);
  }
  await getTodayRecordUnlocked();
}

// --- DailyRecord ------------------------------------------------------------

/**
 * その日の分母に数えるルーティンの ID。
 *
 * Day 1 に分母から外した項目でも、チェックが付いていれば数える。
 * `[x]` が付いているのに数字が増えないのは矛盾であり、
 * 遅れてやった人を罰しないという完了判定の思想とも合わない(spec §2 判定の細部)。
 */
function countedIdsIn(routines: RoutineItem[], record: DailyRecord): string[] {
  const excluded = new Set(record.excludedIds ?? []);
  return routines
    .filter((routine) => !excluded.has(routine.id) || record.completedIds.includes(routine.id))
    .map((routine) => routine.id);
}

/** Day 1 の分母から外すと確定した項目を今日の記録に書き込む。判定済みなら何もしない。 */
async function excludeFromToday(routineId: string): Promise<void> {
  const date = todayKey();
  const records = await readJson<RecordMap>(KEYS.records, {});
  const current: DailyRecord = records[date] ?? {
    date,
    completedIds: [],
    totalCount: 0,
    excludedIds: [],
  };
  const excludedIds = current.excludedIds ?? [];
  if (excludedIds.includes(routineId)) return;

  records[date] = { ...current, excludedIds: [...excludedIds, routineId] };
  await writeJson(KEYS.records, records);
}

/**
 * 今日の記録を返す。存在しなければ作る。
 * 呼ぶたびに今日の分母だけを現在のルーティン数に追従させる。
 * 過去日は触らない。除外判定(`excludedIds`)はここでは作らない
 * ── 確定するのは登録時の1回だけ(`addRoutine`)。
 */
async function getTodayRecordUnlocked(): Promise<DailyRecord> {
  const date = todayKey();
  const [routines, records] = await Promise.all([
    getRoutines(),
    readJson<RecordMap>(KEYS.records, {}),
  ]);

  const current = records[date];
  const base: DailyRecord = {
    date,
    completedIds: current?.completedIds ?? [],
    totalCount: current?.totalCount ?? 0,
    excludedIds: current?.excludedIds ?? [],
  };
  const next: DailyRecord = { ...base, totalCount: countedIdsIn(routines, base).length };

  if (!current || current.totalCount !== next.totalCount) {
    records[date] = next;
    await writeJson(KEYS.records, records);
  }
  return next;
}

/**
 * 日付キー -> 記録 の全体。
 *
 * ⚠ 1日ずつ読む API は置かない。記録は1つのキーにまとまって入っているので、
 *   日付ごとに呼ぶと同じ JSON を何度もパースすることになる。
 *   卒業判定は Day 1 から今日までの全期間、通知の予約は7日分をまとめて見る。
 */
export async function getDailyRecords(): Promise<Record<string, DailyRecord>> {
  return readJson<RecordMap>(KEYS.records, {});
}

/**
 * 今日のチェックを付ける(付いていれば何もしない)。通知の「やった ✓」から呼ぶ。
 * ⚠ 付け外しではない。通知を2回押しても外れないようにする
 */
async function markCompletedTodayUnlocked(routineId: string): Promise<void> {
  const [today, routines] = await Promise.all([getTodayRecordUnlocked(), getRoutines()]);
  if (today.completedIds.includes(routineId)) return;
  if (!routines.some((routine) => routine.id === routineId)) return;
  const base: DailyRecord = { ...today, completedIds: [...today.completedIds, routineId] };
  const records = await readJson<RecordMap>(KEYS.records, {});
  records[base.date] = { ...base, totalCount: countedIdsIn(routines, base).length };
  await writeJson(KEYS.records, records);
}

/**
 * ウィジェットで押したチェックを、**押した日**の記録に付ける(付けるだけ。外さない)。付けた件数を返す。
 *
 * その日に一度もアプリを開かなかった人の分を、次に開いたときに移すため(2026-11-03 に決定。spec §2)。
 * ⚠ 本人が過去日を直す手段ではない。ウィジェットは押したその日の表示でしか押せない
 *   (`katsu-progress.tsx` の check())。その日のうちに押した記録を、あとから写すだけ。
 * - 今日なら `markCompletedToday` と同じ。先の日は何もしない
 * - その日の記録があれば分母は変えない(過去日は再計算しない)。ただし分母から外していた項目に
 *   付いたら、今日と同じく分母に入れる
 * - 記録が無ければ(その日アプリを開かなかった)、その日にあったルーティンで分母を作る。
 *   開かなければルーティンは変えられないので、今のルーティンのうちその日までに作ったものが、その日の分
 */
async function markCompletedOnDayUnlocked(date: string, routineIds: string[]): Promise<number> {
  const today = todayKey();
  if (date > today) return 0;
  if (date === today) {
    const before = (await getTodayRecordUnlocked()).completedIds.length;
    for (const id of routineIds) await markCompletedTodayUnlocked(id);
    return (await getTodayRecordUnlocked()).completedIds.length - before;
  }

  const [routines, records] = await Promise.all([getRoutines(), readJson<RecordMap>(KEYS.records, {})]);
  const onThatDay = routines.filter((routine) => toDateKey(new Date(routine.createdAt)) <= date);
  const current = records[date];
  const additions = routineIds.filter(
    (id, index) =>
      routineIds.indexOf(id) === index &&
      onThatDay.some((routine) => routine.id === id) &&
      !(current?.completedIds.includes(id) ?? false),
  );
  if (additions.length === 0) return 0;

  if (current) {
    const excluded = new Set(current.excludedIds ?? []);
    records[date] = {
      ...current,
      completedIds: [...current.completedIds, ...additions],
      totalCount: current.totalCount + additions.filter((id) => excluded.has(id)).length,
    };
  } else {
    records[date] = { date, completedIds: additions, totalCount: onThatDay.length, excludedIds: [] };
  }
  await writeJson(KEYS.records, records);
  return additions.length;
}

/**
 * 今日のチェックを付け外しする。
 * チェックした時刻は記録しない(spec §2: その日のうちなら何時でも達成)。
 * 分母から外していた項目にチェックが付いたら、その項目は分母にも入る。
 */
async function toggleCompletionUnlocked(routineId: string): Promise<DailyRecord> {
  const [today, routines] = await Promise.all([getTodayRecordUnlocked(), getRoutines()]);
  const isCompleted = today.completedIds.includes(routineId);
  const base: DailyRecord = {
    ...today,
    completedIds: isCompleted
      ? today.completedIds.filter((id) => id !== routineId)
      : [...today.completedIds, routineId],
  };
  const next: DailyRecord = { ...base, totalCount: countedIdsIn(routines, base).length };

  const records = await readJson<RecordMap>(KEYS.records, {});
  records[next.date] = next;
  await writeJson(KEYS.records, records);
  return next;
}

// --- KatsuMessage -----------------------------------------------------------

export async function getMessages(): Promise<KatsuMessage[]> {
  return readJson<KatsuMessage[]>(KEYS.messages, []);
}

async function saveMessages(messages: KatsuMessage[]): Promise<void> {
  await writeJson(KEYS.messages, messages);
}

/**
 * Tier 1 の関門。保存経路をここ1本に絞っておく。
 * ⚠ 無料/有料の件数制限はここでは見ない。課金が切れても書いたものを消さないため、
 *   保持できる件数と、書き足せる件数は別物(spec §2 課金が切れたとき)。
 */
function assertSavable(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty message');
  // 入力側で切り詰め済み。ここに来たら不具合なので、黙って切らずに落とす
  if (countChars(trimmed) > MESSAGE_MAX_LENGTH) throw new Error('Message too long');
  if (containsSelfHarmText(trimmed)) throw new SelfHarmTextError();
  return trimmed;
}

async function addMessageUnlocked(text: string): Promise<KatsuMessage> {
  const trimmed = assertSavable(text);
  const message: KatsuMessage = { id: createId(), text: trimmed };
  await saveMessages([...(await getMessages()), message]);
  return message;
}

/**
 * 言葉を出すルーティンを決める(課金機会③)。`undefined` で全ルーティン共通に戻す。
 *
 * ⚠ 本文を触らないので Tier 1 の再検査は走らせない。
 *   保存済みの本文は入力時に一度通っている(spec §4「再検査は入力時のみで足りる」)。
 */
async function setMessageRoutineUnlocked(id: string, routineId?: string): Promise<void> {
  const messages = await getMessages();
  await saveMessages(
    messages.map((message) => (message.id === id ? { ...message, routineId } : message)),
  );
}

async function updateMessageUnlocked(id: string, text: string): Promise<void> {
  const trimmed = assertSavable(text);
  const messages = await getMessages();
  await saveMessages(
    messages.map((message) => (message.id === id ? { ...message, text: trimmed } : message)),
  );
}

async function deleteMessageUnlocked(id: string): Promise<void> {
  const messages = await getMessages();
  await saveMessages(messages.filter((message) => message.id !== id));
}

// --- 書き込みの順番 -----------------------------------------------------------

/**
 * ⚠ **書き込みはすべてこの列に並べる。**保存は「全体を読む → 直す → 全体を書く」なので、
 *   2つが同時に走ると、後から書いた方が先の変更を消す(2026-10-31 のレビューで発覚。
 *   2つ続けてチェックすると1つ目が消える、通知の「やった」とクイックアクションが重なる、など)。
 *   読むだけの関数(get〜)は並べない。並べた関数の中から、並べた関数を呼ばないこと(止まる)。
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(work, work);
  writeQueue = run.catch(() => undefined);
  return run;
}

export function markGraduated(...args: Parameters<typeof markGraduatedUnlocked>): ReturnType<typeof markGraduatedUnlocked> {
  return serialized(() => markGraduatedUnlocked(...args)) as ReturnType<typeof markGraduatedUnlocked>;
}
export function setStartedOnForOnboarding(...args: Parameters<typeof setStartedOnForOnboardingUnlocked>): ReturnType<typeof setStartedOnForOnboardingUnlocked> {
  return serialized(() => setStartedOnForOnboardingUnlocked(...args)) as ReturnType<typeof setStartedOnForOnboardingUnlocked>;
}
export function markOnboarded(...args: Parameters<typeof markOnboardedUnlocked>): ReturnType<typeof markOnboardedUnlocked> {
  return serialized(() => markOnboardedUnlocked(...args)) as ReturnType<typeof markOnboardedUnlocked>;
}
export function markMilestonesCelebrated(...args: Parameters<typeof markMilestonesCelebratedUnlocked>): ReturnType<typeof markMilestonesCelebratedUnlocked> {
  return serialized(() => markMilestonesCelebratedUnlocked(...args)) as ReturnType<typeof markMilestonesCelebratedUnlocked>;
}
export function markOpenedToday(...args: Parameters<typeof markOpenedTodayUnlocked>): ReturnType<typeof markOpenedTodayUnlocked> {
  return serialized(() => markOpenedTodayUnlocked(...args)) as ReturnType<typeof markOpenedTodayUnlocked>;
}
export function markReviewRequested(...args: Parameters<typeof markReviewRequestedUnlocked>): ReturnType<typeof markReviewRequestedUnlocked> {
  return serialized(() => markReviewRequestedUnlocked(...args)) as ReturnType<typeof markReviewRequestedUnlocked>;
}
export function markRestartNoticeShown(...args: Parameters<typeof markRestartNoticeShownUnlocked>): ReturnType<typeof markRestartNoticeShownUnlocked> {
  return serialized(() => markRestartNoticeShownUnlocked(...args)) as ReturnType<typeof markRestartNoticeShownUnlocked>;
}
export function replaceAllForDevelopment(...args: Parameters<typeof replaceAllForDevelopmentUnlocked>): ReturnType<typeof replaceAllForDevelopmentUnlocked> {
  return serialized(() => replaceAllForDevelopmentUnlocked(...args)) as ReturnType<typeof replaceAllForDevelopmentUnlocked>;
}
export function addRoutine(...args: Parameters<typeof addRoutineUnlocked>): ReturnType<typeof addRoutineUnlocked> {
  return serialized(() => addRoutineUnlocked(...args)) as ReturnType<typeof addRoutineUnlocked>;
}
export function updateRoutine(...args: Parameters<typeof updateRoutineUnlocked>): ReturnType<typeof updateRoutineUnlocked> {
  return serialized(() => updateRoutineUnlocked(...args)) as ReturnType<typeof updateRoutineUnlocked>;
}
export function deleteRoutine(...args: Parameters<typeof deleteRoutineUnlocked>): ReturnType<typeof deleteRoutineUnlocked> {
  return serialized(() => deleteRoutineUnlocked(...args)) as ReturnType<typeof deleteRoutineUnlocked>;
}
export function getTodayRecord(...args: Parameters<typeof getTodayRecordUnlocked>): ReturnType<typeof getTodayRecordUnlocked> {
  return serialized(() => getTodayRecordUnlocked(...args)) as ReturnType<typeof getTodayRecordUnlocked>;
}
export function markCompletedToday(...args: Parameters<typeof markCompletedTodayUnlocked>): ReturnType<typeof markCompletedTodayUnlocked> {
  return serialized(() => markCompletedTodayUnlocked(...args)) as ReturnType<typeof markCompletedTodayUnlocked>;
}
export function markCompletedOnDay(...args: Parameters<typeof markCompletedOnDayUnlocked>): ReturnType<typeof markCompletedOnDayUnlocked> {
  return serialized(() => markCompletedOnDayUnlocked(...args)) as ReturnType<typeof markCompletedOnDayUnlocked>;
}
export function toggleCompletion(...args: Parameters<typeof toggleCompletionUnlocked>): ReturnType<typeof toggleCompletionUnlocked> {
  return serialized(() => toggleCompletionUnlocked(...args)) as ReturnType<typeof toggleCompletionUnlocked>;
}
export function addMessage(...args: Parameters<typeof addMessageUnlocked>): ReturnType<typeof addMessageUnlocked> {
  return serialized(() => addMessageUnlocked(...args)) as ReturnType<typeof addMessageUnlocked>;
}
export function setMessageRoutine(...args: Parameters<typeof setMessageRoutineUnlocked>): ReturnType<typeof setMessageRoutineUnlocked> {
  return serialized(() => setMessageRoutineUnlocked(...args)) as ReturnType<typeof setMessageRoutineUnlocked>;
}
export function updateMessage(...args: Parameters<typeof updateMessageUnlocked>): ReturnType<typeof updateMessageUnlocked> {
  return serialized(() => updateMessageUnlocked(...args)) as ReturnType<typeof updateMessageUnlocked>;
}
export function deleteMessage(...args: Parameters<typeof deleteMessageUnlocked>): ReturnType<typeof deleteMessageUnlocked> {
  return serialized(() => deleteMessageUnlocked(...args)) as ReturnType<typeof deleteMessageUnlocked>;
}
