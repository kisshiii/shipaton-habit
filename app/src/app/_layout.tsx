import { useCallback, useEffect, useRef, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { DevSettings, Settings, useColorScheme } from 'react-native';

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
  // このフックは「最後にタップした通知」を保持し続けるため、再マウントのたびに
  // 同じ応答が返ってくる。処理済みを覚えておかないと、普通に開いただけなのに
  // 古い項目へ飛ばされる
  const handledResponseRef = useRef<string | null>(null);

  /**
   * ⚠ 開発・撮影用ビルド専用: 卒業・節目・途中の日数などの状態を作る(`src/dev/demo-seed.ts`)。
   *   起動引数 `-katsuDevSeed progress`、または開発ビルドなら `app:///?katsu-dev-seed=progress`。
   *   `if (__DEV__ || EXPO_PUBLIC_KATSU_DEV_TOOLS)` の中で require すること。本番ビルドでは
   *   どちらも偽に置き換わってブロックごと消え、デモ用のコードがバンドルに入らない。早期 return では消えない。
   *   `EXPO_PUBLIC_KATSU_DEV_TOOLS` は eas.json の `screenshots` プロファイルだけが立てる。
   */
  const linkingUrl = Linking.useLinkingURL();
  useEffect(() => {
    if (__DEV__ || process.env.EXPO_PUBLIC_KATSU_DEV_TOOLS === '1') {
      // import にすると本番バンドルにも入る。ここは require でなければならない
      const { DEV_SEED_ARGUMENT, DEV_SEED_QUERY, isDemoKind, seedDemo } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/dev/demo-seed') as typeof import('@/dev/demo-seed');
      const fromUrl = linkingUrl ? Linking.parse(linkingUrl).queryParams?.[DEV_SEED_QUERY] : undefined;
      const kind = fromUrl ?? Settings.get(DEV_SEED_ARGUMENT);
      if (!isDemoKind(kind)) return;
      seedDemo(kind).then((didSeed) => {
        // 撮影用ビルド(リリース構成)では再読み込みできない。アプリを開き直して反映する
        if (didSeed && __DEV__) DevSettings.reload();
      });
    }
  }, [linkingUrl]);

  useEffect(() => {
    if (!lastResponse) return;
    const responseId = lastResponse.notification.request.identifier;
    if (handledResponseRef.current === responseId) return;
    handledResponseRef.current = responseId;

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
