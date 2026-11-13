/**
 * チェックしたときの振動のネイティブ部分(`ios/KatsuHapticsModule.swift`)。
 * 画面からは直接使わず、`src/lib/haptics.ts` を通すこと。
 */

import { requireOptionalNativeModule } from 'expo';

type NativeModule = {
  /** `check` / `allDone`。鳴らせたら true */
  play(name: 'check' | 'allDone'): boolean;
};

/** ネイティブ部分が入っていないビルド(Web・古い開発ビルド)では null */
export default requireOptionalNativeModule<NativeModule>('KatsuHaptics');
