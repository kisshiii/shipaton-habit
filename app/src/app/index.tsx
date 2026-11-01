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
import { GraduationProgress } from '@/components/graduation-progress';
import { MilestoneModal } from '@/components/milestone-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimetableList, TimetableRow } from '@/components/timetable-row';
import { MAX_REST_DAYS, REST_WINDOW_DAYS, REVIEW_MILESTONE } from '@/constants/graduation';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import { formatMonthDay, formatWeekday, todayKey } from '@/lib/date';
import {
  evaluateGraduation,
  milestonesUpTo,
  type GraduationProgress as Progress,
} from '@/lib/graduation';
import { requestReviewOnce } from '@/lib/review';
import { applyWidgetChecks, syncWidget } from '@/lib/widget';
import {
  getNotificationPermission,
  requestNotificationPermission,
  syncScheduledNotifications,
} from '@/lib/notifications';
import { syncQuickActions } from '@/lib/quick-actions';
import {
  getMessages,
  getRoutines,
  getTodayRecord,
  markGraduated,
  markMilestonesCelebrated,
  markOpenedToday,
  markRestartNoticeShown,
  toggleCompletion,
} from '@/storage';
import type { DailyRecord, KatsuMessage, RoutineItem } from '@/types';

export default function TodayScreen() {
  const theme = useTheme();
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [messages, setMessages] = useState<KatsuMessage[]>([]);
  const [permission, setPermission] = useState<string | null>(null);
  const [isGraduationOpen, setIsGraduationOpen] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  /**
   * 休みで数え直したお知らせ。出すと決めた時点で「出した」と記録し、
   * この画面が開いている間は出したままにする(タブを移るたびに消えたり出たりさせない)
   */
  const [isRestartNoticeOpen, setIsRestartNoticeOpen] = useState(false);
  /** その日最初に開いたときの一言(plan §8)。この画面が開いている間は出したままにする */
  const [dailyLine, setDailyLine] = useState<{ text: string; countStartedOn: string } | null>(null);
  const dateRef = useRef(todayKey());
  /** 裏で起こされたとき(通知のボタンなど)に、一言・お知らせを出さずに済ませた。前に出たら読み直す */
  const isGreetingPendingRef = useRef(false);

  // 通知から開かれたとき、どの項目の話だったかを見失わせない
  const { routineId: focusedId, opened } = useLocalSearchParams<{ routineId?: string; opened?: string }>();

  // 毎日判定する。やり切った日が66日に達した日に一度だけ卒業を出す(spec §2 卒業の扱い)
  const checkGraduation = useCallback(async () => {
    const status = await evaluateGraduation();
    setProgress(status?.progress ?? null);
    // ホーム画面・ロック画面のウィジェットも同じ数字にそろえる(plan §7-6)
    syncWidget();
    if (status?.shouldOffer) setIsGraduationOpen(true);
    if (status?.milestone) setMilestone(status.milestone);
    // ルーティンを変えて数え直したら、出していた昨日の一言は引っ込める(数字が合わなくなる)
    setDailyLine((line) =>
      line && line.countStartedOn !== status?.progress.countStartedOn ? null : line,
    );
    // ⚠ アプリが前に出ていないときは「出した」「今日はもう開いた」と記録しない。
    // 本人が見ていない一言・お知らせを、見たことにしてしまうため(2026-11-01 のレビュー)
    if (RNAppState.currentState !== 'active') {
      isGreetingPendingRef.current = true;
      return;
    }
    isGreetingPendingRef.current = false;
    if (status?.showRestartNotice && status.progress.restRestartOn) {
      setIsRestartNoticeOpen(true);
      await markRestartNoticeShown(status.progress.restRestartOn);
      // ⚠ 今日はもう開いたことにする。しないと、タブを移って戻ったときに昨日の一言が重なる
      await markOpenedToday();
    } else if (status && !status.progress.graduatedOn && (await markOpenedToday())) {
      // 数え直しのお知らせを出す日と、卒業した後は出さない
      const { yesterday, doneDays, restsInWindow, countStartedOn } = status.progress;
      if (yesterday === 'done') setDailyLine({ text: t.today.yesterdayDone(doneDays), countStartedOn });
      if (yesterday === 'rest') {
        setDailyLine({
          text: t.today.yesterdayRest(Math.max(MAX_REST_DAYS - restsInWindow, 0), REST_WINDOW_DAYS),
          countStartedOn,
        });
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    // ウィジェットで押したチェックを先に記録へ移す(plan §7-6)。読み直す前に済ませる
    await applyWidgetChecks();
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
    // アイコン長押しの項目も今日の状態に合わせる(plan §8 追加)
    await syncQuickActions(nextRoutines, nextRecord);
    await checkGraduation();
  }, [checkGraduation]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // 通知の「やった ✓」から開かれたとき。Today がすでに開いていても読み直す
  useEffect(() => {
    if (!opened) return;
    // ⚠ effect の中で同期的に state を変えない(lint)。次の周回で読み直す
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [opened, refresh]);

  // 日付をまたいだ状態でアプリに戻ってきたとき、昨日のチェックを出したままにしない。
  // ウィジェットでチェックしてから戻ってきたときも読み直す(Today が開いたままだとフォーカスは変わらない)
  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', (status: AppStateStatus) => {
      if (status !== 'active') return;
      applyWidgetChecks()
        .then((applied) => {
          if (applied > 0 || dateRef.current !== todayKey() || isGreetingPendingRef.current) refresh();
        })
        .catch(() => {});
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
    const nextRecord = await toggleCompletion(routineId);
    setRecord(nextRecord);
    // 完了した項目の通知を消す。「終わってるのに煽られる」を防ぐ最後の砦
    await syncScheduledNotifications();
    // 済んだ項目をアイコン長押しから外す。外したチェックなら戻す
    await syncQuickActions(routines, nextRecord);
    // その日の最後の1件を押した瞬間に条件を満たすことがある。
    // 次にタブを開き直すまで待たせない
    await checkGraduation();
  };

  // 閉じた時点で「表示済み」を記録する。二度と出さない(spec §2 卒業モーダル)
  const handleCloseGraduation = async () => {
    setIsGraduationOpen(false);
    await markGraduated();
  };

  // 閉じた時点で「祝った」と記録する。それより小さい節目もまとめて済みにする
  const handleCloseMilestone = async () => {
    if (milestone === null) return;
    setMilestone(null);
    await markMilestonesCelebrated(milestonesUpTo(milestone));
    // 7日の節目を閉じたときに一度だけ評価を頼む(plan §7-3)
    if (milestone === REVIEW_MILESTONE) await requestReviewOnce();
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

          {/* 卒業までの進み具合(plan §4)。ルーティンが無い人には出さない */}
          {hasRoutines && progress && <GraduationProgress progress={progress} />}

          {/* その日最初に開いたときの一言(plan §8)。⚠ 休みを責めない。色を変えない */}
          {hasRoutines && dailyLine && (
            <ThemedText type="small" themeColor="textSecondary">
              {dailyLine.text}
            </ThemedText>
          )}

          {/* ⚠ 静かに一行だけ。「失敗」「リセット」と言わない。赤くしない(plan §4) */}
          {hasRoutines && isRestartNoticeOpen && (
            <ThemedText type="small" themeColor="textSecondary">
              {t.today.restartNotice(MAX_REST_DAYS, REST_WINDOW_DAYS)}
            </ThemedText>
          )}

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
      <MilestoneModal day={milestone} onClose={handleCloseMilestone} />
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
