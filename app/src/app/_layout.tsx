import { useCallback, useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { Onboarding } from '@/components/onboarding';
import { routineIdFromResponse } from '@/lib/notifications';
import { configurePurchases } from '@/lib/purchases';
import { getAppState } from '@/storage';

SplashScreen.preventAutoHideAsync();

// アプリを開いている最中に時刻が来た場合も、黙って握りつぶさずバナーを出す。
// 通知が入口である以上、前面にいるときだけ届かないのは筋が通らない。
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // null = 判定前。ここで false を初期値にすると、既存ユーザーに一瞬
  // オンボーディングが差し込まれる
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  // キーが無ければ何もしない。課金は後付けの層であって、起動の前提ではない
  useEffect(() => {
    configurePurchases();
  }, []);

  // 何を出すか決まってからスプラッシュを畳む。
  // 先に畳むと、オンボーディングが要る人に一瞬タブが見える
  useEffect(() => {
    getAppState()
      .then((state) => setNeedsOnboarding(!state.onboardedAt))
      .finally(() => SplashScreen.hideAsync());
  }, []);

  const handleOnboarded = useCallback(() => setNeedsOnboarding(false), []);

  // 通知タップで起動・復帰したときの遷移。
  // 冷起動も含めて拾えるよう、リスナーではなくこのフックを使う。
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!lastResponse) return;
    const routineId = routineIdFromResponse(lastResponse);
    if (!routineId) return;
    // 該当項目へ。文字列を経路情報に混ぜず、ID だけで解決する
    router.navigate({ pathname: '/', params: { routineId } });
  }, [lastResponse]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
      {needsOnboarding === true && <Onboarding onFinished={handleOnboarded} />}
    </ThemeProvider>
  );
}
