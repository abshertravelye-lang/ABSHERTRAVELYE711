/**
 * Tab bar design rule — ABSHER TRAVEL Premium Brand
 *   Always deep navy background (#062B5B light, #031B3A dark)
 *   Active icon / label → gold (#D4A017)
 *   Inactive → white 50% opacity (light) / slate-400 (dark)
 *   Subtle gold glow on active tab
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import colors from '@/constants/colors';

const NAVY = colors.static.primaryNavy;
const DARK_NAVY = colors.dark.background;
const GOLD = colors.static.premiumGold;

function NativeTabLayout() {
  const { t } = useLanguage();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>{t('nav.home')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="visas">
        <Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
        <Label>{t('nav.visas')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="umrah">
        <Icon sf={{ default: 'moon', selected: 'moon.fill' }} />
        <Label>{t('home.service.umrah')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookings">
        <Icon sf={{ default: 'calendar', selected: 'calendar.badge.checkmark' }} />
        <Label>{t('nav.bookings')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>{t('nav.account')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { resolved } = useTheme();
  const { t } = useLanguage();
  const isDark = resolved === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  const tabBg = isDark ? DARK_NAVY : NAVY;
  const inactive = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.50)';

  const icon = (
    sfName: string,
    outline: keyof typeof Ionicons.glyphMap,
    filled: keyof typeof Ionicons.glyphMap,
    color: string,
    focused: boolean,
  ) =>
    isIOS
      ? <SymbolView name={sfName as Parameters<typeof SymbolView>[0]['name']} tintColor={color} size={24} />
      : <Ionicons name={focused ? filled : outline} size={24} color={color} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: { fontFamily: 'Cairo_600SemiBold', fontSize: 11, paddingBottom: 2 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : tabBg,
          borderTopWidth: 0,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={95}
              tint="dark"
              style={[StyleSheet.absoluteFill, { backgroundColor: `${NAVY}E8` }]}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tabBg }]} />
          ) : null,
      }}
    >
      <Tabs.Screen name="index"
        options={{ title: t('nav.home'),
          tabBarIcon: ({ color, focused }) => icon('house', 'home-outline', 'home', color, focused) }} />
      <Tabs.Screen name="visas"
        options={{ title: t('nav.visas'),
          tabBarIcon: ({ color, focused }) => icon('doc.text', 'document-text-outline', 'document-text', color, focused) }} />
      <Tabs.Screen name="umrah"
        options={{ title: t('home.service.umrah'),
          tabBarIcon: ({ color, focused }) => icon('moon', 'moon-outline', 'moon', color, focused) }} />
      <Tabs.Screen name="bookings"
        options={{ title: t('nav.bookings'),
          tabBarIcon: ({ color, focused }) => icon('calendar', 'calendar-outline', 'calendar', color, focused) }} />
      <Tabs.Screen name="account"
        options={{ title: t('nav.account'),
          tabBarIcon: ({ color, focused }) => icon('person', 'person-outline', 'person', color, focused) }} />
      
      {/* Hidden tabs so they stay reachable */}
      <Tabs.Screen name="flights" options={{ href: null }} />
      <Tabs.Screen name="programs" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />;
}
