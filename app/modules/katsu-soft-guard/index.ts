/**
 * Tier 2 ソフトガードのネイティブ部分(`ios/KatsuSoftGuardModule.swift`)。
 * 画面からは直接使わず、`src/lib/soft-guard.ts` を通すこと。
 */

import { requireOptionalNativeModule } from 'expo';

export type SoftGuardVerdict = 'person' | 'action' | 'unknown';

type NativeModule = {
  availability(): Promise<'available' | 'unavailable'>;
  classify(text: string): Promise<SoftGuardVerdict>;
};

/** ネイティブ部分が入っていないビルド(Web・古い開発ビルド)では null */
export default requireOptionalNativeModule<NativeModule>('KatsuSoftGuard');
