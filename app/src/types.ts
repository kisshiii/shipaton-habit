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
  /**
   * Day 1 で分母から外すと確定した項目(登録時に時刻が既に過ぎていたもの)。
   * 判定は登録時の1回だけで、以後は再計算しない(spec §2 判定の細部)。
   * Day 2 以降は常に空。
   */
  excludedIds?: string[];
};

export type KatsuMessage = {
  id: string;
  text: string;
  routineId?: string; // 有料のみ。未指定なら全ルーティン共通
};

export type AppState = {
  startedOn?: string; // 最初のルーティンを保存した日 = Day 1
  graduatedAt?: string; // 卒業モーダルを表示済みなら記録(再表示しない)
  /**
   * ルーティンを変えた日(追加・削除・名前の変更)。その日が卒業の数え直しの起点になる(plan §1)。
   * ⚠ 最後の1つだけにしないこと。卒業日は保存せず記録から毎回出すので、
   *   卒業した後の変更で卒業日が消える。同じ日は1つにまとめる。
   * 1.0.2 より前の変更は残っていない(更新前の変更では数え直さない)。
   */
  routineChangedOn?: string[];
  /**
   * オンボーディングを終えた日。
   * ⚠ `startedOn` で代用しないこと。全ルーティンを消した人にオンボーディングを
   *   やり直させることになる。
   */
  onboardedAt?: string;
};
