import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /**
   * display … 画面の見出し(明朝)。voice … ユーザーの言葉とアプリの問いかけ(明朝)。
   * time … 時刻(等幅・数字の幅を揃える)
   */
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'code'
    | 'display'
    | 'voice'
    | 'time';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      // ⚠ 本文は端末の文字サイズ設定に従わせる。見出しだけは上限を置かないと
      //   1行が画面幅を超えて折り返し地獄になる
      maxFontSizeMultiplier={
        type === 'title' || type === 'subtitle' || type === 'display' ? 1.4 : undefined
      }
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'code' && styles.code,
        type === 'display' && styles.display,
        type === 'voice' && styles.voice,
        type === 'time' && styles.time,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  display: {
    fontFamily: Fonts?.voice,
    fontSize: 30,
    lineHeight: 40,
    fontWeight: 700,
  },
  voice: {
    fontFamily: Fonts?.voice,
    fontSize: 19,
    lineHeight: 30,
    fontWeight: 600,
  },
  time: {
    fontFamily: Fonts?.mono,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: 500,
    fontVariant: ['tabular-nums'],
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
