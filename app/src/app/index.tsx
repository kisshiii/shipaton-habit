/**
 * Today 画面。
 * 今日のルーティンを時刻順に並べ、タップでチェックする。
 * ⚠ 見た目は後回し。動くことを優先している。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  AppState as RNAppState,
  type AppStateStatus,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { todayKey } from '@/lib/date';
import { getRoutines, getTodayCountedIds, getTodayRecord, toggleCompletion } from '@/storage';
import type { DailyRecord, RoutineItem } from '@/types';

export default function TodayScreen() {
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [countedIds, setCountedIds] = useState<string[]>([]);
  const dateRef = useRef(todayKey());

  const refresh = useCallback(async () => {
    const [nextRoutines, nextRecord, nextCountedIds] = await Promise.all([
      getRoutines(),
      getTodayRecord(),
      getTodayCountedIds(),
    ]);
    dateRef.current = nextRecord.date;
    setRoutines(nextRoutines);
    setRecord(nextRecord);
    setCountedIds(nextCountedIds);
  }, []);

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
  };

  const completedIds = record?.completedIds ?? [];
  const doneCount = countedIds.filter((id) => completedIds.includes(id)).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Today</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {doneCount} / {record?.totalCount ?? 0}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {record?.date ?? todayKey()}
          </ThemedText>

          {routines.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No routines yet. Add one in the Routines tab.
            </ThemedText>
          )}

          {routines.map((routine) => {
            const isDone = completedIds.includes(routine.id);
            const isCounted = countedIds.includes(routine.id);
            return (
              <Pressable key={routine.id} onPress={() => handleToggle(routine.id)}>
                <ThemedView
                  type={isDone ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.row}>
                  <ThemedText type="code">{isDone ? '[x]' : '[ ]'}</ThemedText>
                  <ThemedText type="code">{routine.time}</ThemedText>
                  <View style={styles.rowBody}>
                    <ThemedText numberOfLines={2}>{routine.title}</ThemedText>
                    {!isCounted && (
                      <ThemedText type="small" themeColor="textSecondary">
                        Not counted today
                      </ThemedText>
                    )}
                  </View>
                </ThemedView>
              </Pressable>
            );
          })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  rowBody: {
    flex: 1,
  },
});
