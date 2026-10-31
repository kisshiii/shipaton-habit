/**
 * ホーム画面・ロック画面のウィジェット(plan §7-6)。`Day 23 / 66` と今日の進み具合。
 *
 * ⚠ **ユーザーの言葉を載せない。**ロック画面は人に見られる。言葉は本人宛ての手紙(spec §3-4)。
 * ⚠ 未完了を責めない。赤くしない・警告しない。数字と細いバーだけ。
 * ⚠ ウィジェットの関数の中では import した値・フック・非同期処理が使えない(expo-widgets の制約)。
 *   文言はアプリ側で組み立てて props で渡す(`src/lib/widget.ts`)。
 */

import { ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type KatsuProgressProps = {
  /** `Day 23 / 66` / 「66日のうち23日」。ルーティンが無ければ空 */
  dayLabel: string;
  /** `1 of 3 done` / 「3件のうち1件」 */
  todayLabel: string;
  /** 66日までの進み具合(0〜1) */
  ratio: number;
};

const KatsuProgress = (props: KatsuProgressProps, environment: WidgetEnvironment) => {
  'widget';
  // ロック画面(小さい横長)は2行だけ
  if (environment.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading">
        <Text modifiers={[font({ weight: 'semibold', size: 15 })]}>{props.dayLabel}</Text>
        <ProgressView value={props.ratio ?? 0} />
        <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          {props.todayLabel}
        </Text>
      </VStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={8}>
      <Text modifiers={[font({ weight: 'semibold', size: 12 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
        KATSU
      </Text>
      <Text modifiers={[font({ weight: 'bold', design: 'serif', size: 22 })]}>{props.dayLabel}</Text>
      <ProgressView value={props.ratio ?? 0} />
      <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
        {props.todayLabel}
      </Text>
    </VStack>
  );
};

export default createWidget('KatsuProgress', KatsuProgress);
