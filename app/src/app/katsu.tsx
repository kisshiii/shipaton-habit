/**
 * Your KATSU 画面。
 * サボっているときに自分へ届ける言葉を書く。ここがこのアプリの核。
 * ⚠ 見た目は後回し。動くことを優先している。
 *
 * ⚠ ここで扱う文字列は端末外に出さない。ログにも出さない(CLAUDE.md プライバシー)。
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FREE_MESSAGE_LIMIT, MESSAGE_MAX_LENGTH } from '@/constants/messages';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addMessage,
  deleteMessage,
  getMessages,
  SelfHarmTextError,
  updateMessage,
} from '@/storage';
import type { KatsuMessage } from '@/types';

/**
 * 国別の番号は持たない。更新できず、古い番号を出し続けるリスクがある。
 * 国際的なディレクトリ1つに統一する(spec §2 ヘルプライン提示の設計-5)。
 */
const HELPLINE_URL = 'https://findahelpline.com';

export default function KatsuScreen() {
  const theme = useTheme();
  const [messages, setMessages] = useState<KatsuMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  // Tier 1 で止めたことを一度だけ伝えるための状態。draft が変われば消える
  const [isBlocked, setIsBlocked] = useState(false);

  const refresh = useCallback(async () => {
    setMessages(await getMessages());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const resetForm = () => {
    setEditingId(null);
    setDraft('');
    setIsBlocked(false);
  };

  const handleChangeDraft = (next: string) => {
    setDraft(next);
    // 書き直し始めた時点で引っ込める。繰り返し出すと威圧になる
    if (isBlocked) setIsBlocked(false);
  };

  const handleSubmit = async () => {
    if (!draft.trim()) {
      Alert.alert('Write something', 'What would you say to yourself at that moment?');
      return;
    }

    try {
      if (editingId) {
        await updateMessage(editingId, draft);
      } else {
        await addMessage(draft);
      }
      resetForm();
      await refresh();
    } catch (error) {
      if (error instanceof SelfHarmTextError) {
        // ⚠ 弾いた文言は消さない。書いた本人から取り上げるようなことはしない
        setIsBlocked(true);
        return;
      }
      throw error;
    }
  };

  const handleEdit = (message: KatsuMessage) => {
    setEditingId(message.id);
    setDraft(message.text);
    setIsBlocked(false);
  };

  const handleDelete = (message: KatsuMessage) => {
    Alert.alert('Delete this?', 'You wrote it. You can write it again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMessage(message.id);
          if (editingId === message.id) resetForm();
          await refresh();
        },
      },
    ]);
  };

  // ⚠ 課金機会②: 2つ目の言葉を書こうとしたとき。それ以外でペイウォールを出さない
  const needsPaywall = !editingId && messages.length >= FREE_MESSAGE_LIMIT;

  const handlePaywall = () => {
    Alert.alert('More than one word', 'Not built yet.');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Your KATSU</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            This is what you will hear when you skip. Write it as the person who decided to change.
          </ThemedText>

          {messages.map((message) => (
            <ThemedView key={message.id} type="backgroundElement" style={styles.row}>
              <ThemedText style={styles.rowText}>{message.text}</ThemedText>
              <View style={styles.rowActions}>
                <Pressable onPress={() => handleEdit(message)} hitSlop={Spacing.two}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Edit
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => handleDelete(message)} hitSlop={Spacing.two}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Delete
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))}

          {needsPaywall ? (
            <Pressable onPress={handlePaywall}>
              <ThemedView type="backgroundElement" style={styles.form}>
                <ThemedText type="smallBold">Write another one</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  One word is free. More than one is part of the paid plan.
                </ThemedText>
              </ThemedView>
            </Pressable>
          ) : (
            <ThemedView type="backgroundElement" style={styles.form}>
              <ThemedText type="smallBold">
                {editingId ? 'Edit your words' : 'Write your words'}
              </ThemedText>
              {/* ⚠ この一行を消さないこと。厳しさと有害さの境目を先に示す(spec §2) */}
              <ThemedText type="small" themeColor="textSecondary">
                It&apos;s okay to challenge an action. Don&apos;t attack the person.
              </ThemedText>
              <TextInput
                value={draft}
                onChangeText={handleChangeDraft}
                placeholder="You said you were going to change."
                placeholderTextColor={theme.textSecondary}
                multiline
                maxLength={MESSAGE_MAX_LENGTH}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.backgroundSelected },
                ]}
              />
              {/* 上限が短いので、黙って切られるのではなく残りが見えるようにする */}
              <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
                {draft.length} / {MESSAGE_MAX_LENGTH}
              </ThemedText>
              <View style={styles.formActions}>
                <Pressable onPress={handleSubmit} hitSlop={Spacing.two}>
                  <ThemedText type="smallBold">Save</ThemedText>
                </Pressable>
                {editingId && (
                  <Pressable onPress={resetForm} hitSlop={Spacing.two}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Cancel
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </ThemedView>
          )}

          {/*
            Tier 1 ハードストップ。
            ⚠ 「危機を検知した」と読める書き方をしないこと。静的判定であり見逃しは大量にある。
              責めない・驚かせない・説教しない。モーダルで閉じ込めない(spec §2)。
          */}
          {isBlocked && (
            <ThemedView type="backgroundElement" style={styles.guard}>
              <ThemedText type="small">
                This one can&apos;t be saved as a notification.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                It might be worth saying to someone directly, rather than to yourself at 7am.
              </ThemedText>
              <ExternalLink href={HELPLINE_URL}>
                <ThemedText type="smallBold">Find a helpline</ThemedText>
              </ExternalLink>
              <ThemedText type="small" themeColor="textSecondary">
                In an emergency, call your local emergency number.
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  row: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  rowText: {
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  form: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  guard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});
