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

import { Paywall } from '@/components/paywall';
import { RoutinePicker } from '@/components/routine-picker';
import { SelfHarmNotice } from '@/components/self-harm-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FREE_MESSAGE_LIMIT, MESSAGE_MAX_LENGTH } from '@/constants/messages';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { syncScheduledNotifications } from '@/lib/notifications';
import { isPro } from '@/lib/purchases';
import { countChars, truncateChars } from '@/lib/text';
import {
  addMessage,
  deleteMessage,
  getMessages,
  getRoutines,
  SelfHarmTextError,
  setMessageRoutine,
  updateMessage,
} from '@/storage';
import type { KatsuMessage, RoutineItem } from '@/types';

export default function KatsuScreen() {
  const theme = useTheme();
  const [messages, setMessages] = useState<KatsuMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  // Tier 1 で止めたことを一度だけ伝えるための状態。draft が変われば消える
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  /** ピッカーを開いている言葉。null なら閉じている(課金機会③) */
  const [pickingId, setPickingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setMessages(await getMessages());
    setRoutines(await getRoutines());
    // 取得に失敗してもキャッシュで通す。課金の障害でコア体験を止めない
    setIsPaid(await isPro());
    // 文言が通知の本文そのもの。書き換えたら予約も貼り直す
    await syncScheduledNotifications();
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
    // TextInput の maxLength は UTF-16 単位で数えるため使わない。
    // 絵文字が2文字扱いになり、見た目の文字数と合わなくなる
    setDraft(truncateChars(next, MESSAGE_MAX_LENGTH));
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

  /**
   * ⚠ 課金機会③: 項目ごとに言葉を出し分けようとしたとき。それ以外でペイウォールを出さない。
   *   無料の人にも行は見せる ── 隠すと存在に気づけず、③ が課金機会として成立しない。
   */
  const handlePickRoutine = (message: KatsuMessage) => {
    if (!isPaid) {
      setIsPaywallOpen(true);
      return;
    }
    setPickingId(message.id);
  };

  /** 割り当て先の表示名。ルーティンが消えていれば共通扱いに落ちる */
  const routineLabel = (message: KatsuMessage) =>
    routines.find((routine) => routine.id === message.routineId)?.title ?? 'All routines';

  // ⚠ 課金機会②: 2つ目の言葉を書こうとしたとき。それ以外でペイウォールを出さない
  const needsPaywall = !editingId && !isPaid && messages.length >= FREE_MESSAGE_LIMIT;

  /**
   * 課金が切れているときに触れなくなる言葉。
   * ⚠ **削除しない。**ロック表示のまま保持し、再課金で復活させる(spec §2)。
   *   ユーザーが感情を込めて書いたものを消すのは、このアプリでは特に許されない。
   */
  const lockedIds = isPaid ? [] : messages.slice(FREE_MESSAGE_LIMIT).map((m) => m.id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Your KATSU</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            This is what you will hear when you skip. Write it as the person who decided to change.
          </ThemedText>

          {messages.map((message) => {
            const isLocked = lockedIds.includes(message.id);
            return (
              <ThemedView key={message.id} type="backgroundElement" style={styles.row}>
                <ThemedText style={styles.rowText} themeColor={isLocked ? 'textSecondary' : 'text'}>
                  {message.text}
                </ThemedText>
                {isLocked ? (
                  <Pressable onPress={() => setIsPaywallOpen(true)} hitSlop={Spacing.two}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Locked ── still yours
                    </ThemedText>
                  </Pressable>
                ) : (
                  <View style={styles.rowActions}>
                    {/* ⚠ 課金機会③ の入口。押した先で無料なら Paywall、有料ならピッカー */}
                    <Pressable onPress={() => handlePickRoutine(message)} hitSlop={Spacing.two}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        For: {routineLabel(message)} ▾
                      </ThemedText>
                    </Pressable>
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
                )}
              </ThemedView>
            );
          })}

          {needsPaywall ? (
            <Pressable onPress={() => setIsPaywallOpen(true)}>
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
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.backgroundSelected },
                ]}
              />
              {/* 上限が短いので、黙って切られるのではなく残りが見えるようにする */}
              <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
                {countChars(draft)} / {MESSAGE_MAX_LENGTH}
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
          {isBlocked && <SelfHarmNotice />}
        </ScrollView>
      </SafeAreaView>

      <Paywall
        visible={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onPurchased={refresh}
      />

      {pickingId && (
        <RoutinePicker
          visible
          routines={routines}
          selectedId={messages.find((message) => message.id === pickingId)?.routineId}
          onSelect={async (routineId) => {
            await setMessageRoutine(pickingId, routineId);
            // 予約済みの通知の本文が変わるので貼り直す
            await refresh();
          }}
          onClose={() => setPickingId(null)}
        />
      )}
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
    flexWrap: 'wrap',
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
});
