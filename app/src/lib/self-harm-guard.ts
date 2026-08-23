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
 * 目に見えないのに文字列を分断する文字。
 * ゼロ幅スペース類 / 単語結合子 / BOM / ソフトハイフン / モンゴル語母音区切り /
 * 異体字セレクタ(基本面と補助面)。
 *
 * ⚠ 除去と空白化のどちらか一方では足りない。`containsSelfHarmText` を読むこと。
 */
const INVISIBLE =
  /[\u200B-\u200D\u2060\uFEFF\u00AD\u180E\uFE00-\uFE0F]|[\u{E0100}-\u{E01EF}]/gu;

/**
 * 判定用の正規化。**保存する文字列は元のまま**(spec §2 入力テキストの安全な取り扱い-2)。
 *
 * ゼロ幅スペースや全角・異体字を挟むだけで静的判定は容易に回避できるため、
 * 照合の直前にここを通す。順序に意味がある:
 *
 * 1. NFKC ── 全角英数・互換文字を素の形に畳む(`ｋｉｌｌ` → `kill`)
 * 2. 不可視文字の処理 ── 4 で勝手に空白へ化けないよう、ここで決着させる
 * 3. 小文字化とアポストロフィ除去 ── `Don't` と `dont` を同じ形にする
 * 4. 記号を空白へ、連続空白を1つへ
 *
 * 日本語には空白がないため正規化後も1トークンのまま残る
 * (日本語は DIRECT_PHRASES の部分一致で拾う)。
 */
function normalize(text: string, invisibleAs: '' | ' '): string {
  return text
    .normalize('NFKC')
    .replace(INVISIBLE, invisibleAs)
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
 *
 * ⚠ 不可視文字は「詰めた形」と「空白にした形」の両方を見る。片方では抜ける:
 *   - `ki<ZWSP>ll myself` は詰めないと `kill` にならない
 *   - `kill<ZWSP>myself` は空白にしないと `kill myself` にならない
 *   両形とも実在の空白は動かさないので、これで誤検知が増えることはない。
 */
export function containsSelfHarmText(text: string): boolean {
  return matchesAny(normalize(text, '')) || matchesAny(normalize(text, ' '));
}

function matchesAny(normalized: string): boolean {
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
