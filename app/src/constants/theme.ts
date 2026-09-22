/**
 * 配色・余白・文字サイズ。
 *
 * ⚠ `accent` はアイコンの紺 `#0F1B61` と生成り。**アプリとアイコンを地続きにするための色**で、
 *   押せるもの・選ばれたものにだけ使う。装飾で撒かないこと。
 *   暗い側では紺が沈んで読めないため、役割を反転させて生なりを accent に置く。
 *
 * ⚠ 背景は純白・純黒にしない。`#ffffff` / `#000000` は「まだ設定していない」に見え、
 *   自分の言葉を置く場所としても硬すぎる。
 */

import '@/global.css';

import { Platform } from 'react-native';

import { language } from '@/i18n';

export const Colors = {
  light: {
    text: '#14151A',
    background: '#FBFAF7',
    backgroundElement: '#F1EFE9',
    backgroundSelected: '#E5E1D6',
    textSecondary: '#5F6470',
    accent: '#0F1B61',
    /** accent の上に載せる文字・記号の色 */
    accentText: '#FAF3E6',
    /** 時刻表の罫線。⚠ 一覧は箱で囲まず、これで区切る */
    line: '#E2DED3',
    /** ユーザーの言葉を載せる紙。灰色の箱(案内)と区別するため白に近くする */
    card: '#FFFFFF',
    /** 削除などの取り消せない操作だけに使う。⚠ 未完了や進捗に使わない(赤で煽らない) */
    danger: '#9A3B24',
  },
  dark: {
    text: '#F4F1E8',
    background: '#0A0C14',
    backgroundElement: '#171A26',
    backgroundSelected: '#232838',
    textSecondary: '#A6ACBB',
    accent: '#EFE1C6',
    accentText: '#0F1B61',
    line: '#262B3A',
    card: '#11141E',
    danger: '#E0906F',
  },
} as const;

/**
 * 節目の画面(オンボーディングの入口・卒業・証書)だけで使う紺の世界。
 * ⚠ テーマに従わせない。起動画面・アイコンと同じ色で、ダークモードでも変えない。
 *   普段は紙の色、節目だけ紺 ── 色の切り替わりそのものを儀式の合図にする。
 */
export const Ceremony = {
  navy: '#0F1B61',
  cream: '#FAF0E0',
  creamSoft: 'rgba(250, 240, 224, 0.72)',
  creamRule: 'rgba(250, 240, 224, 0.22)',
} as const;

/** 角丸。⚠ 何にでも同じ値を付けない。押せるもの・紙・シートで分ける */
export const Radius = {
  control: 14,
  card: 16,
  sheet: 22,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
    /**
     * 「声」の書体。ユーザーの言葉・画面の見出し・アプリの問いかけだけに使う。
     * ⚠ 日本語は `ui-serif` だとゴシックに落ちるため、ヒラギノ明朝を名指しする。
     *   操作(ボタン・説明)はゴシックのまま ── 手紙と道具を書体で分ける(2026-09-16 デザイン方針)
     */
    voice: language === 'ja' ? 'Hiragino Mincho ProN' : 'ui-serif',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    voice: 'serif',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
    voice: 'var(--font-serif)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
