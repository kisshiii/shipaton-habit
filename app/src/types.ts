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
   * お祝いを出した節目(`MILESTONE_DAYS`)。数え直して同じ日数に届いても、もう出さない。
   * ⚠ undefined は「1.0.2 でまだ一度も判定していない」の目印。そのとき越えている節目は
   *   出さずにここへ入れる(更新前に越えた節目を後から祝わない)
   */
  celebratedMilestones?: number[];
  /** 休みによる数え直しのお知らせを出した、その数え直しの日。同じ数え直しで二度出さない */
  restartNoticeShownFor?: string;
  /** 評価を頼んだ日。頼むのは一生に1回だけ(plan §7-3) */
  reviewRequestedAt?: string;
  /** 最後に Today を開いた日。その日最初に開いたときだけ昨日の一言を出す(plan §8) */
  lastOpenedOn?: string;
  /**
   * オンボーディングを終えた日。
   * ⚠ `startedOn` で代用しないこと。全ルーティンを消した人にオンボーディングを
   *   やり直させることになる。
   */
  onboardedAt?: string;
};
