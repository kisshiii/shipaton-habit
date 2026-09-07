/**
 * Tier 1 ハードストップで文言を保存させなかったときに出すパネル。
 *
 * ⚠ 「危機を検知した」と読める書き方をしないこと。静的判定であり見逃しは大量にある。
 *   見守り・監視を示唆する表現は事実に反し、審査上も医療的主張と見なされうる。
 *   伝えるのは「この文言は通知として保存できない」という事実と、相談先だけ。
 *
 * ⚠ 責めない・驚かせない・説教しない。ここだけはアプリの通常トーン(喝)から外す。
 *   長文の心配メッセージは書いた本人を追い詰める。
 *
 * ⚠ ブロックするのは保存だけ。モーダルで閉じ込めない。呼び出し側もそう扱うこと。
 *
 * 入力欄と一緒に置くため、オンボーディングと Your KATSU の両方から使う。
 */

import { StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/**
 * 国別の番号表を持たない。更新できず、古い番号を出し続けるリスクがあるため、
 * 国際的なディレクトリ1つに統一する(spec §2 ヘルプライン提示の設計-5)。
 */
const HELPLINE_URL = 'https://findahelpline.com';

export function SelfHarmNotice() {
  return (
    <ThemedView type="backgroundElement" style={styles.notice}>
      <ThemedText type="small">This one can&apos;t be saved as a notification.</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        It might be worth saying to someone directly, rather than to yourself at 7am.
      </ThemedText>
      <ExternalLink href={HELPLINE_URL}>
        <ThemedText type="smallBold" themeColor="accent">
          Find a helpline
        </ThemedText>
      </ExternalLink>
      <ThemedText type="small" themeColor="textSecondary">
        In an emergency, call your local emergency number.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
});
