/**
 * オンボーディング。
 *
 * ⚠ ここは「決意したとき」の場面そのもの。
 *   サボっている未来の自分に宛てた手紙を、ここで書かせる(spec §1 差別化の核)。
 *
 * ⚠ **保存するのは最後(課金画面を閉じたとき)に1回だけ。**途中の段では何も保存しない。
 *   段ごとに保存していたころ(1.0.2 まで)は、途中でやめてやり直すと、見えないところで
 *   ルーティンと言葉が二重になり、3回やり直すと上限に当たって先へ進めなくなった(2026-10-31 のレビューで発覚)。
 *
 * ⚠ 最初のルーティンと最初の言葉を必須にしてある。理由は2つ:
 *   1. 最初のルーティンを保存した日が Day 1 (`startedOn`) の起点。ここで立てないと
 *      卒業判定が始まらない
 *   2. 文言が0件だと通知を1件も送らない仕様なので、素通りさせると
 *      「何も起きないアプリ」を渡すことになる
 *
 * ⚠ ルーティンの入力欄には例文を置くこと。ユーザーは最初の1件で使い方を理解するため、
 *   **この例文が実質的なチュートリアル**になる(spec §2)。
 *
 * ⚠ **`Modal` の中には専用の `SafeAreaProvider` が要る。** 外側の provider は root の
 *   ビューを測っているため、Modal 内では inset が 0 になり、**先頭の文字がノッチに潜って
 *   読めなくなる**(実機で発覚 2026-09-07)。`SafeAreaView` を置くだけでは足りない。
 *
 * 見た目(2026-09-16 デザイン方針):
 *   - 最初の1枚は紺。起動画面と同じ色・同じ位置の「喝」から切れ目なく入る
 *   - 入力のステップは紙の色に戻し、上に目盛り、主ボタンは画面下に固定する
 *   - 封をする段(1.0.3)も紺。約束の場面なので節目の色を使う
 *
 * 流れ(1.0.3、plan §8):
 *   何を変えたいか → ルーティン(「〜したら、〜する」)→ いつから始めるか → 言葉
 *   → 66日のしくみ → 封をする → 通知 → 完了(試しに届ける)→ 課金画面
 */

import { useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Paywall } from '@/components/paywall';
import { SelfHarmNotice } from '@/components/self-harm-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeField } from '@/components/time-field';
import { MESSAGE_MAX_LENGTH } from '@/constants/messages';
import { Ceremony, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import {
  requestNotificationPermission,
  sendTrialNotification,
  syncScheduledNotifications,
} from '@/lib/notifications';
import { containsSelfHarmText } from '@/lib/self-harm-guard';
import { attacksThePerson } from '@/lib/soft-guard';
import { toDateKey } from '@/lib/date';
import { countChars, truncateChars } from '@/lib/text';
import { evaluateGraduation } from '@/lib/graduation';
import {
  addMessage,
  addRoutine,
  getRoutines,
  markOnboarded,
  RoutineLimitError,
  setStartedOnForOnboarding,
} from '@/storage';

/**
 * 2026-11-10 に 10画面 → 5画面にした(plan §10)。入口 → やること → 言葉 → 封 → 通知。
 * 「何を変えたいか」と「いつから」は、やることの画面にまとめた。「66日のしくみ」は Today に出す。
 */
type Step = 'intro' | 'routine' | 'words' | 'seal' | 'notifications';

/** 目盛りに出す手順。⚠ 順番に意味があるので番号(位置)を見せてよい */
const STEPS: Step[] = ['routine', 'words', 'seal', 'notifications'];

type StartKind = 'today' | 'tomorrow' | 'newYear';

/** 始める日の選択肢。1月1日は12月の間だけ出す(フレッシュスタート効果。plan §8) */
function startChoices(now: Date = new Date()): { kind: StartKind; label: string; dateKey: string }[] {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const choices: { kind: StartKind; label: string; dateKey: string }[] = [
    { kind: 'today', label: t.onboarding.startToday, dateKey: toDateKey(now) },
    { kind: 'tomorrow', label: t.onboarding.startTomorrow, dateKey: toDateKey(tomorrow) },
  ];
  const newYear = toDateKey(new Date(now.getFullYear() + 1, 0, 1));
  // ⚠ 12月31日は「明日」と「1月1日」が同じ日になる。同じ意味の選択肢を2つ並べない
  if (now.getMonth() === 11 && newYear !== choices[1].dateKey) {
    choices.push({ kind: 'newYear', label: t.onboarding.startNewYear, dateKey: newYear });
  }
  return choices;
}

/**
 * 選んだ種類を、保存する瞬間の日付にする。
 * ⚠ 日付を画面を開いた時点で決めておかないこと。設定の途中で 0:00 をまたぐと、
 *   「今日」が昨日になり、記録の無い昨日が1日目(=休み)になる(1.0.4 で直した)。
 * 1月1日の選択肢が年をまたいで消えていたら、今日(=1月1日)にする。
 */
function startDateFor(kind: StartKind, now: Date = new Date()): string {
  return startChoices(now).find((choice) => choice.kind === kind)?.dateKey ?? toDateKey(now);
}

/** 起動画面の画像幅(app.json の expo-splash-screen と揃える) */
const SPLASH_IMAGE_WIDTH = 200;

export type OnboardingStep = Step;

type Props = {
  onFinished: () => void;
  /**
   * ⚠ 撮影用・開発ビルド専用(`src/dev/dev-screen.tsx`)。途中の段から始め、入力済みの値を入れておく。
   *   本番では渡さない
   */
  preview?: { step: Step; time: string; title: string; words: string };
};

export function Onboarding({ onFinished, preview }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>(preview?.step ?? 'intro');
  const [time, setTime] = useState(preview?.time ?? '07:00');
  const [title, setTitle] = useState(preview?.title ?? '');
  const [words, setWords] = useState(preview?.words ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  /** 端末内の判定を待っている間(最大3秒)。二度押しで二重に保存させない */
  const [isChecking, setIsChecking] = useState(false);
  /** 通知を許可した。許可した人には、同じ画面で「試しに届ける」を見せる */
  const [isAllowed, setIsAllowed] = useState(false);
  const [isTrialSent, setIsTrialSent] = useState(false);
  /** 1日目にする日の種類(今日 / 明日 / 1月1日)。日付は保存の瞬間に決める(startDateFor) */
  const [startKind, setStartKind] = useState<StartKind>('today');
  /** 最後の保存・試しの通知の最中。二度押しで二重に走らせない */
  const [isSaving, setIsSaving] = useState(false);

  // 前のステップで出したエラーを引きずらない
  const goTo = (next: Step) => {
    setError(null);
    setStep(next);
  };

  // 戻る。入力はすべてこの画面の中にあるので、戻っても何も消えない・二重にならない
  const goBack = () => {
    const index = STEPS.indexOf(step);
    goTo(index <= 0 ? 'intro' : STEPS[index - 1]);
  };

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.line }];

  const handleSaveRoutine = async () => {
    // ⚠ 時刻はピッカーから来るので不正な値が入らない。検証が要るのは題名だけ
    if (!title.trim()) {
      setError(t.onboarding.titleRequired);
      return;
    }
    setError(null);
    // ⚠ ここでは保存しない。最後にまとめて保存する(上のコメント)
    goTo('words');
  };

  const handleSaveWords = async () => {
    if (isChecking) return;
    if (!words.trim()) {
      setError(t.onboarding.wordsRequired);
      return;
    }
    setError(null);
    // Tier 1: 自傷・希死念慮に類する言葉は先へ進ませない(保存側と同じ判定)。
    // ⚠ 弾いた文言は消さない。オンボーディングでも閉じ込めない
    if (containsSelfHarmText(words)) {
      setIsBlocked(true);
      return;
    }
    // Tier 2: 人格・存在を否定する言葉なら一度だけ言い換えを提案する。止めはしない(spec §2)
    setIsChecking(true);
    const isAttack = await attacksThePerson(words);
    setIsChecking(false);
    if (isAttack) {
      Alert.alert(t.katsu.softGuardTitle, t.katsu.softGuardBody, [
        { text: t.katsu.softGuardRewrite, style: 'cancel' },
        { text: t.katsu.softGuardKeep, onPress: () => goTo('seal') },
      ]);
      return;
    }
    goTo('seal');
  };

  // 例を押すと、時刻とやることが入る。どの例を選んだかは保存しない
  const handlePickGoal = (goal: { time: string; title: string }) => {
    setError(null);
    setTime(goal.time);
    setTitle(goal.title);
  };

  // 許可した人はこの画面に残して「試しに届ける」を見せる。断った人はそのまま先へ(課金機会①)
  const handleAskNotifications = async () => {
    const isGranted = (await requestNotificationPermission()) === 'granted';
    setIsAllowed(isGranted);
    if (!isGranted) setIsPaywallOpen(true);
  };

  // 最初の1分で、自分の言葉が届く体験をさせる(plan §7-5)。許可した人だけ
  const handleTrial = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await sendTrialNotification(title.trim(), words.trim());
      setIsTrialSent(true);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 課金画面を閉じたとき。ここで初めて、ルーティン・1日目・言葉をまとめて保存する。
   * ⚠ 1.0.2 以前に途中まで保存してやめた人は、同じルーティンが残っていることがある。二重に足さない
   */
  const handleFinish = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const existing = await getRoutines();
      const isSame = existing.some((routine) => routine.time === time && routine.title === title.trim());
      if (!isSame) {
        try {
          // これが Day 1 の起点。登録した時点で時刻が過ぎていれば、その日だけ分母から外れる
          await addRoutine({ time, title });
        } catch (caught) {
          // 途中まで保存した古い版の名残で上限に当たっても、オンボーディングは終わらせる
          if (!(caught instanceof RoutineLimitError)) throw caught;
        }
      }
      // ⚠ 「今日」でも必ず置き直す。1.0.2 までの版で途中まで進めた人は、そのときの日が
      //   1日目として残っていて、その間が全部休みに数えられていた(1.0.4 で直した)
      await setStartedOnForOnboarding(startDateFor(startKind));
      await addMessage(words);
      await markOnboarded();
      // 1.0.2 以降の初めての判定をここで済ませておく。済ませないと、最初の判定が
      // 「更新前に越えた節目」として1日目のお祝いを黙って済みにしてしまうことがある
      await evaluateGraduation();
      await syncScheduledNotifications();
      onFinished();
    } finally {
      setIsSaving(false);
    }
  };

  const current = STEPS.indexOf(step);

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      {/* ⚠ この provider を外すと先頭の文字がノッチに潜る。上のコメントを読むこと */}
      <SafeAreaProvider>
        {step === 'intro' ? (
          <Intro onStart={() => goTo('routine')} />
        ) : step === 'seal' ? (
          <Seal words={words.trim()} onSealed={() => goTo('notifications')} onBack={goBack} />
        ) : (
          <ThemedView style={styles.fill}>
            <StatusBar style="auto" />
            <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
              <KeyboardAvoidingView
                style={styles.fill}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View
                  style={styles.progress}
                  accessible
                  accessibilityLabel={`${current + 1} / ${STEPS.length}`}>
                  {STEPS.map((item, index) => (
                    <View
                      key={item}
                      style={[
                        styles.progressStep,
                        { backgroundColor: index <= current ? theme.accent : theme.line },
                      ]}
                    />
                  ))}
                </View>

                <ScrollView
                  contentContainerStyle={styles.content}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag">
                  {step === 'routine' && (
                    <>
                      <ThemedText type="display">{t.onboarding.routineTitle}</ThemedText>
                      {/* 「〜したら、〜する」と小さく始めること(plan §8)。
                          ⚠ 説明はこの1つだけ。毎日の習慣の案内(plan §2)は Routines 画面にあり、ここでは例がその役をする。
                          足すと、英語で「1日目」の選択が画面の下に隠れる(2026-11-10) */}
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.ifThen}
                      </ThemedText>
                      <TimeField value={time} onChange={setTime} label={t.routines.time} />
                      {/* ⚠ この例文が実質的なチュートリアル。消さないこと */}
                      <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t.onboarding.titlePlaceholder}
                        placeholderTextColor={theme.textSecondary}
                        maxLength={40}
                        style={inputStyle}
                      />
                      {/* 例。押すと上の時刻とやることに入る(そのまま直せる)。⚠ ルーティンの例であって、言葉の例ではない */}
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.goalBody}
                      </ThemedText>
                      <View style={styles.chips}>
                        {t.onboarding.goals.map((goal) => (
                          <Chip
                            key={goal.label}
                            label={goal.label}
                            isSelected={goal.title === title && goal.time === time}
                            onPress={() => handlePickGoal(goal)}
                          />
                        ))}
                      </View>
                      {/* いつを1日目にするか。1月1日は12月の間だけ出る */}
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.startTitle}
                      </ThemedText>
                      <View style={styles.chips}>
                        {startChoices().map((choice) => (
                          <Chip
                            key={choice.kind}
                            label={choice.label}
                            isSelected={choice.kind === startKind}
                            onPress={() => setStartKind(choice.kind)}
                          />
                        ))}
                      </View>
                    </>
                  )}

                  {step === 'words' && (
                    <>
                      <ThemedText type="display">{t.onboarding.wordsTitle}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.wordsBody}
                      </ThemedText>
                      {/* ⚠ この一行を消さないこと。厳しさと有害さの境目を先に示す(spec §2) */}
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.katsu.guardrail}
                      </ThemedText>
                      <TextInput
                        value={words}
                        onChangeText={(next) => {
                          setWords(truncateChars(next, MESSAGE_MAX_LENGTH));
                          if (isBlocked) setIsBlocked(false);
                        }}
                        placeholder={t.katsu.placeholder}
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        // ⚠ 通知の本文に改行は要らない。Return は閉じる動作に使う
                        submitBehavior="blurAndSubmit"
                        returnKeyType="done"
                        // ⚠ 最初の一行から手紙の書体で見せる
                        style={[...inputStyle, styles.voiceInput]}
                      />
                      <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
                        {countChars(words)} / {MESSAGE_MAX_LENGTH}
                      </ThemedText>
                      {isBlocked && <SelfHarmNotice />}
                    </>
                  )}

                  {step === 'notifications' && (
                    <>
                      <ThemedText type="display">{t.onboarding.notificationsTitle}</ThemedText>
                      <ThemedText>{t.onboarding.notificationsBody}</ThemedText>
                      {/* ⚠ 理由を説明してから許可を求める。先にダイアログを出さない */}
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.notificationsNote}
                      </ThemedText>
                      {/* ⚠ 端末内で完結することを1行で伝える(spec §4) */}
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.doneBody}
                      </ThemedText>
                      {/* 最初の1分で、自分の言葉が届く体験をさせる(plan §7-5)。許可した人だけ */}
                      {isAllowed &&
                        (isTrialSent ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {t.onboarding.trialSent}
                          </ThemedText>
                        ) : (
                          <Button
                            label={t.onboarding.trial}
                            variant="secondary"
                            onPress={handleTrial}
                          />
                        ))}
                    </>
                  )}

                  {error && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {error}
                    </ThemedText>
                  )}
                </ScrollView>

                {/* ⚠ 主ボタンは画面下に固定する。文章の長さでボタンの位置を動かさない */}
                <View style={styles.footer}>
                  {step === 'routine' && (
                    <Button label={t.onboarding.next} onPress={handleSaveRoutine} />
                  )}
                  {step === 'words' && (
                    <Button label={t.onboarding.next} onPress={handleSaveWords} busy={isChecking} />
                  )}
                  {/* ⚠ 課金機会①: オンボーディング最後。閉じられること */}
                  {step === 'notifications' &&
                    (isAllowed ? (
                      <Button
                        label={t.onboarding.begin}
                        onPress={() => setIsPaywallOpen(true)}
                        busy={isSaving}
                      />
                    ) : (
                      <>
                        <Button label={t.onboarding.allow} onPress={handleAskNotifications} />
                        <Button
                          label={t.onboarding.notNow}
                          variant="plain"
                          onPress={() => setIsPaywallOpen(true)}
                          disabled={isSaving}
                        />
                      </>
                    ))}
                  {/* 戻る。選び間違えた1日目や、書き間違えた言葉を直せるように(何も保存していないので安全) */}
                  <Button label={t.onboarding.back} variant="plain" onPress={goBack} />
                </View>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </ThemedView>
        )}

        {/* ⚠ 閉じられること。閉じても、買っても、そのままアプリに入る。
            onPurchased は渡さない ── 購入後は onClose も呼ばれるため二重に走る */}
        <Paywall visible={isPaywallOpen} onClose={handleFinish} />
      </SafeAreaProvider>
    </Modal>
  );
}

