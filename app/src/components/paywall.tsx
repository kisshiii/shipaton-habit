/**
 * ペイウォール。
 *
 * ⚠ **閉じられること。** 閉じても今日の画面に入れる(spec §2)。
 *   無料でコア体験が全部成立する設計なので、ここで塞ぐと思想が壊れる。
 *
 * ⚠ 出してよい場面は3つだけ:
 *   ①オンボーディング最後 ②2つ目の言葉 ③項目ごとの出し分け
 *   それ以外で出さない。しつこく出す設計にしないこと。
 *
 * ⚠ 価格はユーザーが選ぶ。中身は同じで、**いくらの価値があるかを問う**形。
 *   「一度決めた額は下げられない」は Apple の管理画面から変更できてしまうため
 *   **仕様にしないこと。演出としても、事実と異なる説明はしない。**
 *
 * ⚠ Offerings が取れなくてもコア体験を止めない。ここだけ「後で再試行」にする。
 *
 * ⚠ **Guideline 3.1.2: 商品名・期間・価格と、規約・プライバシーポリシーへのリンクを
 *   この画面に出すこと。** 消すと審査で落ちる。見た目の都合で畳まないこと。
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { Spacing } from '@/constants/theme';
import { getOffering, purchase, restore } from '@/lib/purchases';

type Props = {
  visible: boolean;
  onClose: () => void;
  /**
   * 購入が成立したとき。呼び出し側で entitlement を読み直す。
   * ⚠ この後に必ず `onClose` も呼ばれる。両方に同じ関数を渡すと二重に走る。
   */
  onPurchased?: () => void;
};

export function Paywall({ visible, onClose, onPurchased }: Props) {
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  /** 操作の結果を伝える一行。⚠ ユーザーが「やめた」ときだけは何も出さない */
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setNotice(null);
    setIsLoading(true);
    getOffering().then((offering) => {
      if (cancelled) return;
      setPackages(offering?.availablePackages ?? null);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setNotice(null);
    setIsBusy(true);
    const outcome = await purchase(pkg);
    setIsBusy(false);
    if (outcome === 'purchased') {
      onPurchased?.();
      onClose();
      return;
    }
    // ⚠ 「やめた」は黙って受け入れる。追いかけない
    if (outcome === 'cancelled') return;
    // ⚠ ただし本当に失敗したときは伝える。黙るとボタンが壊れて見える
    setNotice('That did not go through. Nothing was charged.');
  };

  /**
   * ⚠ 復元は結果を必ず返すこと。成立しなかったときに黙ると、ボタンが死んで見える。
   *   ここは「追いかけない」の対象外 ── ユーザーが自分から押した操作なので、答える義務がある。
   */
  const handleRestore = async () => {
    setNotice(null);
    setIsBusy(true);
    const outcome = await restore();
    setIsBusy(false);
    if (outcome === 'restored') {
      onPurchased?.();
      onClose();
      return;
    }
    setNotice(
      outcome === 'nothing'
        ? 'Nothing to restore for this Apple ID.'
        : 'Could not reach the store. Try again later.',
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="subtitle">What is this worth to you?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Every option unlocks the same thing: more than one set of words, and different
              words for different routines. You pick the price.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              This app is designed for you to quit it. When you do, cancel and the charges stop.
            </ThemedText>

            {isLoading && <ActivityIndicator />}

            {/* ⚠ 取得に失敗してもここだけを諦める。閉じれば通常どおり使える */}
            {!isLoading && !packages && (
              <ThemedText type="small" themeColor="textSecondary">
                Could not reach the store. Try again later ── nothing else is affected.
              </ThemedText>
            )}

            {packages?.map((pkg) => (
              <Pressable key={pkg.identifier} onPress={() => handlePurchase(pkg)} disabled={isBusy}>
                <ThemedView type="backgroundElement" style={styles.tier}>
                  <ThemedText type="smallBold">{pkg.product.priceString} / month</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {pkg.product.description || 'Everything unlocked'}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}

            {isBusy && <ActivityIndicator />}

            {notice && (
              <ThemedText type="small" themeColor="textSecondary">
                {notice}
              </ThemedText>
            )}

            <View style={styles.actions}>
              <Pressable onPress={onClose} hitSlop={Spacing.two} disabled={isBusy}>
                <ThemedText type="smallBold">Not now</ThemedText>
              </Pressable>
              <Pressable onPress={handleRestore} hitSlop={Spacing.two} disabled={isBusy}>
                <ThemedText type="smallBold" themeColor="accent">
                  Restore
                </ThemedText>
              </Pressable>
            </View>

            {/*
              ⚠ Guideline 3.1.2 の必須表示。更新条件の一文と、規約・プライバシーの
                動くリンクをここから外さないこと。
            */}
            <View style={styles.legal}>
              <ThemedText type="small" themeColor="textSecondary">
                Monthly, renewing until you cancel. Manage or cancel it in your Apple ID settings
                at any time.
              </ThemedText>
              <View style={styles.legalLinks}>
                <ExternalLink href={TERMS_URL}>
                  <ThemedText type="small" themeColor="accent">
                    Terms of Use
                  </ThemedText>
                </ExternalLink>
                <ExternalLink href={PRIVACY_URL}>
                  <ThemedText type="small" themeColor="accent">
                    Privacy Policy
                  </ThemedText>
                </ExternalLink>
              </View>
            </View>
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  tier: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.one,
  },
  legal: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  legalLinks: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
});
