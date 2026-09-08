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
 *
 * ⚠ **`Modal` の中には専用の `SafeAreaProvider` が要る。** 外側の provider は
 *   root のビューを測っているため、Modal 内では inset が 0 になり、
 *   下端がホームインジケータに潜る。
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { Button } from '@/components/button';
import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';
import { getOffering, purchase, restore, type OfferingResult } from '@/lib/purchases';

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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <Sheet onClose={onClose} onPurchased={onPurchased} visible={visible} />
      </SafeAreaProvider>
    </Modal>
  );
}

function Sheet({ visible, onClose, onPurchased }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  /** 商品が出せなかった理由。⚠ 種類ごとに直す場所が違うので潰さない */
  const [problem, setProblem] = useState<OfferingResult['kind'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  /** 操作の結果を伝える一行。⚠ ユーザーが「やめた」ときだけは何も出さない */
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setNotice(null);
    setIsLoading(true);
    getOffering().then((result) => {
      if (cancelled) return;
      setPackages(result.kind === 'ok' ? result.offering.availablePackages : null);
      setProblem(result.kind === 'ok' ? null : result.kind);
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
    // ⚠ 課金が成立したのに解放できなかった場合、**請求されていないと言わないこと**
    setNotice(outcome === 'unconfirmed' ? t.paywall.purchaseUnconfirmed : t.paywall.purchaseFailed);
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
    setNotice(outcome === 'nothing' ? t.paywall.restoreNothing : t.paywall.restoreFailed);
  };

  return (
    <View style={styles.backdrop}>
      {/* 背景を押しても閉じられるようにする。閉じ方が1つしかないと閉じ込められた感じになる */}
      <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Close" />

      <ThemedView style={styles.sheet}>
        {/* つまみ。下から出てきたものだと一目で分かる */}
        <View style={[styles.grabber, { backgroundColor: theme.backgroundSelected }]} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Spacing.four + insets.bottom },
          ]}>
          <ThemedText type="subtitle">{t.paywall.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.paywall.body}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t.paywall.quit}
          </ThemedText>

          {isLoading && <ActivityIndicator />}

          {/*
            ⚠ 取得に失敗してもここだけを諦める。閉じれば通常どおり使える。
            ⚠ 文面は3種類に分ける。ユーザーには同じ「今は出せない」でも、
              直す側にとってはまったく別の事故。
          */}
          {!isLoading && problem && (
            <ThemedText type="small" themeColor="textSecondary">
              {problem === 'noOffering'
                ? t.paywall.noOffering
                : problem === 'noProducts'
                  ? t.paywall.noProducts
                  : t.paywall.unreachable}
            </ThemedText>
          )}

          {packages?.map((pkg) => (
            <Pressable
              key={pkg.identifier}
              onPress={() => handlePurchase(pkg)}
              disabled={isBusy}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedView
                type="backgroundElement"
                style={[styles.tier, { borderColor: theme.accent }]}>
                {/*
                  ⚠ 商品名を出すこと。3つの違いは中身ではなく**本人の覚悟の度合い**で
                    (`まず一歩` / `本気で` / `オールイン`)、それを名乗るのが名前しかない。
                    Apple の購入シートと iOS の設定にしか出ないままだと、
                    **選ぶ瞬間に問いへの答えが見えない。**
                */}
                {!!pkg.product.title && (
                  <ThemedText type="smallBold">{pkg.product.title}</ThemedText>
                )}
                {/* ⚠ 3.1.2: 価格と期間をここに出し続けること */}
                <ThemedText type="smallBold" themeColor="accent" style={styles.tierPrice}>
                  {pkg.product.priceString} {t.paywall.perMonth}
                </ThemedText>
                {/*
                  ⚠ 商品ごとの説明は出さない。3つとも中身が同じなので同じ文が3回並ぶだけ。
                    何が解放されるかは見出しの下で一度言ってある。
                */}
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
            <Button label={t.paywall.notNow} variant="secondary" onPress={onClose} disabled={isBusy} />
            <Button label={t.paywall.restore} variant="plain" onPress={handleRestore} disabled={isBusy} />
          </View>

          {/*
            ⚠ Guideline 3.1.2 の必須表示。更新条件の一文と、規約・プライバシーの
              動くリンクをここから外さないこと。
          */}
          <View style={styles.legal}>
            <ThemedText type="small" themeColor="textSecondary">
              {t.paywall.renewal}
            </ThemedText>
            <View style={styles.legalLinks}>
              <ExternalLink href={TERMS_URL}>
                <ThemedText type="small" themeColor="accent">
                  {t.paywall.terms}
                </ThemedText>
              </ExternalLink>
              <ExternalLink href={PRIVACY_URL}>
                <ThemedText type="small" themeColor="accent">
                  {t.paywall.privacy}
                </ThemedText>
              </ExternalLink>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dismissArea: {
    flex: 1,
    // ⚠ 上を必ず余らせる。全画面を覆うと下から出てきたことが伝わらない
    minHeight: Spacing.six,
  },
  sheet: {
    // ⚠ flexShrink が無いと、中身が伸びたときに画面外へはみ出して読めなくなる
    flexShrink: 1,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingTop: Spacing.two,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.two,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  tier: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  tierPrice: {
    fontSize: 20,
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.7,
  },
  actions: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  legal: {
    gap: Spacing.two,
  },
  legalLinks: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
});
