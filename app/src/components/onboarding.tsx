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
 *   - 入力の4ステップは紙の色に戻し、上に目盛り、主ボタンは画面下に固定する
 */

import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import { requestNotificationPermission, syncScheduledNotifications } from '@/lib/notifications';
import { countChars, truncateChars } from '@/lib/text';
import { addMessage, addRoutine, markOnboarded, SelfHarmTextError } from '@/storage';

type Step = 'intro' | 'routine' | 'words' | 'notifications' | 'done';

/** 目盛りに出す手順。⚠ 順番に意味があるので番号(位置)を見せてよい */
const STEPS: Step[] = ['routine', 'words', 'notifications', 'done'];

/** 起動画面の画像幅(app.json の expo-splash-screen と揃える) */
const SPLASH_IMAGE_WIDTH = 200;

type Props = {
  onFinished: () => void;
};

export function Onboarding({ onFinished }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('intro');
  const [time, setTime] = useState('07:00');
  const [title, setTitle] = useState('');
  const [words, setWords] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

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
    // これが Day 1 の起点になる
    await addRoutine({ time, title });
    goTo('words');
  };

  const handleSaveWords = async () => {
    if (!words.trim()) {
      setError(t.onboarding.wordsRequired);
      return;
    }
    setError(null);
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
    goTo('notifications');
  };

  const handleAskNotifications = async () => {
    await requestNotificationPermission();
    goTo('done');
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
          <Intro onStart={() => goTo('routine')} />
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
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.onboarding.routineBody}
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
                  {step === 'words' && <Button label={t.onboarding.next} onPress={handleSaveWords} />}
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

const styles = StyleSheet.create({
  fill: {
    flex: 1,
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
