/**
 * Tier 1 ハードストップ(spec §2 カスタムメッセージの安全設計)。
 *
 * 自傷・希死念慮に類する表現を静的な語句判定で検出する。AI もサーバーも使わない。
 * 誤検知は許容し、見逃しを避ける方向に倒す。
 *
 * ⚠ このアプリの核は「厳しい言葉」であることそのもの。
 *   ここで潰すのは "存在の否定" だけで、"行動を責める" 言葉には触れない。
 *
 * ⚠ 検知した事実を記録・送信しない。ログにも出さない(spec §2-6)。
 *   この関数は真偽値だけを返し、入力文字列をどこにも残さない。
 *
 * 判定リストは src/config/blocklist.ts に分離してある(.gitignore 済み)。
 */

import { DIRECT_PHRASES, HARM_TERMS, SELF_TARGETS } from '@/config/blocklist';

/** 一人称と自傷語が何語以内なら「自分に向けた表現」とみなすか */
const SELF_TARGET_DISTANCE = 4;

/** 活用を吸収するために許す接尾辞 */
const SUFFIXES = ['', 's', 'es', 'd', 'ed', 'ing'];

/**
 * 小文字化し、アポストロフィを落とし、記号を空白に潰す。
 * 日本語には空白がないため、正規化後も1トークンのまま残る
 * (日本語は DIRECT_PHRASES の部分一致で拾う)。
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** token が term の活用形かどうか */
function matchesTerm(token: string, term: string): boolean {
  if (!token.startsWith(term)) return false;
  return SUFFIXES.includes(token.slice(term.length));
}

/**
 * 自傷・希死念慮に類する表現を含むか。
 *
 * 判定は2段構え:
 * 1. それ単体で自傷を意味する表現(すでに一人称を含む)は部分一致で弾く
 * 2. 単体の自傷語は、一人称の対象語と近接したときだけ弾く
 *    → `kill it at the gym` は通り、`kill me` は止まる
 */
export function containsSelfHarmText(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized) return false;

  if (DIRECT_PHRASES.some((phrase) => normalized.includes(phrase))) return true;

  const tokens = normalized.split(' ');
  for (let i = 0; i < tokens.length; i += 1) {
    if (!HARM_TERMS.some((term) => matchesTerm(tokens[i], term))) continue;

    const from = Math.max(0, i - SELF_TARGET_DISTANCE);
    const to = Math.min(tokens.length, i + SELF_TARGET_DISTANCE + 1);
    for (let j = from; j < to; j += 1) {
      if (j !== i && SELF_TARGETS.includes(tokens[j])) return true;
    }
  }
  return false;
}
