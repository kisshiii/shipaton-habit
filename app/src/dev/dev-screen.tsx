/**
 * ⚠ **撮影用・開発ビルド専用。App Store 版には入らない。**
 *
 * 起動引数 `-katsuDevScreen <画面>` で、タップしないと出ない画面を直接開く。
 * シミュレーターでは画面を押す手段が無い(Mac のマウスを動かすことになる)ため。
 *   - `onboarding:<段>`   オンボーディングをその段から(goal / routine / start / words / rule / seal / notifications / done)
 *   - `share-milestone`  節目のカード(33日)
 *   - `share-words`      言葉のカード(最初の言葉)
 *
 * 状態(`-katsuDevSeed`)と一緒に使う。例: `-katsuDevSeed progress -katsuDevScreen share-words`
 * ⚠ 読み込みは `_layout.tsx` の `if (__DEV__ || EXPO_PUBLIC_KATSU_DEV_TOOLS)` の中からだけ。
 */

import { useEffect, useState } from 'react';

import { Onboarding, type OnboardingStep } from '@/components/onboarding';
import { MilestoneCard, ShareCardModal, WordsCard } from '@/components/share-card';
import { t } from '@/i18n';
import { getMessages, getRoutines } from '@/storage';
import type { KatsuMessage, RoutineItem } from '@/types';

const ONBOARDING_STEPS: OnboardingStep[] = [
  'goal',
  'routine',
  'start',
  'words',
  'rule',
  'seal',
  'notifications',
  'done',
];

export function DevScreen({ screen }: { screen: string }) {
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [messages, setMessages] = useState<KatsuMessage[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    Promise.all([getRoutines(), getMessages()]).then(([nextRoutines, nextMessages]) => {
      setRoutines(nextRoutines);
      setMessages(nextMessages);
    });
  }, []);

  if (!isOpen) return null;
  const close = () => setIsOpen(false);

  if (screen.startsWith('onboarding:')) {
    const step = screen.split(':')[1] as OnboardingStep;
    if (!ONBOARDING_STEPS.includes(step)) return null;
    // 例は「朝型になる」の例と、言葉の入力欄の例文を使う
    const goal = t.onboarding.goals[0];
    return (
      <Onboarding
        onFinished={close}
        preview={{ step, time: goal.time, title: goal.title, words: messages[0]?.text ?? t.katsu.placeholder }}
      />
    );
  }
  if (screen === 'share-milestone') {
    return (
      <ShareCardModal visible onClose={close}>
        <MilestoneCard day={33} routines={routines} />
      </ShareCardModal>
    );
  }
  if (screen === 'share-words') {
    return (
      <ShareCardModal visible onClose={close}>
        <WordsCard text={messages[0]?.text ?? t.katsu.placeholder} />
      </ShareCardModal>
    );
  }
  return null;
}
