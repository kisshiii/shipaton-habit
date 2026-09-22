/**
 * Your KATSU 画面。
 * サボっているときに自分へ届ける言葉を書く。ここがこのアプリの核。
 * ⚠ ここで扱う文字列は端末外に出さない。ログにも出さない(CLAUDE.md プライバシー)。
 *
 * ⚠ 言葉は箱に入れず、明朝で手紙として並べる。この画面で一番強い要素は
 *   ユーザーが書いた言葉であること(2026-09-16 デザイン方針)。
 * ⚠ 行の操作は2つに絞る。届け先のチップ(課金機会③の入口なので見える位置に残す)と
 *   「···」(編集・削除)。入力は下から出るシートで行う。
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Paywall } from '@/components/paywall';
import { RoutinePicker } from '@/components/routine-picker';
import { SelfHarmNotice } from '@/components/self-harm-notice';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FREE_MESSAGE_LIMIT, MESSAGE_MAX_LENGTH } from '@/constants/messages';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
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

/** 書くシートの中身。`id` があれば編集 */
type Draft = { id?: string; text: string };

export default function KatsuScreen() {
  const theme = useTheme();
  const [messages, setMessages] = useState<KatsuMessage[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  /** ピッカーを開いている言葉。null なら閉じている(課金機会③) */
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

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

  const handleDelete = (message: KatsuMessage) => {
    Alert.alert(t.katsu.deleteTitle, t.katsu.deleteBody, [
      { text: t.katsu.cancel, style: 'cancel' },
      {
        text: t.katsu.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteMessage(message.id);
          await refresh();
        },
      },
    ]);
  };

  const handleMore = (message: KatsuMessage) => {
    const edit = () => setDraft({ id: message.id, text: message.text });
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t.katsu.edit, t.katsu.delete, t.katsu.cancel],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) edit();
          if (index === 1) handleDelete(message);
        },
      );
      return;
    }
    Alert.alert(message.text, undefined, [
      { text: t.katsu.edit, onPress: edit },
      { text: t.katsu.delete, style: 'destructive', onPress: () => handleDelete(message) },
      { text: t.katsu.cancel, style: 'cancel' },
    ]);
  };

  /**
   * ⚠ 課金機会③: 項目ごとに言葉を出し分けようとしたとき。それ以外でペイウォールを出さない。
   *   無料の人にもチップは見せる ── 隠すと存在に気づけず、③ が課金機会として成立しない。
   */
  const handlePickRoutine = (message: KatsuMessage) => {
    if (!isPaid) {
      setIsPaywallOpen(true);
      return;
    }
    setPickingId(message.id);
  };

  /** 割り当て先の表示名。ルーティンが消えていれば共通扱いに落ちる */
  const routineLabel = (message: KatsuMessage) => {
    const routine = routines.find((item) => item.id === message.routineId);
    return routine ? `${routine.time} ${routine.title}` : t.katsu.allRoutines;
  };

  // ⚠ 課金機会②: 2つ目の言葉を書こうとしたとき。それ以外でペイウォールを出さない
  const needsPaywall = !isPaid && messages.length >= FREE_MESSAGE_LIMIT;

  /**
   * 課金が切れているときに触れなくなる言葉。
   * ⚠ **削除しない。**ロック表示のまま保持し、再課金で復活させる(spec §2)。
   *   ユーザーが感情を込めて書いたものを消すのは、このアプリでは特に許されない。
   */
  const lockedIds = isPaid ? [] : messages.slice(FREE_MESSAGE_LIMIT).map((m) => m.id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="display">{t.katsu.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t.katsu.intro}
            </ThemedText>
            {/* ⚠ 同じ対象に複数あると日替わりになる。黙っていると不具合に見える */}
            {messages.length > 1 && (
              <ThemedText type="small" themeColor="textSecondary">
                {t.katsu.rotation}
              </ThemedText>
            )}
          </View>

          {messages.length === 0 && (
            <EmptyState symbol="quote.bubble" title={t.katsu.emptyTitle} body={t.katsu.emptyBody} />
          )}

          {messages.map((message) => {
            const isLocked = lockedIds.includes(message.id);
            return (
              <View key={message.id} style={[styles.word, { borderTopColor: theme.line }]}>
                <ThemedText
                  style={[styles.quoteMark, { color: theme.accent }]}
                  // ⚠ 飾りなので文字サイズの設定で拡大しない。高さが固定なので、拡大すると本文に重なる
                  allowFontScaling={false}
                  accessibilityElementsHidden>
                  “
                </ThemedText>
                <ThemedText type="voice" themeColor={isLocked ? 'textSecondary' : 'text'}>
                  {message.text}
                </ThemedText>
                <View style={styles.wordMeta}>
                  {isLocked ? (
                    <Chip
                      symbol="lock.fill"
                      label={t.katsu.locked}
                      muted
                      onPress={() => setIsPaywallOpen(true)}
                    />
                  ) : (
                    <>
                      {/* ⚠ 課金機会③ の入口。押した先で無料なら Paywall、有料ならピッカー */}
                      <Chip
                        label={`${routineLabel(message)} ▾`}
                        accessibilityLabel={`${t.katsu.forPrefix} ${routineLabel(message)}`}
                        onPress={() => handlePickRoutine(message)}
                      />
                      <Pressable
                        onPress={() => handleMore(message)}
                        hitSlop={Spacing.two}
                        accessibilityRole="button"
                        accessibilityLabel={t.katsu.more}
                        style={styles.more}>
                        <SymbolView name="ellipsis" size={18} tintColor={theme.textSecondary} />
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })}

          {needsPaywall && (
            <EmptyState
              symbol="plus.bubble"
              title={t.katsu.anotherTitle}
              body={t.katsu.anotherBody}
              action={
                <Button label={t.katsu.anotherAction} onPress={() => setIsPaywallOpen(true)} />
              }
            />
          )}
        </ScrollView>

        {/*
          ⚠ 下の余白は OS に決めさせる。タブの中の画面では、安全領域の下端がタブバーの上端になる。
            タブバーの高さを定数で足すと、機種・iOS のタブバーの形・文字サイズで食い違い、
            ボタンがタブバーに重なる(iPhone 15 の実機で発覚 2026-09-22)。
        */}
        {!needsPaywall && (
          <SafeAreaView edges={['bottom']}>
            <View style={styles.footer}>
              <Button label={t.katsu.writeTitle} onPress={() => setDraft({ text: '' })} />
            </View>
          </SafeAreaView>
        )}
      </SafeAreaView>

      {draft && (
        <Composer
          key={draft.id ?? 'new'}
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={refresh}
        />
      )}

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

function Chip({
  label,
  onPress,
  symbol,
  muted,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  symbol?: 'lock.fill';
  muted?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const color = muted ? theme.textSecondary : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={Spacing.one}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: theme.line },
        pressed && styles.pressed,
      ]}>
      {symbol && <SymbolView name={symbol} size={12} tintColor={color} />}
      <ThemedText type="smallBold" numberOfLines={1} style={[styles.chipLabel, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Composer({
  draft,
  onClose,
  onSaved,
}: {
  draft: Draft;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const theme = useTheme();
  const [text, setText] = useState(draft.text);
  // Tier 1 で止めたことを一度だけ伝えるための状態。書き直せば消える
  const [isBlocked, setIsBlocked] = useState(false);

  const handleChange = (next: string) => {
    // TextInput の maxLength は UTF-16 単位で数えるため使わない。
    // 絵文字が2文字扱いになり、見た目の文字数と合わなくなる
    setText(truncateChars(next, MESSAGE_MAX_LENGTH));
    // 書き直し始めた時点で引っ込める。繰り返し出すと威圧になる
    if (isBlocked) setIsBlocked(false);
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert(t.katsu.emptyTitle, t.katsu.emptyBody);
      return;
    }
    try {
      if (draft.id) {
        await updateMessage(draft.id, text);
      } else {
        await addMessage(text);
      }
      await onSaved();
      onClose();
    } catch (error) {
      if (error instanceof SelfHarmTextError) {
        // ⚠ 弾いた文言は消さない。書いた本人から取り上げるようなことはしない
        setIsBlocked(true);
        return;
      }
      throw error;
    }
  };

  return (
    <Sheet visible onClose={onClose} title={draft.id ? t.katsu.editTitle : t.katsu.writeTitle}>
      {/* ⚠ この一行を消さないこと。厳しさと有害さの境目を先に示す(spec §2) */}
      <ThemedText type="small" themeColor="textSecondary">
        {t.katsu.guardrail}
      </ThemedText>
      <TextInput
        value={text}
        onChangeText={handleChange}
        placeholder={t.katsu.placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline
        autoFocus
        // ⚠ 通知の本文に改行は要らない。Return は閉じる動作に使う
        submitBehavior="blurAndSubmit"
        returnKeyType="done"
        style={[styles.input, { color: theme.text, borderColor: theme.line }]}
      />
      {/* 上限が短いので、黙って切られるのではなく残りが見えるようにする */}
      <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
        {countChars(text)} / {MESSAGE_MAX_LENGTH}
      </ThemedText>
      {/*
        Tier 1 ハードストップ。
        ⚠ 「危機を検知した」と読める書き方をしないこと。静的判定であり見逃しは大量にある。
          責めない・驚かせない・説教しない(spec §2)。
      */}
      {isBlocked && <SelfHarmNotice />}
      <Button label={draft.id ? t.katsu.saveEdit : t.katsu.save} onPress={handleSubmit} />
      <Button label={t.katsu.cancel} variant="plain" onPress={onClose} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  header: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  word: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // ⚠ 引用符は飾りではなく「これは手紙だ」という印。読み上げからは外す
  quoteMark: {
    fontFamily: Fonts?.voice,
    fontSize: 40,
    lineHeight: 40,
    height: 22,
  },
  wordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  chip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 32,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: 999,
  },
  chipLabel: {
    flexShrink: 1,
    fontSize: 13,
  },
  more: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: 120,
    textAlignVertical: 'top',
    // ⚠ 書いている最中から手紙の書体で見せる
    fontFamily: Fonts?.voice,
    fontSize: 19,
    lineHeight: 30,
  },
  counter: {
    alignSelf: 'flex-end',
  },
});
