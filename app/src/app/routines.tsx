/**
 * Routine setup 画面。
 * 毎日同じ時刻に繰り返す行動を登録・編集・削除する。上限 8 件。
 *
 * ⚠ 上限に達したときの文言を警告にしないこと。制限そのものがメッセージ(spec §2 登録上限)。
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GraduationModal } from '@/components/graduation-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { MAX_ROUTINES } from '@/constants/routines';
import { useTheme } from '@/hooks/use-theme';
import { normalizeTime } from '@/lib/date';
import { syncScheduledNotifications } from '@/lib/notifications';
import {
  addRoutine,
  deleteRoutine,
  getRoutines,
  RoutineLimitError,
  updateRoutine,
} from '@/storage';
import type { RoutineItem } from '@/types';

const TITLE_MAX_LENGTH = 40;

export default function RoutinesScreen() {
  const theme = useTheme();
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGraduationOpen, setIsGraduationOpen] = useState(false);

  const refresh = useCallback(async () => {
    setRoutines(await getRoutines());
    // 時刻・件数が変われば予約集合も変わる。引き直しは冪等なので毎回でよい
    await syncScheduledNotifications();
  }, []);

  // 画面に戻るたびに読み直す(Today 画面での操作を反映するため)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const resetForm = () => {
    setEditingId(null);
    setTime('');
    setTitle('');
  };

  const handleSubmit = async () => {
    if (normalizeTime(time) === null) {
      Alert.alert('Check the time', 'Use 24-hour format, like 07:00.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Add a title', 'Write what you will do at that time.');
      return;
    }

    try {
      if (editingId) {
        await updateRoutine(editingId, { time, title });
      } else {
        await addRoutine({ time, title });
      }
      resetForm();
      await refresh();
    } catch (error) {
      if (error instanceof RoutineLimitError) {
        Alert.alert('Start with a few', 'You can add more after you graduate.');
        return;
      }
      throw error;
    }
  };

  const handleEdit = (routine: RoutineItem) => {
    setEditingId(routine.id);
    setTime(routine.time);
    setTitle(routine.title);
  };

  const handleDelete = (routine: RoutineItem) => {
    Alert.alert('Remove this routine?', `${routine.time}  ${routine.title}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteRoutine(routine.id);
          if (editingId === routine.id) resetForm();
          await refresh();
        },
      },
    ]);
  };

  const isFull = routines.length >= MAX_ROUTINES && !editingId;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ThemedText type="subtitle">Routines</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {routines.length} / {MAX_ROUTINES}
            </ThemedText>
          </View>

          {routines.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing yet. Add something you will do every day at the same time.
            </ThemedText>
          )}

          {routines.map((routine) => (
            <ThemedView key={routine.id} type="backgroundElement" style={styles.row}>
              <View style={[styles.timeBadge, { backgroundColor: theme.accent }]}>
                <ThemedText type="smallBold" themeColor="accentText">
                  {routine.time}
                </ThemedText>
              </View>
              <ThemedText style={styles.rowTitle} numberOfLines={2}>
                {routine.title}
              </ThemedText>
              <Pressable onPress={() => handleEdit(routine)} hitSlop={Spacing.two}>
                <ThemedText type="smallBold" themeColor="accent">
                  Edit
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => handleDelete(routine)} hitSlop={Spacing.two}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Delete
                </ThemedText>
              </Pressable>
            </ThemedView>
          ))}

          {isFull ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.limitNote}>
              Start with a few. You can add more after you graduate.
            </ThemedText>
          ) : (
            <ThemedView type="backgroundElement" style={styles.form}>
              <ThemedText type="smallBold">
                {editingId ? 'Edit routine' : 'Add a routine'}
              </ThemedText>
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="07:00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Drink a glass of water"
                placeholderTextColor={theme.textSecondary}
                maxLength={TITLE_MAX_LENGTH}
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />
              <View style={styles.formActions}>
                <Pressable onPress={handleSubmit} hitSlop={Spacing.two}>
                  <ThemedText type="smallBold" themeColor="accent">
                    {editingId ? 'Save' : 'Add'}
                  </ThemedText>
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
            自主卒業(spec §2)。判定を待たずにいつでも降りられるようにする。
            ⚠ 思想としてはこちらが本体。アプリが許可を出すのではなく、ユーザーが決める。
              目立たせる必要はないが、隠さないこと。常時ここに置く。
          */}
          <Pressable onPress={() => setIsGraduationOpen(true)} hitSlop={Spacing.two}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.graduate}>
              I don&apos;t need this anymore
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {/* 判定で出るものと同じモーダル。自分で呼んだ場合は「表示済み」にしない */}
      <GraduationModal
        visible={isGraduationOpen}
        onClose={() => setIsGraduationOpen(false)}
      />
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
  rowTitle: {
    flex: 1,
  },
  timeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
  },
  form: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
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
  },
  limitNote: {
    paddingVertical: Spacing.three,
  },
  graduate: {
    paddingTop: Spacing.four,
    textDecorationLine: 'underline',
  },
});
