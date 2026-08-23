/**
 * 文字数の数え方。
 *
 * ⚠ `String.length` は UTF-16 のコード単位を数えるため、絵文字や一部の漢字が
 *   2文字扱いになる。ユーザーから見た1文字と合わないので使わないこと。
 *   spec §2「文言の制約」で **コードポイント単位** と決めてある。
 */

/** ユーザーから見た文字数 */
export function countChars(text: string): number {
  return [...text].length;
}

/** コードポイント単位で切り詰める。サロゲートペアを割らない */
export function truncateChars(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : chars.slice(0, max).join('');
}
