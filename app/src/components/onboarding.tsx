/**
 * オンボーディング。
 *
 * ⚠ ここは「決意したとき」の場面そのもの。
 *   サボっている未来の自分に宛てた手紙を、ここで書かせる(spec §1 差別化の核)。
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
import { GRADUATION_STREAK_DAYS, MAX_REST_DAYS, REST_WINDOW_DAYS } from '@/constants/graduation';
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
import {
  addMessage,
  addRoutine,
  markOnboarded,
  SelfHarmTextError,
  setStartedOnForOnboarding,
} from '@/storage';

type Step =
  | 'intro'
  | 'goal'
  | 'routine'
  | 'start'
  | 'words'
  | 'rule'
  | 'seal'
  | 'notifications'
  | 'done';

/** 目盛りに出す手順。⚠ 順番に意味があるので番号(位置)を見せてよい */
const STEPS: Step[] = ['goal', 'routine', 'start', 'words', 'rule', 'seal', 'notifications', 'done'];

/** 始める日の選択肢。1月1日は12月の間だけ出す(フレッシュスタート効果。plan §8) */
function startChoices(now: Date = new Date()): { label: string; dateKey: string }[] {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const choices = [
    { label: t.onboarding.startToday, dateKey: toDateKey(now) },
    { label: t.onboarding.startTomorrow, dateKey: toDateKey(tomorrow) },
  ];
  if (now.getMonth() === 11) {
    choices.push({ label: t.onboarding.startNewYear, dateKey: toDateKey(new Date(now.getFullYear() + 1, 0, 1)) });
  }
  return choices;
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
  preview?: { step: Step; title: string; words: string };
};

