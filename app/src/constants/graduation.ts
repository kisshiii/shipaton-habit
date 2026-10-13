/**
 * 卒業判定の定数。ロジック内に数値を直書きしないこと。
 *
 * 66日は習慣化の研究の中央値(Lally et al. 2010 / Singh et al. 2024、spec §8-2)。
 * ⚠ 「全員が66日で身につく」という意味ではない。個人差は数週間〜1年近くある。
 */

/** その日のルーティンを全部やり切った日を、この日数数えたら卒業(spec §2 卒業の扱い) */
export const GRADUATION_STREAK_DAYS = 66;

/** 休みを数える期間。その日を含む直近のこの日数 */
export const REST_WINDOW_DAYS = 7;

/** その期間で使える休みの回数。これを超えたら(3回目の休みで)数え直す */
export const MAX_REST_DAYS = 2;

/**
 * 節目のお祝いを出す日数(やり切った日の数)。それぞれ一生に1回だけ(plan §4)。
 * 33 は66日の折り返し。
 */
export const MILESTONE_DAYS = [7, 33, 50] as const;
