/**
 * 「10分後にもう一度」のネイティブ部分(`ios/KatsuNotificationActionsModule.swift`)。
 * 画面からは直接使わず、`src/lib/notifications.ts` を通すこと。
 */

import { requireOptionalNativeModule } from 'expo';

type NativeModule = {
  /** 届け直すまでの秒数を渡す。呼ばれる前は 600 秒(10分)で動く */
  configure(snoozeSeconds: number): void;
};

/** ネイティブ部分が入っていないビルド(Web・古い開発ビルド)では null */
export default requireOptionalNativeModule<NativeModule>('KatsuNotificationActions');
