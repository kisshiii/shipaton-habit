/**
 * RevenueCat の識別子。
 *
 * ⚠ 公開APIキー(`appl_` で始まるもの)はクライアント埋め込み前提なので
 *   リポジトリに入って構わない。**Secret Key(`sk_`)は絶対に置かないこと。**
 *   キーは `app.json` の `extra.revenueCatApiKey` に置き、ここから読む。
 *
 * ⚠ 製品IDに金額を入れないこと。IDは変更不可なので、値上げした瞬間に名前が嘘になる。
 */

import Constants from 'expo-constants';

/** 有料機能をひとまとめにした entitlement の識別子(RevenueCat ダッシュボードの設定と一致させる) */
export const ENTITLEMENT_ID = 'pro';

/**
 * 価格違いの月額3つ。中身は同じで、**いくらの価値があるかをユーザーに選ばせる**(spec §2)。
 * 表示順はこの配列の順。RevenueCat 側では1つの Offering に3パッケージを入れる。
 */
export const PRODUCT_IDS = [
  'gradhabit.monthly.tier1',
  'gradhabit.monthly.tier2',
  'gradhabit.monthly.tier3',
] as const;

/** 公開APIキー。未設定なら課金機能を無効にして、コア体験だけ動かす */
export function revenueCatApiKey(): string | undefined {
  const key = Constants.expoConfig?.extra?.revenueCatApiKey;
  return typeof key === 'string' && key.length > 0 ? key : undefined;
}
