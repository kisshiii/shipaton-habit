/**
 * 「この言葉をどのルーティンで出すか」を選ぶピッカー(課金機会③)。
 *
 * ⚠ 選択肢の先頭は必ず **All routines**。出し分けは足すもので、既定ではない。
 *   1つしか言葉が無い人にとっては全ルーティン共通が正しい状態なので、
 *   そこへ戻す道をいつでも見えるところに置いておく。
 *
 * ⚠ ルーティンが1件も無いときは開かれない想定(呼び出し側で塞ぐ)。
 */

import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { RoutineItem } from '@/types';

type Props = {
  visible: boolean;
  routines: RoutineItem[];
  /** 現在の割り当て。`undefined` は全ルーティン共通 */
  selectedId?: string;
  onSelect: (routineId?: string) => void;
  onClose: () => void;
};

export function RoutinePicker({ visible, routines, selectedId, onSelect, onClose }: Props) {
  const choose = (routineId?: string) => {
    onSelect(routineId);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.sheet}>
          <ThemedText type="subtitle">When should this one show up?</ThemedText>

          <ScrollView contentContainerStyle={styles.list}>
            <Option
              label="All routines"
              isSelected={selectedId === undefined}
              onPress={() => choose(undefined)}
            />
            {routines.map((routine) => (
              <Option
                key={routine.id}
                label={`${routine.time}  ${routine.title}`}
                isSelected={selectedId === routine.id}
                onPress={() => choose(routine.id)}
              />
            ))}
          </ScrollView>

          <Pressable onPress={onClose} hitSlop={Spacing.two}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
  );
}

function Option({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <ThemedView
        type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.option}
      >
        <ThemedText type={isSelected ? 'smallBold' : 'small'}>{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '80%',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  option: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});
