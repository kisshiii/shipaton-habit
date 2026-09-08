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
 *
 * ⚠ **`Modal` の中には専用の `SafeAreaProvider` が要る。** 外側の provider は root の
 *   ビューを測っているため、Modal 内では inset が 0 になり、**先頭の文字がノッチに潜って
 *   読めなくなる**(実機で発覚 2026-09-07)。`SafeAreaView` を置くだけでは足りない。
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Paywall } from '@/components/paywall';
import { SelfHarmNotice } from '@/components/self-harm-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MESSAGE_MAX_LENGTH } from '@/constants/messages';
import { Spacing } from '@/constants/theme';
import { TimeField } from '@/components/time-field';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
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

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

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

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      {/* ⚠ この provider を外すと先頭の文字がノッチに潜る。上のコメントを読むこと */}
      <SafeAreaProvider>
        <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.safeArea}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {step === 'intro' && (
              <>
                <ThemedText type="title">{t.onboarding.appName}</ThemedText>
                <ThemedText type="subtitle">{t.onboarding.tagline}</ThemedText>
                <ThemedText>
                  {t.onboarding.intro}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.onboarding.introNote}
                </ThemedText>
                <Button label={t.onboarding.start} onPress={() => goTo('routine')} />
              </>
            )}

            {step === 'routine' && (
              <>
                <ThemedText type="subtitle">{t.onboarding.routineTitle}</ThemedText>
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
                <Button label={t.onboarding.next} onPress={handleSaveRoutine} />
              </>
            )}

            {step === 'words' && (
              <>
                <ThemedText type="subtitle">{t.onboarding.wordsTitle}</ThemedText>
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
                  style={[...inputStyle, styles.multiline]}
                />
                <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
                  {countChars(words)} / {MESSAGE_MAX_LENGTH}
                </ThemedText>
                <Button label={t.onboarding.next} onPress={handleSaveWords} />
                {isBlocked && <SelfHarmNotice />}
              </>
            )}

            {step === 'notifications' && (
              <>
                <ThemedText type="subtitle">{t.onboarding.notificationsTitle}</ThemedText>
                <ThemedText>
                  {t.onboarding.notificationsBody}
                </ThemedText>
                {/* ⚠ 理由を説明してから許可を求める。先にダイアログを出さない */}
                <ThemedText type="small" themeColor="textSecondary">
                  {t.onboarding.notificationsNote}
                </ThemedText>
                <View style={styles.actions}>
                  <Button label={t.onboarding.allow} onPress={handleAskNotifications} />
                  <Button label={t.onboarding.notNow} variant="plain" onPress={() => goTo('done')} />
                </View>
              </>
            )}

            {step === 'done' && (
              <>
                <ThemedText type="subtitle">{t.onboarding.doneTitle}</ThemedText>
                {/* ⚠ 端末内で完結することを1行で伝える。欠点を隠さず強みとして出す(spec §4) */}
                <ThemedText>{t.onboarding.doneBody}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.onboarding.doneNote}
                </ThemedText>
                {/* ⚠ 課金機会①: オンボーディング最後。閉じられること */}
                <Button label={t.onboarding.begin} onPress={() => setIsPaywallOpen(true)} />
              </>
            )}

            {error && (
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            )}
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* ⚠ 閉じられること。閉じても、買っても、そのままアプリに入る。
            onPurchased は渡さない ── 購入後は onClose も呼ばれるため二重に走る */}
        <Paywall visible={isPaywallOpen} onClose={handleFinish} />
        </ThemedView>
      </SafeAreaProvider>
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
    gap: Spacing.two,
  },
});
