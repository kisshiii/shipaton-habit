/**
 * KATSU のデータモデル。CLAUDE.md の定義に一致させること。
 */

export type RoutineItem = {
  id: string;
  time: string; // "07:00"
  title: string;
  createdAt: string; // ISO
};

export type DailyRecord = {
  date: string; // "2026-08-13"
  completedIds: string[];
  totalCount: number; // その日終了時点のルーティン数(分母を固定するため)
};

export type KatsuMessage = {
  id: string;
  text: string;
  routineId?: string; // 有料のみ。未指定なら全ルーティン共通
};

export type AppState = {
  startedOn?: string; // 最初のルーティンを保存した日 = Day 1
  graduatedAt?: string; // 卒業モーダルを表示済みなら記録(再表示しない)
};
