/**
 * Tier 2 ソフトガード(spec §2 カスタムメッセージの安全設計 / plan §6)。
 *
 * 書いた言葉が「行動」ではなく「人格・存在」を否定しているときに、
 * 保存の前に一度だけ言い換えを提案する。**保存は止めない。**決めるのは本人。
 *
 * 判定は端末の中の Apple の言語モデルで行う(`modules/katsu-soft-guard`)。
 * ⚠ 端末の外に送らない。外部の AI API に言葉を送る形にはしない(plan §6)。
 * ⚠ 本文も判定結果もログに出さない・保存しない(Tier 1 と同じ。spec §2-6)。
 * ⚠ 判定できない端末(Apple Intelligence 非対応・オフ・言語非対応)では何もしない。
 *   安全網の本体は Tier 1(`self-harm-guard.ts`)で、こちらは足しの一言にすぎない。
 * ⚠ 言い換えの文をモデルに書かせない。届くのは「自分で書いた言葉」でなければならない。
 */

import SoftGuard from '../../modules/katsu-soft-guard';

/** これより遅ければ判定をあきらめて、そのまま保存する。保存ボタンを待たせない */
const TIMEOUT_MS = 3000;

/**
 * 人格・存在を否定する言葉なら true。判定できなければ false(何も言わない)。
 */
export async function attacksThePerson(text: string): Promise<boolean> {
  if (!SoftGuard) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'unknown'>((resolve) => {
    timer = setTimeout(() => resolve('unknown'), TIMEOUT_MS);
  });
  try {
    const verdict = await Promise.race([SoftGuard.classify(text.trim()), timeout]);
    return verdict === 'person';
  } catch {
    // ⚠ 握りつぶす。例外の中身に本文が含まれうるので、ログにも出さない
    return false;
  } finally {
    clearTimeout(timer);
  }
}
