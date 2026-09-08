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

export type OfferingResult =
  /** 出せる商品がある */
  | { kind: 'ok'; offering: PurchasesOffering }
  /**
   * 現在の Offering が取れない。
   *
   * ⚠ **RevenueCat の設定漏れとは限らない。**RevenueCat は構成だけを返し、
   *   価格は端末の StoreKit から取る。商品が降りてこないと Package から落とされ、
   *   結果として Offering ごと消える。**つまりダッシュボードが正しくてもここに来る。**
   *   実際 2026-09-08 に詰まったときは、REST API で
   *   `current_offering_id: "default"` と3 Package を確認できたのに端末では出なかった。
   *   疑う順は **App Store Connect が先**(有料App契約 → 商品の状態)。
   */
  | { kind: 'noOffering' }
  /** Offering はあるが商品が1つも降りてこない(App Store Connect 側の状態) */
  | { kind: 'noProducts' }
  /** 通信・SDK の失敗。キー未設定もここ */
  | { kind: 'failed' };

/**
 * ペイウォールに出す商品。
 *
 * ⚠ **失敗の種類を1つに潰さないこと。**「Offering が無い」「商品が降りてこない」
 *   「通信できない」は直す場所がまったく違う。同じ文言にすると実機で切り分けられず、
 *   ダッシュボードとストアと通信を総当たりする羽目になる
 *   (実機で実際に詰まった 2026-09-08)。Restore で同じ間違いを一度している。
 *
 * ⚠ **RevenueCat の構成は公開キーだけで確認できる。**秘密鍵は要らない:
 *     curl https://api.revenuecat.com/v1/subscribers/<任意のid>/offerings \
 *       -H "Authorization: Bearer <appl_ で始まる公開キー>" -H "X-Platform: ios"
 *   端末が見るのと同じものが返る。ダッシュボードを目視するより速く確実。
 *
 * ⚠ 呼び出し側はどの失敗でもコア体験を止めないこと。諦めるのはこの画面だけ。
 */
export async function getOffering(): Promise<OfferingResult> {
  configurePurchases();
  if (!isConfigured) return { kind: 'failed' };

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return { kind: 'noOffering' };
    // Offering はあるのに空 = StoreKit が商品を返していない。原因は ASC 側にある
    if (current.availablePackages.length === 0) return { kind: 'noProducts' };
    return { kind: 'ok', offering: current };
  } catch {
    return { kind: 'failed' };
  }
}

export type PurchaseOutcome =
  | 'purchased'
  /** ユーザーが自分でやめた。追いかけない */
  | 'cancelled'
  /**
   * ⚠ **Apple の購入は通ったのに entitlement が有効にならなかった。**
   *   `purchasePackage` が例外を投げていない以上、**課金は成立している。**
   *   原因はこちら側の設定(RevenueCat の Entitlement に商品が紐づいていない等)。
   *   これを 'failed' に混ぜて「請求は発生していません」と言うと、
   *   **課金された人に嘘をつくことになる**(実機で実際に踏んだ 2026-09-08)。
   */
  | 'unconfirmed'
  /** 購入そのものが成立しなかった */
  | 'failed';

/** 購入する。ユーザーによるキャンセルは失敗として扱わない */
export async function purchase(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  configurePurchases();
  if (!isConfigured) return 'failed';

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = hasEntitlement(customerInfo);
    await writeCachedEntitlement(active);
    // ⚠ ここで false でも「失敗」ではない。金は動いている
    return active ? 'purchased' : 'unconfirmed';
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
