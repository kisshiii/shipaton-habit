/**
 * ホーム画面・ロック画面のウィジェット(plan §7-6)。`Day 23 / 66` と今日の進み具合。
 * ホーム画面(小・中)は今日のルーティンを並べ、まだの項目はその場でチェックできる(2026-11-01)。
 *
 * ⚠ **ユーザーの言葉を載せない。**ロック画面は人に見られる。言葉は本人宛ての手紙(spec §3-4)。
 *   載せてよいのはルーティン名だけ(Today とアイコン長押しにすでに出ている)。
 * ⚠ 未完了を責めない。赤くしない・警告しない。数字と細いバーと丸だけ。
 * ⚠ ウィジェットの関数の中では import した値・フック・非同期処理が使えない(expo-widgets の制約)。
 *   文言はアプリ側で組み立てて props で渡す(`src/lib/widget.ts`)。
 *   関数の中身は文字列にされ、ウィジェット側の JavaScriptCore で動く。外の変数・定数を参照しないこと。
 *
 * チェックの流れ(expo-widgets 57.0.9 の仕組み):
 *   ボタンを押す → iOS 17 の AppIntent がウィジェット側で動き、この関数を描き直して onPress を呼ぶ
 *   → onPress が返した値を、表示中のタイムラインの props に上書きして App Group に保存する。
 *   アプリが動いていなくても残るのはこの保存だけ(押した知らせのイベントは別プロセスで、アプリには届かない)。
 *   そのため押した項目を `checkedIds` に積み、次にアプリを開いたとき `applyWidgetChecks()` が拾う。
 */

import { Button, HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, font, foregroundStyle, lineLimit } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

/** 今日のルーティン1件。⚠ 書いた言葉(KatsuMessage)は入れない */
export type WidgetRoutine = {
  id: string;
  time: string;
  title: string;
  done: boolean;
  /** 追加した日に時刻が過ぎていて、今日の分母から外した項目。チェックが付けば分母に入る */
  excluded?: boolean;
};

export type KatsuProgressProps = {
  /** `Day 23 / 66` / 「66日のうち23日」。ルーティンが無ければ空 */
  dayLabel: string;
  /** `1 of 3 done` / 「3件のうち1件」 */
  todayLabel: string;
  /** 66日までの進み具合(0〜1) */
  ratio: number;
  /** この表示の日付(yyyy-MM-dd)。チェックはこの日のものとしてだけ数える */
  forDay?: string;
  /** 今日のルーティン(最大3件)。空ならボタンを出さない(Day 1 の前・ルーティン無し) */
  routines?: WidgetRoutine[];
  /** ウィジェットで押した項目。アプリが拾って記録したら空に戻す */
  checkedIds?: string[];
  /** `todayLabel` の作り置き。`progressLabels[分母][分子]`。ウィジェットの中では t() が使えないため */
  progressLabels?: string[][];
};

const KatsuProgress = (props: KatsuProgressProps, environment: WidgetEnvironment) => {
  'widget';
  const secondary = foregroundStyle({
    type: 'hierarchical',
    style: 'secondary',
  });

  // ロック画面(小さい横長)は2行だけ。ボタンは置かない
  if (environment.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading">
        <Text modifiers={[font({ weight: 'semibold', size: 15 })]}>{props.dayLabel}</Text>
        <ProgressView value={props.ratio ?? 0} />
        <Text modifiers={[font({ size: 13 }), secondary]}>{props.todayLabel}</Text>
      </VStack>
    );
  }

  const routines = props.routines ?? [];

  // ルーティンが無い・Day 1 の前は、これまでどおり数字だけ
  if (routines.length === 0) {
    return (
      <VStack alignment="leading" spacing={8}>
        <Text modifiers={[font({ weight: 'semibold', size: 12 }), secondary]}>KATSU</Text>
        <Text modifiers={[font({ weight: 'bold', design: 'serif', size: 22 })]}>{props.dayLabel}</Text>
        <ProgressView value={props.ratio ?? 0} />
        <Text modifiers={[font({ size: 13 }), secondary]}>{props.todayLabel}</Text>
      </VStack>
    );
  }

  const isMedium = environment.widgetFamily === 'systemMedium';

  // 押したときに props へ上書きする値。済んだ項目は何もしない(ウィジェットからは外せない)
  const check = (id: string) => {
    const now = new Date();
    // ⚠ テンプレート文字列は使わない(関数ごとテンプレート文字列に埋め込まれるため、つなぎで書く)
    const today =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0');
    // 何日も開いていない人の、昨日の表示を押しても今日の記録にしない
    if (props.forDay && props.forDay !== today) return undefined;
    const target = routines.find((routine) => routine.id === id);
    if (!target || target.done) return undefined;
    const next = routines.map((routine) => (routine.id === id ? { ...routine, done: true } : routine));
    const done = next.filter((routine) => routine.done).length;
    const total = next.filter((routine) => routine.done || !routine.excluded).length;
    const label = props.progressLabels?.[total]?.[done];
    const checkedIds = props.checkedIds ?? [];
    return {
      routines: next,
      checkedIds: checkedIds.includes(id) ? checkedIds : [...checkedIds, id],
      todayLabel: label ?? props.todayLabel,
    };
  };

  return (
    <VStack alignment="leading" spacing={isMedium ? 6 : 5}>
      <HStack>
        <Text modifiers={[font({ weight: 'bold', design: 'serif', size: isMedium ? 18 : 15 }), lineLimit(1)]}>
          {props.dayLabel}
        </Text>
        <Spacer />
        {isMedium ? <Text modifiers={[font({ size: 12 }), secondary]}>{props.todayLabel}</Text> : null}
      </HStack>
      <ProgressView value={props.ratio ?? 0} />
      <Spacer />
      {/* ⚠ map の結果は VStack の唯一の子にする。配列が入れ子になると、描画でも押したときの探索でも落ちる */}
      <VStack alignment="leading" spacing={isMedium ? 6 : 5}>
        {routines.map((routine) => {
          const row = (
            <HStack spacing={6}>
              <Image systemName={routine.done ? 'checkmark.circle.fill' : 'circle'} size={isMedium ? 18 : 16} />
              {isMedium ? <Text modifiers={[font({ size: 12 }), secondary, lineLimit(1)]}>{routine.time}</Text> : null}
              <Text
                modifiers={
                  routine.done
                    ? [font({ size: isMedium ? 14 : 13 }), secondary, lineLimit(1)]
                    : [font({ size: isMedium ? 14 : 13 }), lineLimit(1)]
                }>
                {routine.title}
              </Text>
              <Spacer />
            </HStack>
          );
          // 済んだ項目はボタンにしない(押しても外れない。外すのはアプリの Today で)
          if (routine.done) return <VStack key={routine.id}>{row}</VStack>;
          return (
            <Button
              key={routine.id}
              target={routine.id}
              modifiers={[buttonStyle('plain')]}
              onPress={() => check(routine.id)}>
              {row}
            </Button>
          );
        })}
      </VStack>
    </VStack>
  );
};

export default createWidget('KatsuProgress', KatsuProgress);
