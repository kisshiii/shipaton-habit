/**
 * 永続化レイヤ。端末内で完結する(spec §4: バックエンドなし)。
 *
 * ⚠ AsyncStorage への読み書きは、必ずこのファイルを通すこと。
 *   画面から直接 AsyncStorage を触らない。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { MAX_ROUTINES } from '@/constants/routines';
import { normalizeTime, todayKey, toTimeKey } from '@/lib/date';
import type { AppState, DailyRecord, KatsuMessage, RoutineItem } from '@/types';

const KEYS = {
  routines: 'katsu.routines',
  records: 'katsu.records',
  messages: 'katsu.messages',
  appState: 'katsu.appState',
} as const;

/** 日付キー -> その日の記録 */
type RecordMap = Record<string, DailyRecord>;

export class RoutineLimitError extends Error {
  constructor() {
    super(`Routine limit reached (${MAX_ROUTINES})`);
    this.name = 'RoutineLimitError';
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

export async function markGraduated(dateKey: string = todayKey()): Promise<void> {
  await patchAppState({ graduatedAt: dateKey });
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
 * 上限に達している場合は RoutineLimitError を投げる。
 */
export async function addRoutine(input: {
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

  const appState = await getAppState();
  if (!appState.startedOn) await patchAppState({ startedOn: todayKey() });

  // 今日の分母を追従させる
  await getTodayRecord();
  return routine;
}

export async function updateRoutine(
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
 */
export async function deleteRoutine(id: string): Promise<void> {
  const routines = await getRoutines();
  await saveRoutines(routines.filter((routine) => routine.id !== id));

  const date = todayKey();
  const records = await readJson<RecordMap>(KEYS.records, {});
  const today = records[date];
  if (today) {
    records[date] = {
      ...today,
      completedIds: today.completedIds.filter((completedId) => completedId !== id),
    };
    await writeJson(KEYS.records, records);
  }
  await getTodayRecord();
}

// --- DailyRecord ------------------------------------------------------------

/**
 * その日の分母。
 * Day 1 に限り、登録した時点で既に時刻が過ぎていた項目を分母から外す
 * (22時にインストールした人の「07:00 起きる」が確実に未達成になるのを防ぐ)。
 */
function denominatorFor(
  routines: RoutineItem[],
  date: string,
  startedOn: string | undefined,
): number {
  if (date !== startedOn) return routines.length;
  return routines.filter((routine) => {
    const createdTime = toTimeKey(new Date(routine.createdAt));
    return routine.time >= createdTime;
  }).length;
}

/**
 * 今日の記録を返す。存在しなければ作る。
 * 呼ぶたびに今日の分母だけを現在のルーティン数に追従させる。
 * 過去日は触らない。
 */
export async function getTodayRecord(): Promise<DailyRecord> {
  const date = todayKey();
  const [routines, appState, records] = await Promise.all([
    getRoutines(),
    getAppState(),
    readJson<RecordMap>(KEYS.records, {}),
  ]);

  const totalCount = denominatorFor(routines, date, appState.startedOn);
  const current = records[date];
  const next: DailyRecord = {
    date,
    completedIds: current?.completedIds ?? [],
    totalCount,
  };

  if (!current || current.totalCount !== totalCount) {
    records[date] = next;
    await writeJson(KEYS.records, records);
  }
  return next;
}

export async function getDailyRecord(date: string): Promise<DailyRecord | undefined> {
  const records = await readJson<RecordMap>(KEYS.records, {});
  return records[date];
}

/**
 * 今日のチェックを付け外しする。
 * チェックした時刻は記録しない(spec §2: その日のうちなら何時でも達成)。
 */
export async function toggleCompletion(routineId: string): Promise<DailyRecord> {
  const today = await getTodayRecord();
  const isCompleted = today.completedIds.includes(routineId);
  const next: DailyRecord = {
    ...today,
    completedIds: isCompleted
      ? today.completedIds.filter((id) => id !== routineId)
      : [...today.completedIds, routineId],
  };

  const records = await readJson<RecordMap>(KEYS.records, {});
  records[next.date] = next;
  await writeJson(KEYS.records, records);
  return next;
}

// --- KatsuMessage -----------------------------------------------------------

export async function getMessages(): Promise<KatsuMessage[]> {
  return readJson<KatsuMessage[]>(KEYS.messages, []);
}

export async function saveMessages(messages: KatsuMessage[]): Promise<void> {
  await writeJson(KEYS.messages, messages);
}
