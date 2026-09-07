/**
 * 課金(RevenueCat)。
 *
 * ⚠ **課金の障害でコア体験を止めないこと**(spec §4 障害時の要件)。
 *   Offerings が取れなくても、entitlement が確認できなくても、
 *   今日のチェックと通知は動き続けなければならない。
 *   そのため entitlement は**最後に確認できた状態をローカルにキャッシュ**して判定に使い、
 *   ネットワークが死んでいる間は「最後に分かっていたこと」で通す。
 *   止めるのはペイウォールの表示だけ。
 *
 * ⚠ 匿名 App User ID で動かす。アカウント機能は 1.0 に無い。
 *   復元は Apple ID 経由で成立する(spec §4)。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

import { ENTITLEMENT_ID, revenueCatApiKey } from '@/constants/purchases';

const CACHE_KEY = 'katsu.entitlement';

let isConfigured = false;

/**
 * SDK を初期化する。キーが無ければ何もしない。
 * キー未設定でもアプリが落ちないことが重要 ── 課金は後付けの層であって、前提ではない。
 */
export function configurePurchases(): void {
  if (isConfigured) return;
  const apiKey = revenueCatApiKey();
  if (!apiKey) return;
  Purchases.configure({ apiKey });
  isConfigured = true;
}

/** 最後に確認できた entitlement 状態。オフラインでもこれで判定する */
async function readCachedEntitlement(): Promise<boolean> {
  return (await AsyncStorage.getItem(CACHE_KEY)) === 'true';
}

/**
 * 通信せずに entitlement を読む。
 *
 * ⚠ 通知の予約は画面を開くたびに走るため、そのたびに RevenueCat を叩かせない。
 *   画面側が `isPro()` を呼んだ時点でキャッシュは更新されているので、ここは読むだけでよい。
 */
export async function isProCached(): Promise<boolean> {
  return readCachedEntitlement();
}

async function writeCachedEntitlement(isActive: boolean): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, isActive ? 'true' : 'false');
}

function hasEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/**
 * 有料機能が使えるか。
 *
 * 通信できなければキャッシュを返す。**失敗を「無課金」に倒さないこと。**
 * 電波の無い場所で課金者の機能が消えるのは、単なる不具合ではなく裏切りになる。
 */
export async function isPro(): Promise<boolean> {
  configurePurchases();
  if (!isConfigured) return false;

  try {
    const info = await Purchases.getCustomerInfo();
    const active = hasEntitlement(info);
    await writeCachedEntitlement(active);
    return active;
  } catch {
    return readCachedEntitlement();
  }
}

/**
 * ペイウォールに出す商品。取得できなければ null を返す。
 * ⚠ 呼び出し側は null を「後で再試行」として扱い、コア体験は止めないこと。
 */
export async function getOffering(): Promise<PurchasesOffering | null> {
  configurePurchases();
  if (!isConfigured) return null;

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'failed';

/** 購入する。ユーザーによるキャンセルは失敗として扱わない */
export async function purchase(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  configurePurchases();
  if (!isConfigured) return 'failed';

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = hasEntitlement(customerInfo);
    await writeCachedEntitlement(active);
    return active ? 'purchased' : 'failed';
  } catch (error) {
    // ⚠ 「やめた」を失敗扱いにしてエラーを出さない。ペイウォールをしつこくしない
    if ((error as { userCancelled?: boolean })?.userCancelled) return 'cancelled';
    return 'failed';
  }
}

export type RestoreOutcome = 'restored' | 'nothing' | 'failed';

/**
 * 復元。機種変更やアプリ削除からの復帰で使う。
 *
 * ⚠ 「復元するものが無かった」と「通信に失敗した」を同じ結果に潰さないこと。
 *   購入と違い、復元は**ユーザーが自分の意思で押したボタン**なので、
 *   黙って何も起きないと壊れているのと区別がつかない。呼び出し側で必ず結果を伝える。
 */
export async function restore(): Promise<RestoreOutcome> {
  configurePurchases();
  if (!isConfigured) return 'failed';

  try {
    const info = await Purchases.restorePurchases();
    const active = hasEntitlement(info);
    await writeCachedEntitlement(active);
    return active ? 'restored' : 'nothing';
  } catch {
    return 'failed';
  }
}

/**
 * Apple の購読管理画面へ送る。
 * ⚠ 開発者側から解約することはできない。できるのはここへ送ることまで。
 *   むしろユーザーが自分の手で解約ボタンを押すほうが、卒業の儀式として強い。
 */
export async function openManageSubscriptions(): Promise<void> {
  configurePurchases();
  if (!isConfigured) return;
  try {
    await Purchases.showManageSubscriptions();
  } catch {
    // 開けなくてもアプリは止めない
  }
}
