/**
 * Today 画面。
 * 今日のルーティンを時刻順に並べ、タップでチェックする。
 *
 * ⚠ 未完了を失敗として見せないこと。赤字・警告・残り件数の煽りを置かない。
 *   進捗は出すが、足りないことを責める形にしない(UX禁止事項)。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  AppState as RNAppState,
  type AppStateStatus,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckMark } from '@/components/check-mark';
import { GraduationModal } from '@/components/graduation-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { formatDateKey, todayKey } from '@/lib/date';
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

  // 毎日ローリングで判定する。Day 30 固定ではないので「失敗した瞬間」が生まれない
  const checkGraduation = useCallback(async () => {
    const progress = await evaluateGraduation();
    if (progress?.shouldOffer) setIsGraduationOpen(true);
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

  const hasWords = messages.length > 0;
  const isBlocked = permission !== null && permission !== 'granted';
  // 通知を切っている人にも同じ言葉が届くようにする(spec §4 通知実装の制約-1)。
  // 文言が無いときはアプリ側の定型文で埋めない
  const fallbackWord = isBlocked ? messages[0]?.text : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="subtitle">{t.today.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDateKey(record?.date ?? todayKey())}
              </ThemedText>
            </View>
            {/* ⚠ 分母を煽りに使わない。数字を置くだけで、色も強調も付けない */}
            <ThemedText type="smallBold" themeColor="textSecondary">
              {doneCount} / {record?.totalCount ?? 0}
            </ThemedText>
          </View>

          {fallbackWord && (
            <ThemedView type="backgroundSelected" style={styles.word}>
              <ThemedText>{fallbackWord}</ThemedText>
            </ThemedView>
          )}

          {isBlocked && hasWords && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="smallBold">{t.today.notificationsTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t.today.notificationsBody}
              </ThemedText>
              <Button label={t.today.notificationsAction} onPress={handleEnableNotifications} />
            </ThemedView>
          )}

          {routines.length > 0 && !hasWords && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="smallBold">{t.today.noWordsTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t.today.noWordsBody}
              </ThemedText>
            </ThemedView>
          )}

          {routines.length === 0 && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="smallBold">{t.today.emptyTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t.today.emptyBody}
              </ThemedText>
            </ThemedView>
          )}

          {routines.map((routine) => {
            const isDone = completedIds.includes(routine.id);
            const isFocused = routine.id === focusedId;
            return (
              <Pressable
                key={routine.id}
                onPress={() => handleToggle(routine.id)}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <ThemedView
                  type={isDone ? 'backgroundSelected' : 'backgroundElement'}
                  style={[
                    styles.row,
                    isFocused && [styles.rowFocused, { borderColor: theme.accent }],
                  ]}>
                  <CheckMark isChecked={isDone} />
                  <View style={styles.rowBody}>
                    <ThemedText numberOfLines={2} themeColor={isDone ? 'textSecondary' : 'text'}>
                      {routine.title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {routine.time}
                    </ThemedText>
                  </View>
                </ThemedView>
              </Pressable>
            );
          })}
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
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    gap: Spacing.half,
  },
  word: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  notice: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    // ⚠ 行そのものがチェックのタップ領域。小さくしないこと
    minHeight: 64,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  rowFocused: {
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
  },
});
