/**
 * 購入画面に出す法務リンク。
 *
 * ⚠ **App Store Review Guideline 3.1.2 の要件。** 自動更新サブスクを売る画面には、
 *   商品名・期間・価格に加えて、**利用規約とプライバシーポリシーへの動くリンク**を
 *   置かなければならない。無いと審査で落ちる(定番のリジェクト理由)。
 *   ペイウォールから消さないこと。
 *
 * 利用規約は Apple の標準 EULA を使う。自前の規約を書く理由が無く、
 * 標準 EULA を参照するのは Apple が明示的に認めている方法。
 */

/** Apple 標準 EULA(Licensed Application End User License Agreement) */
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/**
 * プライバシーポリシー。
 *
 * ⚠ App Store Connect の Privacy Policy URL と**同じものを指すこと。**
 *   バックエンドが無いので置き場が無い ── ページの実体は `docs/privacy/index.html`。
 */
export const PRIVACY_URL = 'https://kisshiii.github.io/shipaton-habit/privacy/';