/** 例や1日目を選ぶ小さなボタン。選ばれているものだけ塗る */
function Chip({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: isSelected ? theme.accent : theme.line, backgroundColor: isSelected ? theme.accent : 'transparent' },
        pressed && { opacity: 0.6 },
      ]}>
      <ThemedText type="smallBold" style={{ color: isSelected ? theme.accentText : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * 最初の1枚。
 * ⚠ 起動画面と同じ紺・同じ画像・同じ幅で、画面の中央に置く。
 *   起動画面が消えた瞬間に「喝」が動かないこと ── つなぎ目を見せない。
 */
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <View style={[styles.fill, { backgroundColor: Ceremony.navy }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/*
          ⚠ スクロールできるようにしておく。小さい画面や大きい文字の設定では、
            説明文が下のボタンに食い込む。ボタンだけは下に固定したまま
        */}
        <ScrollView contentContainerStyle={styles.introScroll} bounces={false}>
          <View style={styles.introMark}>
            <Image
              source={require('../../assets/images/splash-icon.png')}
              style={styles.splashImage}
              accessibilityLabel="KATSU"
            />
          </View>
          <View style={styles.introText}>
            <Text style={styles.introTagline}>{t.onboarding.tagline}</Text>
            <Text style={styles.introBody}>{t.onboarding.intro}</Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button tone="ceremony" label={t.onboarding.start} onPress={onStart} />
          <Text style={styles.introNote}>{t.onboarding.introNote}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

/**
 * 封をする(plan §8)。書いた言葉を手紙として見せ、長押しで封をする。
 * ⚠ 約束の相手はアプリではなく未来の自分。署名や名前は求めない。保存するものも無い
 * ⚠ 長押しの間だけ下の線が伸びる。指を離せば戻る。急かさない
 */
function Seal({
  words,
  onSealed,
  onBack,
}: {
  words: string;
  onSealed: () => void;
  onBack: () => void;
}) {
  // ⚠ useRef にすると描画中に ref を読むことになる(lint)。値は作り直さないので state で持つ
  const [fill] = useState(() => new Animated.Value(0));

  const handlePressIn = () => {
    Animated.timing(fill, { toValue: 1, duration: SEAL_HOLD_MS, useNativeDriver: false }).start();
  };
  const handlePressOut = () => {
    Animated.timing(fill, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };
  const handleSealed = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSealed();
  };

  return (
    <View style={[styles.fill, { backgroundColor: Ceremony.navy }]}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.sealContent}>
          <Text style={styles.sealEyebrow}>{t.onboarding.sealEyebrow}</Text>
          <Text style={styles.sealWords}>{words}</Text>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={handleSealed}
            delayLongPress={SEAL_HOLD_MS}
            accessibilityRole="button"
            accessibilityLabel={t.onboarding.sealHold}
            accessibilityHint={t.onboarding.sealHint}
            // VoiceOver では長押しが難しいので、ダブルタップでも封ができるようにする
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={handleSealed}
            style={styles.sealButton}>
            <Text style={styles.sealButtonText}>{t.onboarding.sealHold}</Text>
            <Animated.View
              style={[
                styles.sealFill,
                { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </Pressable>
          <Text style={styles.introNote}>{t.onboarding.sealNote}</Text>
          <Button tone="ceremony" variant="plain" label={t.onboarding.back} onPress={onBack} />
        </View>
      </SafeAreaView>
    </View>
  );
}

/** 封をするまでの長押しの長さ */
const SEAL_HOLD_MS = 1200;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  sealContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  sealEyebrow: {
    color: Ceremony.creamSoft,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1,
  },
  sealWords: {
    color: Ceremony.cream,
    fontFamily: Fonts?.voice,
    fontSize: 26,
    lineHeight: 40,
    fontWeight: 700,
  },
  sealButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Ceremony.creamSoft,
    overflow: 'hidden',
  },
  sealButtonText: {
    color: Ceremony.cream,
    fontSize: 16,
    fontWeight: 600,
  },
  sealFill: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 3,
    backgroundColor: Ceremony.cream,
  },
  progress: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1,
  },
  progressStep: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  voiceInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: Fonts?.voice,
    fontSize: 19,
    lineHeight: 30,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  footer: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  introScroll: {
    flexGrow: 1,
  },
  introMark: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  splashImage: {
    width: SPLASH_IMAGE_WIDTH,
    height: SPLASH_IMAGE_WIDTH,
  },
  introText: {
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
  },
  introTagline: {
    color: Ceremony.cream,
    fontFamily: Fonts?.voice,
    fontSize: 22,
    lineHeight: 34,
    fontWeight: 700,
    textAlign: 'center',
  },
  introBody: {
    color: Ceremony.creamSoft,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  introNote: {
    color: Ceremony.creamSoft,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
