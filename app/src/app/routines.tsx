/**
 * Routine setup 画面。
 * 毎日同じ時刻に繰り返す行動を登録・編集・削除する。上限 3 件。
 *
 * ⚠ 上限に達したときの文言を警告にしないこと。制限そのものがメッセージ(spec §2 登録上限)。
 * ⚠ 時刻はホイールで選ばせる。手で打たせない(`time-field.tsx`)。
 * ⚠ 一覧と編集を分ける。入力欄を一覧の下に常に出しておかない。
 *   行を押すと編集シート、追加も同じシートから(2026-09-16 デザイン方針)。
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { GraduationModal } from '@/components/graduation-modal';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeField } from '@/components/time-field';
import { TimetableList, TimetableRow } from '@/components/timetable-row';
import { MAX_ROUTINES } from '@/constants/routines';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
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

/** シートの中身。null なら閉じている */
type SheetTarget = { mode: 'add' } | { mode: 'edit'; routine: RoutineItem };

export default function RoutinesScreen() {
  const theme = useTheme();
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
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

  const isFull = routines.length >= MAX_ROUTINES;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="display">{t.routines.title}</ThemedText>
            <ThemedText type="time" themeColor="textSecondary">
              {routines.length} / {MAX_ROUTINES}
            </ThemedText>
          </View>

          {routines.length === 0 ? (
            <EmptyState symbol="clock" title={t.routines.emptyTitle} body={t.routines.emptyBody} />
          ) : (
            <TimetableList>
              {routines.map((routine) => (
                <TimetableRow
                  key={routine.id}
                  time={routine.time}
                  title={routine.title}
                  onPress={() => setSheet({ mode: 'edit', routine })}
                  trailing={
                    <SymbolView
                      name="chevron.right"
                      size={14}
                      tintColor={theme.textSecondary}
                      accessibilityElementsHidden
                    />
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${routine.time} ${routine.title}`}
                  accessibilityHint={t.routines.editTitle}
                />
              ))}
            </TimetableList>
          )}

          {isFull ? (
            // ⚠ 警告にしない。制限そのものがメッセージ
            <ThemedText type="small" themeColor="textSecondary" style={styles.full}>
              {t.routines.fullBody}
            </ThemedText>
          ) : (
            <Pressable
              onPress={() => setSheet({ mode: 'add' })}
              accessibilityRole="button"
              accessibilityLabel={t.routines.addTitle}
              style={({ pressed }) => [
                styles.add,
                { borderColor: theme.line },
                pressed && styles.pressed,
              ]}>
              <SymbolView name="plus" size={15} tintColor={theme.accent} accessibilityElementsHidden />
              <ThemedText type="smallBold" themeColor="accent">
                {t.routines.addTitle}
              </ThemedText>
            </Pressable>
          )}
        </ScrollView>

        {/*
          自主的にやめる入口(spec §2)。
          ⚠ 画面の下に固定する。一覧の長さにかかわらず、スクロールせずに必ず見えること。
          ⚠ 66日に届く前は「卒業」ではない。押した先のモーダルがそれを伝える。
        */}
        <View style={styles.footer}>
          <Button
            label={t.routines.graduate}
            variant="secondary"
            onPress={() => setIsGraduationOpen(true)}
          />
        </View>
      </SafeAreaView>

      {/* ⚠ key で開くたびに作り直す。前回の入力を持ち越さない */}
      {sheet && (
        <RoutineSheet
          key={sheet.mode === 'edit' ? sheet.routine.id : 'add'}
          target={sheet}
          onClose={() => setSheet(null)}
          onChanged={refresh}
        />
      )}

      {/* 判定で出るものと同じモーダル。自分で呼んだ場合は「表示済み」にしない */}
      <GraduationModal visible={isGraduationOpen} onClose={() => setIsGraduationOpen(false)} />
    </ThemedView>
  );
}

function RoutineSheet({
  target,
  onClose,
  onChanged,
}: {
  target: SheetTarget;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const theme = useTheme();
  const editing = target.mode === 'edit' ? target.routine : null;
  const [time, setTime] = useState(editing?.time ?? DEFAULT_TIME);
  const [title, setTitle] = useState(editing?.title ?? '');

  const handleSubmit = async () => {
    // ⚠ 時刻はピッカーから来るので不正な値が入らない。検証が要るのは題名だけ
    if (!title.trim()) {
      Alert.alert(t.routines.missingTitle, t.routines.missingTitleBody);
      return;
    }
    try {
      if (editing) {
        await updateRoutine(editing.id, { time, title });
      } else {
        await addRoutine({ time, title });
      }
      await onChanged();
      onClose();
    } catch (error) {
      if (error instanceof RoutineLimitError) {
        Alert.alert(t.routines.limitTitle, t.routines.limitBody);
        return;
      }
      throw error;
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert(t.routines.removeTitle, `${editing.time}  ${editing.title}`, [
      { text: t.routines.cancel, style: 'cancel' },
      {
        text: t.routines.remove,
        style: 'destructive',
        onPress: async () => {
          await deleteRoutine(editing.id);
          await onChanged();
          onClose();
        },
      },
    ]);
  };

  return (
    <Sheet visible onClose={onClose} title={editing ? t.routines.editTitle : t.routines.addTitle}>
      <TimeField value={time} onChange={setTime} label={t.routines.time} />
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t.routines.titlePlaceholder}
        placeholderTextColor={theme.textSecondary}
        maxLength={TITLE_MAX_LENGTH}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        autoFocus={!editing}
        style={[styles.input, { color: theme.text, borderColor: theme.line }]}
      />
      <Button label={editing ? t.routines.save : t.routines.add} onPress={handleSubmit} />
      {/* ⚠ 削除はシートの一番下に1つだけ。一覧の各行に並べない */}
      {editing && (
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="danger">
            {t.routines.deleteAction}
          </ThemedText>
        </Pressable>
      )}
      <Button label={t.routines.cancel} variant="plain" onPress={onClose} />
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
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  full: {
    textAlign: 'center',
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 52,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.control,
  },
  pressed: {
    opacity: 0.6,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    fontSize: 16,
  },
  delete: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
