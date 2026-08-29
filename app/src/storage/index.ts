/**
 * 永続化レイヤ。端末内で完結する(spec §4: バックエンドなし)。
 *
 * ⚠ AsyncStorage への読み書きは、必ずこのファイルを通すこと。
 *   画面から直接 AsyncStorage を触らない。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { MESSAGE_MAX_LENGTH } from '@/constants/messages';
import { MAX_ROUTINES } from '@/constants/routines';
import { normalizeTime, todayKey, toTimeKey } from '@/lib/date';
import { containsSelfHarmText } from '@/lib/self-harm-guard';
import { countChars } from '@/lib/text';
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

export async function markGraduated(dateKey: string = todayKey()): Promise<void> {
  await patchAppState({ graduatedAt: dateKey });
}

export async function markOnboarded(dateKey: string = todayKey()): Promise<void> {
  await patchAppState({ onboardedAt: dateKey });
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

  const date = todayKey();
  const appState = await getAppState();
  const startedOn = appState.startedOn ?? date;
  if (!appState.startedOn) await patchAppState({ startedOn: date });

  // Day 1 に限り、登録した時点で既に時刻が過ぎている項目を分母から外す
  // (22時にインストールした人の「07:00 起きる」が確実に未達成になるのを防ぐ)。
  // ⚠ 判定はこの1回だけ。結果を DailyRecord に永続化し、以後は再計算しない。
  //   Day 1 中に時刻を編集しても除外は覆らない(spec §2 判定の細部)。
  if (date === startedOn && time < toTimeKey(new Date())) {
    await excludeFromToday(routine.id);
  }

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
export async function getTodayRecord(): Promise<DailyRecord> {
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

export async function getDailyRecord(date: string): Promise<DailyRecord | undefined> {
  const records = await readJson<RecordMap>(KEYS.records, {});
  return records[date];
}

/**
 * 日付キー -> 記録 の全体。
 * 卒業判定は30日分をまとめて見るため、1日ずつ読むと同じキーを30回読むことになる。
 */
export async function getDailyRecords(): Promise<Record<string, DailyRecord>> {
  return readJson<RecordMap>(KEYS.records, {});
}

/**
 * 今日のチェックを付け外しする。
 * チェックした時刻は記録しない(spec §2: その日のうちなら何時でも達成)。
 * 分母から外していた項目にチェックが付いたら、その項目は分母にも入る。
 */
export async function toggleCompletion(routineId: string): Promise<DailyRecord> {
  const [today, routines] = await Promise.all([getTodayRecord(), getRoutines()]);
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

export async function saveMessages(messages: KatsuMessage[]): Promise<void> {
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

export async function addMessage(text: string): Promise<KatsuMessage> {
  const trimmed = assertSavable(text);
  const message: KatsuMessage = { id: createId(), text: trimmed };
  await saveMessages([...(await getMessages()), message]);
  return message;
}

export async function updateMessage(id: string, text: string): Promise<void> {
  const trimmed = assertSavable(text);
  const messages = await getMessages();
  await saveMessages(
    messages.map((message) => (message.id === id ? { ...message, text: trimmed } : message)),
  );
}

export async function deleteMessage(id: string): Promise<void> {
  const messages = await getMessages();
  await saveMessages(messages.filter((message) => message.id !== id));
}