export function Onboarding({ onFinished, preview }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>(preview?.step ?? 'intro');
  const [time, setTime] = useState('07:00');
  const [title, setTitle] = useState(preview?.title ?? '');
  const [words, setWords] = useState(preview?.words ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  /** 端末内の判定を待っている間(最大3秒)。二度押しで二重に保存させない */
  const [isChecking, setIsChecking] = useState(false);
  // 撮影用に完了の段から始めたときは、許可済みとして「試しに届ける」を見せる
  const [isAllowed, setIsAllowed] = useState(preview?.step === 'done');
  const [isTrialSent, setIsTrialSent] = useState(false);

  // 前のステップで出したエラーを引きずらない
  const goTo = (next: Step) => {
    setError(null);
    setStep(next);
  };

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.line }];

  const handleSaveRoutine = async () => {
    // ⚠ 時刻はピッカーから来るので不正な値が入らない。検証が要るのは題名だけ
    if (!title.trim()) {
      setError(t.onboarding.titleRequired);
      return;
    }
    setError(null);
    // ここで Day 1 が今日になる。次の段で別の日を選べば、そちらに置き直す
    await addRoutine({ time, title });
    goTo('start');
  };

  const saveWords = async () => {
    try {
      await addMessage(words);
    } catch (caught) {
      if (caught instanceof SelfHarmTextError) {
        // ⚠ 弾いた文言は消さない。オンボーディングでも閉じ込めない
        setIsBlocked(true);
        return;
      }
      throw caught;
    }
    goTo('rule');
  };

  const handleSaveWords = async () => {
    if (!words.trim()) {
      setError(t.onboarding.wordsRequired);
      return;
    }
    setError(null);
    // Tier 2: 人格・存在を否定する言葉なら一度だけ言い換えを提案する。止めはしない(spec §2)
    let isAttack = false;
    if (!containsSelfHarmText(words)) {
      setIsChecking(true);
      isAttack = await attacksThePerson(words);
      setIsChecking(false);
    }
    if (isAttack) {
      Alert.alert(t.katsu.softGuardTitle, t.katsu.softGuardBody, [
        { text: t.katsu.softGuardRewrite, style: 'cancel' },
        { text: t.katsu.softGuardKeep, onPress: saveWords },
      ]);
      return;
    }
    await saveWords();
  };

  // 何を変えたいか: 例を次の段に入れておく。答えそのものは保存しない
  const handlePickGoal = (goal: { time: string; title: string }) => {
    setTime(goal.time);
    setTitle(goal.title);
    goTo('routine');
  };

  const handlePickStart = async (dateKey: string) => {
    await setStartedOnForOnboarding(dateKey);
    goTo('words');
  };

  const handleAskNotifications = async () => {
    setIsAllowed((await requestNotificationPermission()) === 'granted');
    goTo('done');
  };

  // 最初の1分で、自分の言葉が届く体験をさせる(plan §7-5)。許可した人だけ
  const handleTrial = async () => {
    await sendTrialNotification(title.trim(), words.trim());
    setIsTrialSent(true);
  };

  const handleFinish = async () => {
    await markOnboarded();
    await syncScheduledNotifications();
    onFinished();
  };

  const current = STEPS.indexOf(step);

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      {/* ⚠ この provider を外すと先頭の文字がノッチに潜る。上のコメントを読むこと */}
      <SafeAreaProvider>
        {step === 'intro' ? (
          <Intro onStart={() => goTo('goal')} />
        ) : step === 'seal' ? (
          <Seal words={words.trim()} onSealed={() => goTo('notifications')} />
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
                  {step === 'goal' && (
                    <>
                      <ThemedText type="display">{t.onboarding.goalTitle}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.goalBody}
                      </ThemedText>
                      {t.onboarding.goals.map((goal) => (
                        <Button
                          key={goal.label}
                          label={goal.label}
                          variant="secondary"
                          onPress={() => handlePickGoal(goal)}
                        />
                      ))}
                    </>
                  )}

                  {step === 'routine' && (
                    <>
                      <ThemedText type="display">{t.onboarding.routineTitle}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.routineBody}
                      </ThemedText>
                      {/* 「〜したら、〜する」と小さく始めること(plan §8) */}
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.ifThen}
                      </ThemedText>
                      {/* 毎日の習慣の案内(plan §2)。手順は増やさず、一言添えるだけ */}
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.routines.dailyHint}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.routines.changeNote}
                      </ThemedText>
                      <TimeField value={time} onChange={setTime} label={t.routines.time} />
                      {/* ⚠ この例文が実質的なチュートリアル。消さないこと */}
                      <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t.routines.titlePlaceholder}
                        placeholderTextColor={theme.textSecondary}
                        maxLength={40}
                        style={inputStyle}
                      />
                    </>
                  )}

                  {step === 'start' && (
                    <>
                      <ThemedText type="display">{t.onboarding.startTitle}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.startBody}
                      </ThemedText>
                      {startChoices().map((choice) => (
                        <Button
                          key={choice.dateKey}
                          label={choice.label}
                          variant="secondary"
                          onPress={() => handlePickStart(choice.dateKey)}
                        />
                      ))}
                    </>
                  )}

                  {step === 'rule' && (
                    <>
                      <ThemedText type="display">{t.onboarding.ruleTitle}</ThemedText>
                      <ThemedText>
                        {t.onboarding.ruleBody(GRADUATION_STREAK_DAYS, MAX_REST_DAYS, REST_WINDOW_DAYS)}
                      </ThemedText>
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
                    </>
                  )}

                  {step === 'done' && (
                    <>
                      <ThemedText type="display">{t.onboarding.doneTitle}</ThemedText>
                      {/* ⚠ 端末内で完結することを1行で伝える。欠点を隠さず強みとして出す(spec §4) */}
                      <ThemedText>{t.onboarding.doneBody}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.doneNote}
                      </ThemedText>
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
                  {step === 'rule' && (
                    <Button label={t.onboarding.next} onPress={() => goTo('seal')} />
                  )}
                  {step === 'notifications' && (
                    <>
                      <Button label={t.onboarding.allow} onPress={handleAskNotifications} />
                      <Button
                        label={t.onboarding.notNow}
                        variant="plain"
                        onPress={() => goTo('done')}
                      />
                    </>
                  )}
                  {/* ⚠ 課金機会①: オンボーディング最後。閉じられること */}
                  {step === 'done' && (
                    <Button label={t.onboarding.begin} onPress={() => setIsPaywallOpen(true)} />
                  )}
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
function Seal({ words, onSealed }: { words: string; onSealed: () => void }) {
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
    fontWeight: 600,
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
