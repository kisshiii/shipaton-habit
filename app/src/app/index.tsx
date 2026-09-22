/**
 * Today 画面。
 * 今日のルーティンを時刻表として並べ、タップでチェックする。
 *
 * ⚠ 未完了を失敗として見せないこと。赤字・警告・残り件数の煽りを置かない。
 *   進捗は出すが、足りないことを責める形にしない(UX禁止事項)。
 *
 * ⚠ 見出しは日付。「今日」はタブ名と同じで情報が増えない(2026-09-16 デザイン方針)。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppState as RNAppState, type AppStateStatus, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckMark } from '@/components/check-mark';
import { EmptyState } from '@/components/empty-state';
import { GraduationModal } from '@/components/graduation-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimetableList, TimetableRow } from '@/components/timetable-row';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { formatMonthDay, formatWeekday, todayKey } from '@/lib/date';
import { evaluateGraduation } from '@/lib/graduation';
import {
  getNotificationPermission,
  requestNotificationPermission,
  syncScheduledNotifications,
} from '@/lib/notifications';
import { getMessages, getRoutines, getTodayRecord, markGraduated, toggleCompletion } from '@/storage';
import type { DailyRecord, KatsuMessage, RoutineItem } from '@/types';

export default function TodayScreen() {
  const theme = useTheme();
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [messages, setMessages] = useState<KatsuMessage[]>([]);
  const [permission, setPermission] = useState<string | null>(null);
  const [isGraduationOpen, setIsGraduationOpen] = useState(false);
  const dateRef = useRef(todayKey());

  // 通知から開かれたとき、どの項目の話だったかを見失わせない
  const { routineId: focusedId } = useLocalSearchParams<{ routineId?: string }>();

  // 毎日判定する。連続66日に達した日に一度だけ卒業を出す(spec §2 卒業の扱い)
  const checkGraduation = useCallback(async () => {
    const status = await evaluateGraduation();
    if (status?.shouldOffer) setIsGraduationOpen(true);
  }, []);

  const refresh = useCallback(async () => {
    const [nextRoutines, nextRecord, nextMessages, nextPermission] = await Promise.all([
      getRoutines(),
      getTodayRecord(),
      getMessages(),
      getNotificationPermission(),
    ]);
    dateRef.current = nextRecord.date;
    setRoutines(nextRoutines);
    setRecord(nextRecord);
    setMessages(nextMessages);
    setPermission(nextPermission);
    // 開くたびに予約を引き直す。7日開かなくても通知が尽きない
    await syncScheduledNotifications();
    await checkGraduation();
  }, [checkGraduation]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // 日付をまたいだ状態でアプリに戻ってきたとき、昨日のチェックを出したままにしない
  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active' && dateRef.current !== todayKey()) refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const handleToggle = async (routineId: string) => {
    const wasDone = record?.completedIds.includes(routineId) ?? false;
    // 付けたときは軽く叩く。外したときは最小限にとどめ、取り消しを演出しない
    (wasDone
      ? Haptics.selectionAsync()
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    ).catch(() => {});
    setRecord(await toggleCompletion(routineId));
    // 完了した項目の通知を消す。「終わってるのに煽られる」を防ぐ最後の砦
    await syncScheduledNotifications();
    // その日の最後の1件を押した瞬間に条件を満たすことがある。
    // 次にタブを開き直すまで待たせない
    await checkGraduation();
  };

  // 閉じた時点で「表示済み」を記録する。二度と出さない(spec §2 卒業モーダル)
  const handleCloseGraduation = async () => {
    setIsGraduationOpen(false);
    await markGraduated();
  };

  const handleEnableNotifications = async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    await syncScheduledNotifications();
  };

  // チェックが付いた項目は必ず分母にも入るため、分子は completedIds の数そのもの
  // (spec §2 判定の細部)
  const completedIds = record?.completedIds ?? [];
  const doneCount = completedIds.length;
  const totalCount = record?.totalCount ?? 0;
  const dateKey = record?.date ?? todayKey();

  const hasRoutines = routines.length > 0;
  const hasWords = messages.length > 0;
  const isBlocked = permission !== null && permission !== 'granted';
  const isAllDone = hasRoutines && totalCount > 0 && doneCount >= totalCount;
  // 通知を切っている人にも同じ言葉が届くようにする(spec §4 通知実装の制約-1)。
  // 文言が無いときはアプリ側の定型文で埋めない
  const fallbackWord = isBlocked ? messages[0]?.text : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/*
          ⚠ 下端の余白は iOS に決めさせる(automatic)。画面はタブバーの下まで伸びているので、
            タブバーの高さを定数で足すと、機種やタブバーの形によって最後の行が隠れる
        */}
        <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
          <View style={styles.header}>
            <ThemedText type="display">{formatMonthDay(dateKey)}</ThemedText>
            {/* ⚠ 分母を煽りに使わない。文の中に置くだけで、色も強調も付けない */}
            <ThemedText type="small" themeColor="textSecondary">
              {formatWeekday(dateKey)}
              {hasRoutines ? `  ·  ${t.today.progress(doneCount, totalCount)}` : ''}
            </ThemedText>
          </View>

          {/* ⚠ ユーザーの言葉は手紙として出す。案内の灰色の箱と混ぜない */}
          {fallbackWord && (
            <ThemedView type="card" style={[styles.letter, { borderColor: theme.line }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {t.today.fallbackMeta}
              </ThemedText>
              <ThemedText type="voice">{fallbackWord}</ThemedText>
            </ThemedView>
          )}

          {isBlocked && hasWords && (
            <EmptyState
              symbol="bell.badge"
              title={t.today.notificationsTitle}
              body={t.today.notificationsBody}
              action={
                <Button label={t.today.notificationsAction} onPress={handleEnableNotifications} />
              }
            />
          )}

          {hasRoutines && !hasWords && (
            <EmptyState symbol="quote.bubble" title={t.today.noWordsTitle} body={t.today.noWordsBody} />
          )}

          {!hasRoutines && (
            <EmptyState symbol="clock" title={t.today.emptyTitle} body={t.today.emptyBody} />
          )}

          {hasRoutines && (
            <TimetableList>
              {routines.map((routine) => {
                const isDone = completedIds.includes(routine.id);
                return (
                  <TimetableRow
                    key={routine.id}
                    time={routine.time}
                    title={routine.title}
                    dimmed={isDone}
                    focused={routine.id === focusedId}
                    onPress={() => handleToggle(routine.id)}
                    trailing={<CheckMark isChecked={isDone} />}
                    // ⚠ VoiceOver では丸印が見えない。行が「何時の何を、済ませたか」を
                    //   自分で名乗ること。記号側は読み上げから外してある
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isDone }}
                    accessibilityLabel={`${routine.time} ${routine.title}, ${
                      isDone ? t.today.doneHint : t.today.notDoneHint
                    }`}
                    accessibilityHint={t.today.toggleHint}
                  />
                );
              })}
            </TimetableList>
          )}

          {/* ⚠ 一行だけ。紙吹雪やお祝いの演出を足さない */}
          {isAllDone && (
            <ThemedText type="voice" themeColor="textSecondary" style={styles.allDone}>
              {t.today.allDone}
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>

      <GraduationModal visible={isGraduationOpen} onClose={handleCloseGraduation} />
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
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  header: {
    gap: Spacing.half,
    paddingTop: Spacing.two,
  },
  letter: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  allDone: {
    textAlign: 'center',
    fontSize: 16,
  },
});
