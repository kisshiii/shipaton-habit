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
 *   バックエンドが無いので置き場が無い ── ページの実体は `lp/privacy/index.html`(Cloudflare Pages)。
 *   2026-11-16 に GitHub Pages から移した。1.0.3 までのビルドは旧住所(kisshiii.github.io/shipaton-habit/privacy/)を
 *   指しているので、1.0.4 が行き渡るまで旧ページ(`docs/privacy/`)も残す。
 */
export const PRIVACY_URL = 'https://katsu-habit.pages.dev/privacy/';

/**
 * 特定商取引法に基づく表記(2026-11-15)。日本の法律なので、日本語のときだけ課金画面に出す。
 * ⚠ 値段を ASC で変えたら、ページ(`lp/tokushoho/index.html`)の値段も手で直すこと
 */
export const TOKUSHOHO_URL = 'https://katsu-habit.pages.dev/tokushoho/';
