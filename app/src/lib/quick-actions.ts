/**
 * ホーム画面のクイックアクション(1.0.3、plan §8 追加)。
 * アイコンを長押しすると、今日まだのルーティンが出る。押すとチェックが付いて Today が開く。
 *
 * ⚠ 出すのはルーティンの時刻と名前だけ(Today と同じ)。書いた言葉(KatsuMessage)は入れない。
 * ⚠ 全部済んだら空にする。アプリ側の定型文で埋めない(「まだですよ」のような催促を出さない)。
 * ⚠ 項目は端末に残り続け、アプリを開くまで書き換わらない。日付をまたぐと前日の状態のまま出る。
 *   押した時点で「今日やった」として扱う(markCompletedToday は付いていれば何もしない)。
 */

import * as QuickActions from 'expo-quick-actions';

import { t } from '@/i18n';
import { getAppState } from '@/storage';
import type { DailyRecord, RoutineItem } from '@/types';

/** 項目の種類。ほかの種類を足したときに取り違えないよう前置きを付ける */
const ACTION_ID_PREFIX = 'katsu.done.';

/** 項目に載せるデータ。**ユーザーの本文を入れないこと。**遷移は routineId だけで解決する */
type QuickActionParams = {
  routineId: string;
};

/** 今日まだのルーティンを項目にする。全部済んでいれば空 */
export function quickActionsFor(routines: RoutineItem[], today: DailyRecord): QuickActions.Action[] {
  return routines
    .filter((routine) => !today.completedIds.includes(routine.id))
    .map((routine) => {
      const params: QuickActionParams = { routineId: routine.id };
      return {
        id: `${ACTION_ID_PREFIX}${routine.id}`,
        title: t.quickActions.title(routine.time, routine.title),
        icon: 'task',
        params,
      };
    });
}

/** 項目を今の状態に合わせて差し替える。失敗しても画面の動作は止めない */
export async function syncQuickActions(routines: RoutineItem[], today: DailyRecord): Promise<void> {
  try {
    // 1日目がまだ来ていない人(1月1日から、など)には出さない。押しても数えないため
    const { startedOn } = await getAppState();
    const notStarted = !!startedOn && startedOn > today.date;
    await QuickActions.setItems(notStarted ? [] : quickActionsFor(routines, today));
  } catch {
    // 項目が古いままになるだけ。次に Today を開いたときに直る
  }
}

/** 押された項目から routineId を取り出す。KATSU の項目でなければ undefined */
export function routineIdFromQuickAction(action: QuickActions.Action | null | undefined): string | undefined {
  if (!action?.id.startsWith(ACTION_ID_PREFIX)) return undefined;
  const routineId = action.params?.routineId;
  return typeof routineId === 'string' ? routineId : undefined;
}

/** 冷起動のときに押されていた項目。⚠ JS が動いている間ずっと同じ値を返す。処理済みは呼ぶ側で覚えること */
export const initialQuickAction: QuickActions.Action | undefined = QuickActions.initial;

/** アプリが起動している最中に押されたとき */
export function addQuickActionListener(listener: (action: QuickActions.Action) => void): { remove: () => void } {
  return QuickActions.addListener(listener);
}
