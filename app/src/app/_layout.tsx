import { useCallback, useEffect, useRef, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { DevSettings, Settings, useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { Onboarding } from '@/components/onboarding';
import { ACTION_DONE, ACTION_SNOOZE } from '@/constants/notifications';
import { todayKey } from '@/lib/date';
import {
  dayOfResponse,
  registerNotificationActions,
  routineIdFromResponse,
  snoozeNotification,
  syncScheduledNotifications,
} from '@/lib/notifications';
import { configurePurchases } from '@/lib/purchases';
import { addQuickActionListener, initialQuickAction, routineIdFromQuickAction } from '@/lib/quick-actions';
import { getAppState, markCompletedToday } from '@/storage';

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

/**
 * ⚠ 撮影用・開発ビルド専用: 起動引数 `-katsuDevSeed <種類>`(`src/dev/demo-seed.ts`)。
 *   本番ではこの式全体が undefined に置き換わり、引数の名前もバンドルに残らない。
 */
const devSeedArgument: unknown =
  __DEV__ || process.env.EXPO_PUBLIC_KATSU_DEV_TOOLS === '1' ? Settings.get('katsuDevSeed') : undefined;

/** ⚠ 撮影用・開発ビルド専用: 起動引数 `-katsuDevTheme <テーマ>`(撮るルーティンの組み合わせ) */
const devThemeArgument: unknown =
  __DEV__ || process.env.EXPO_PUBLIC_KATSU_DEV_TOOLS === '1' ? Settings.get('katsuDevTheme') : undefined;

/** ⚠ 撮影用・開発ビルド専用: 起動引数 `-katsuDevScreen <画面>`(`src/dev/dev-screen.tsx`) */
const devScreenArgument: unknown =
  __DEV__ || process.env.EXPO_PUBLIC_KATSU_DEV_TOOLS === '1' ? Settings.get('katsuDevScreen') : undefined;

/** 冷起動のクイックアクションを処理したか。画面の再マウントをまたいで覚える */
let handledInitialQuickAction = false;

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // 起動引数で状態を作るときは、差し替え終わるまで何も描かない。
  // 先に描くと、画面が古い状態を読んだり、新しい状態の一度きりの表示を消費したりする
  const [isSeeding, setIsSeeding] = useState(devSeedArgument != null);
  useEffect(() => {
    if (__DEV__ || process.env.EXPO_PUBLIC_KATSU_DEV_TOOLS === '1') {
      if (devSeedArgument == null) return;
      // import にすると本番バンドルにも入る。ここは require でなければならない
      const { isDemoKind, isDemoTheme, seedDemo } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/dev/demo-seed') as typeof import('@/dev/demo-seed');
      const seeding = isDemoKind(devSeedArgument)
        ? seedDemo(devSeedArgument, {
            force: true,
            theme: isDemoTheme(devThemeArgument) ? devThemeArgument : undefined,
          })
        : Promise.resolve(false);
      seeding.finally(() => setIsSeeding(false));
    }
  }, []);

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
    if (isSeeding) return;
    getAppState()
      .then((state) => setNeedsOnboarding(!state.onboardedAt))
      .finally(() => SplashScreen.hideAsync());
  }, [isSeeding]);

  // ⚠ Today はオンボーディングの下で、まだ何も無い状態のまま描かれている。閉じたら読み直させる
  const handleOnboarded = useCallback(() => {
    setNeedsOnboarding(false);
    router.navigate({ pathname: '/', params: { opened: String(Date.now()) } });
  }, []);

  // 通知タップで起動・復帰したときの遷移。
  // 冷起動も含めて拾えるよう、リスナーではなくこのフックを使う。
  const lastResponse = Notifications.useLastNotificationResponse();
  // このフックは「最後にタップした通知」を保持し続けるため、再マウントのたびに
  // 同じ応答が返ってくる。処理済みを覚えておかないと、普通に開いただけなのに
  // 古い項目へ飛ばされる
  const handledResponseRef = useRef<string | null>(null);

  /**
   * ⚠ 開発ビルド専用: `app:///?katsu-dev-seed=progress` で状態を作る(`src/dev/demo-seed.ts`)。
   *   `if (__DEV__)` の中で require すること。本番ビルドではブロックごと消え、
   *   デモ用のコードがバンドルに入らない。早期 return では消えない。
   *   シミュレーターでは確認のダイアログが出ない起動引数のほう(上)を使う。
   */
  const linkingUrl = Linking.useLinkingURL();
  useEffect(() => {
    if (__DEV__) {
      if (!linkingUrl) return;
      const { DEV_SEED_QUERY, isDemoKind, seedDemo } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/dev/demo-seed') as typeof import('@/dev/demo-seed');
      const kind = Linking.parse(linkingUrl).queryParams?.[DEV_SEED_QUERY];
      if (!isDemoKind(kind)) return;
      seedDemo(kind).then((didSeed) => {
        if (didSeed) DevSettings.reload();
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

    // 「10分後にもう一度」: アプリは開かない。届け直しを予約するだけ
    if (lastResponse.actionIdentifier === ACTION_SNOOZE) {
      snoozeNotification(lastResponse).catch(() => {});
      return;
    }

    (async () => {
      try {
        // 「やった ✓」: その通知の日が今日ならチェックを付けてから開く。昨日の分なら開くだけ
        // (「10分後にもう一度」で0時をまたいでも、届いた日ではなく通知の日で決める)
        if (lastResponse.actionIdentifier === ACTION_DONE && dayOfResponse(lastResponse) === todayKey()) {
          await markCompletedToday(routineId);
          await syncScheduledNotifications();
        }
      } finally {
        // 該当項目へ。文字列を経路情報に混ぜず、ID だけで解決する。
        // ⚠ opened を毎回変えて、Today がすでに開いていても読み直させる。保存に失敗しても開く
        router.navigate({ pathname: '/', params: { routineId, opened: String(Date.now()) } });
      }
    })().catch(() => {});
  }, [lastResponse]);

  // アイコンを長押しした項目から開いたとき(1.0.3、plan §8 追加)。
  // 冷起動は initialQuickAction、起動中はリスナーで拾う。
  // ⚠ 冷起動では iOS が両方の経路で知らせることがある。チェックは付いていれば何もしないので、
  //   二重に来ても Today を開き直すだけで済む
  useEffect(() => {
    const handle = async (routineId: string) => {
      await markCompletedToday(routineId);
      await syncScheduledNotifications();
      // ⚠ opened を毎回変えて、Today がすでに開いていても読み直させる(項目も Today が差し替える)
      router.navigate({ pathname: '/', params: { routineId, opened: String(Date.now()) } });
    };

    const initialId = routineIdFromQuickAction(initialQuickAction);
    // ⚠ initialQuickAction は JS が動いている間ずっと同じ値を返す。開発中の再読み込みで二度目を処理しない
    if (initialId && !handledInitialQuickAction) {
      handledInitialQuickAction = true;
      handle(initialId).catch(() => {});
    }

    const subscription = addQuickActionListener((action) => {
      const routineId = routineIdFromQuickAction(action);
      if (routineId) handle(routineId).catch(() => {});
    });
    return () => subscription.remove();
  }, []);

  // 通知を長押ししたときのボタン(1.0.3)。言語が変わっても合うよう、起動のたびに登録し直す
  useEffect(() => {
    registerNotificationActions().catch(() => {});
  }, []);

  if (isSeeding) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
      {needsOnboarding === true && <Onboarding onFinished={handleOnboarded} />}
      {(__DEV__ || process.env.EXPO_PUBLIC_KATSU_DEV_TOOLS === '1') &&
        typeof devScreenArgument === 'string' &&
        (() => {
          // import にすると本番バンドルにも入る。ここは require でなければならない
          const { DevScreen } =
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('@/dev/dev-screen') as typeof import('@/dev/dev-screen');
          return <DevScreen screen={devScreenArgument} />;
        })()}
    </ThemeProvider>
  );
}
