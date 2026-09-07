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
  },
  dark: {
    text: '#F4F1E8',
    background: '#0A0C14',
    backgroundElement: '#171A26',
    backgroundSelected: '#232838',
    textSecondary: '#A6ACBB',
    accent: '#EFE1C6',
    accentText: '#0F1B61',
  },
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
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
