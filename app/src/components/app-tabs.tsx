/**
 * タブバー。
 *
 * ⚠ アイコンは3つとも SF Symbol にすること。1つだけ画像にすると、
 *   太さも光学サイズも揃わず、並べた瞬間に分かる。
 */

import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { t } from '@/i18n';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      tintColor={colors.accent}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t.tabs.today}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="routines">
        <NativeTabs.Trigger.Label>{t.tabs.routines}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="katsu">
        <NativeTabs.Trigger.Label>{t.tabs.katsu}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="quote.bubble" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
