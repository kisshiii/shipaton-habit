/**
 * RevenueCat の識別子。
 *
 * ⚠ 公開APIキー(`appl_` で始まるもの)はクライアント埋め込み前提なので
 *   リポジトリに入って構わない。**Secret Key(`sk_`)は絶対に置かないこと。**
 *   キーは `app.json` の `extra.revenueCatApiKey` に置き、ここから読む。
 *
 * ⚠ 製品ID(`gradhabit.monthly.tier1/2/3`)はここに持たない。
 *   どのパッケージを出すかは RevenueCat の Offering が決めるので、
 *   コードに並べると二重管理になり、ダッシュボードと静かにずれる。
 */

import Constants from 'expo-constants';

/** 有料機能をひとまとめにした entitlement の識別子(RevenueCat ダッシュボードの設定と一致させる) */
export const ENTITLEMENT_ID = 'pro';

/** 公開APIキー。未設定なら課金機能を無効にして、コア体験だけ動かす */
export function revenueCatApiKey(): string | undefined {
  const key = Constants.expoConfig?.extra?.revenueCatApiKey;
  return typeof key === 'string' && key.length > 0 ? key : undefined;
}
