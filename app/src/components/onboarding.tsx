/**
 * オンボーディング。
 *
 * ⚠ ここは「決意したとき」の場面そのもの。
 *   サボっている未来の自分に宛てた手紙を、ここで書かせる(spec §1 差別化の核)。
 *
 * ⚠ 最初のルーティンと最初の言葉を必須にしてある。理由は2つ:
 *   1. 最初のルーティンを保存した日が Day 1 (`startedOn`) の起点。ここで立てないと
 *      卒業判定の窓が始まらない
 *   2. 文言が0件だと通知を1件も送らない仕様なので、素通りさせると
 *      「何も起きないアプリ」を渡すことになる
 *
 * ⚠ ルーティンの入力欄には例文を置くこと。ユーザーは最初の1件で使い方を理解するため、
 *   **この例文が実質的なチュートリアル**になる(spec §2)。
 */

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Paywall } from '@/components/paywall';
import { SelfHarmNotice } from '@/components/self-harm-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MESSAGE_MAX_LENGTH } from '@/constants/messages';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { normalizeTime } from '@/lib/date';
import { requestNotificationPermission, syncScheduledNotifications } from '@/lib/notifications';
import { countChars, truncateChars } from '@/lib/text';
import { addMessage, addRoutine, markOnboarded, SelfHarmTextError } from '@/storage';

type Step = 'intro' | 'routine' | 'words' | 'notifications' | 'done';

type Props = {
  onFinished: () => void;
};

export function Onboarding({ onFinished }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('intro');
  const [time, setTime] = useState('');
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

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  const handleSaveRoutine = async () => {
    if (normalizeTime(time) === null) {
      setError('Use 24-hour format, like 07:00.');
      return;
    }
    if (!title.trim()) {
      setError('Write what you will do at that time.');
      return;
    }
    setError(null);
    // これが Day 1 の起点になる
    await addRoutine({ time, title });
    goTo('words');
  };

  const handleSaveWords = async () => {
    if (!words.trim()) {
      setError('Write something. This is the whole point.');
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

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {step === 'intro' && (
              <>
                <ThemedText type="title">KATSU</ThemedText>
                <ThemedText type="subtitle">A voice from the you who believed.</ThemedText>
                <ThemedText>
                  You are about to write down what you want said to you on the days you would
                  rather not show up.
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  This app is designed for you to quit it. If it works, you stop needing it.
                </ThemedText>
                <Pressable onPress={() => goTo('routine')} hitSlop={Spacing.two}>
                  <ThemedText type="smallBold" themeColor="accent">Start</ThemedText>
                </Pressable>
              </>
            )}

            {step === 'routine' && (
              <>
                <ThemedText type="subtitle">One thing, every day</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Something with a time on it, that repeats. Five minutes to an hour.
                </ThemedText>
                {/* ⚠ この例文が実質的なチュートリアル。消さないこと */}
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="07:00"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  style={inputStyle}
                />
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Drink a glass of water"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={40}
                  style={inputStyle}
                />
                <Pressable onPress={handleSaveRoutine} hitSlop={Spacing.two}>
                  <ThemedText type="smallBold" themeColor="accent">Next</ThemedText>
                </Pressable>
              </>
            )}

            {step === 'words' && (
              <>
                <ThemedText type="subtitle">Now write the hard part</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  This is what arrives when the time passes and you have not done it. Not our
                  words. Yours.
                </ThemedText>
                {/* ⚠ この一行を消さないこと。厳しさと有害さの境目を先に示す(spec §2) */}
                <ThemedText type="small" themeColor="textSecondary">
                  It&apos;s okay to challenge an action. Don&apos;t attack the person.
                </ThemedText>
                <TextInput
                  value={words}
                  onChangeText={(next) => {
                    setWords(truncateChars(next, MESSAGE_MAX_LENGTH));
                    if (isBlocked) setIsBlocked(false);
                  }}
                  placeholder="You said you were going to change."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[...inputStyle, styles.multiline]}
                />
                <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
                  {countChars(words)} / {MESSAGE_MAX_LENGTH}
                </ThemedText>
                <Pressable onPress={handleSaveWords} hitSlop={Spacing.two}>
                  <ThemedText type="smallBold" themeColor="accent">Next</ThemedText>
                </Pressable>
                {isBlocked && <SelfHarmNotice />}
              </>
            )}

            {step === 'notifications' && (
              <>
                <ThemedText type="subtitle">How it reaches you</ThemedText>
                <ThemedText>
                  When the time passes and the box is still empty, your words arrive as a
                  notification. Check it off and that one goes quiet.
                </ThemedText>
                {/* ⚠ 理由を説明してから許可を求める。先にダイアログを出さない */}
                <ThemedText type="small" themeColor="textSecondary">
                  Without this you would have to remember to open the app, which is the one thing
                  this was built to spare you.
                </ThemedText>
                <View style={styles.actions}>
                  <Pressable onPress={handleAskNotifications} hitSlop={Spacing.two}>
                    <ThemedText type="smallBold" themeColor="accent">Allow notifications</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => goTo('done')} hitSlop={Spacing.two}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Not now
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}

            {step === 'done' && (
              <>
                <ThemedText type="subtitle">That is the whole app</ThemedText>
                {/* ⚠ 端末内で完結することを1行で伝える。欠点を隠さず強みとして出す(spec §4) */}
                <ThemedText>Your words stay on this device.</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Nothing you write here is sent anywhere. Nobody reads it but you.
                </ThemedText>
                {/* ⚠ 課金機会①: オンボーディング最後。閉じられること */}
                <Pressable onPress={() => setIsPaywallOpen(true)} hitSlop={Spacing.two}>
                  <ThemedText type="smallBold" themeColor="accent">Begin</ThemedText>
                </Pressable>
              </>
            )}

            {error && (
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            )}
          </ScrollView>
        </SafeAreaView>

        {/* ⚠ 閉じられること。閉じてもそのままアプリに入れる(spec §2) */}
        {/* ⚠ 閉じられること。閉じても、買っても、そのままアプリに入る。
            onPurchased は渡さない ── 購入後は onClose も呼ばれるため二重に走る */}
        <Paywall visible={isPaywallOpen} onClose={handleFinish} />
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
});
