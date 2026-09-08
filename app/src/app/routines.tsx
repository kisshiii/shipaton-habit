/**
 * Routine setup 画面。
 * 毎日同じ時刻に繰り返す行動を登録・編集・削除する。上限 8 件。
 *
 * ⚠ 上限に達したときの文言を警告にしないこと。制限そのものがメッセージ(spec §2 登録上限)。
 * ⚠ 時刻はホイールで選ばせる。手で打たせない(`time-field.tsx`)。
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GraduationModal } from '@/components/graduation-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeField } from '@/components/time-field';
import { MAX_ROUTINES } from '@/constants/routines';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
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
const DEFAULT_TIME = '07:00';

export default function RoutinesScreen() {
  const theme = useTheme();
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [time, setTime] = useState(DEFAULT_TIME);
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
    setTime(DEFAULT_TIME);
    setTitle('');
  };

  const handleSubmit = async () => {
    // ⚠ 時刻はピッカーから来るので不正な値が入らない。検証が要るのは題名だけ
    if (!title.trim()) {
      Alert.alert(t.routines.missingTitle, t.routines.missingTitleBody);
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
        Alert.alert(t.routines.limitTitle, t.routines.limitBody);
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
    Alert.alert(t.routines.removeTitle, `${routine.time}  ${routine.title}`, [
      { text: t.routines.cancel, style: 'cancel' },
      {
        text: t.routines.remove,
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
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <ThemedText type="subtitle">{t.routines.title}</ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {routines.length} / {MAX_ROUTINES}
              </ThemedText>
            </View>

            {routines.length === 0 && (
              <ThemedView type="backgroundElement" style={styles.empty}>
                <ThemedText type="smallBold">{t.routines.emptyTitle}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.routines.emptyBody}
                </ThemedText>
              </ThemedView>
            )}

            {routines.map((routine) => {
              const isEditing = routine.id === editingId;
              return (
                <ThemedView
                  key={routine.id}
                  type={isEditing ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.row}>
                  <View style={styles.rowMain}>
                    <View style={[styles.timeBadge, { backgroundColor: theme.accent }]}>
                      <ThemedText type="smallBold" themeColor="accentText">
                        {routine.time}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.rowTitle} numberOfLines={2}>
                      {routine.title}
                    </ThemedText>
                  </View>
                  {/* ⚠ 文字リンクにしない。44pt を確保して押せるものだと分かる形にする */}
                  <View style={styles.rowActions}>
                    <Button label={t.routines.edit} variant="plain" onPress={() => handleEdit(routine)} />
                    <Pressable
                      onPress={() => handleDelete(routine)}
                      style={styles.deleteHit}
                      hitSlop={Spacing.two}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        {t.routines.delete}
                      </ThemedText>
                    </Pressable>
                  </View>
                </ThemedView>
              );
            })}

            {isFull ? (
              <ThemedView type="backgroundElement" style={styles.empty}>
                <ThemedText type="smallBold">{t.routines.fullTitle}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.routines.fullBody}
                </ThemedText>
              </ThemedView>
            ) : (
              <ThemedView type="backgroundElement" style={styles.form}>
                <ThemedText type="smallBold">
                  {editingId ? t.routines.editTitle : t.routines.addTitle}
                </ThemedText>

                <TimeField value={time} onChange={setTime} label={t.routines.time} />

                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t.routines.titlePlaceholder}
                  placeholderTextColor={theme.textSecondary}
                  maxLength={TITLE_MAX_LENGTH}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.backgroundSelected },
                  ]}
                />

                <Button
                  label={editingId ? t.routines.save : t.routines.add}
                  onPress={handleSubmit}
                />
                {editingId && (
                  <Button label={t.routines.cancel} variant="plain" onPress={resetForm} />
                )}
              </ThemedView>
            )}

            {/*
              自主卒業(spec §2)。判定を待たずにいつでも降りられるようにする。
              ⚠ 思想としてはこちらが本体。アプリが許可を出すのではなく、ユーザーが決める。
                目立たせる必要はないが、隠さないこと。常時ここに置く。
            */}
            <Pressable
              onPress={() => setIsGraduationOpen(true)}
              style={styles.graduate}
              hitSlop={Spacing.two}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.graduateText}>
                {t.routines.graduate}
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* 判定で出るものと同じモーダル。自分で呼んだ場合は「表示済み」にしない */}
      <GraduationModal visible={isGraduationOpen} onClose={() => setIsGraduationOpen(false)} />
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
  },
  empty: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  row: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowTitle: {
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
  },
  deleteHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  form: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    fontSize: 16,
  },
  graduate: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  graduateText: {
    textDecorationLine: 'underline',
  },
});
