/**
 * Tab bar design rule:
 *   Always navy (#0A2342) background — matches the logo's navy field.
 *   Active icon / label → gold (#D4AF37) — matches the logo's compass star.
 *   Inactive → white 55 % opacity (light) / slate-400 (dark).
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

// ── Navy + Gold tab bar (always branded) ────────────────────────────────────
const NAVY   = '#0A2342';
const GOLD   = '#D4AF37';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>الرئيسية</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="flights">
        <Icon sf={{ default: 'airplane', selected: 'paperplane.fill' }} />
        <Label>رحلات</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="visas">
        <Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
        <Label>تأشيرات</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookings">
        <Icon sf={{ default: 'calendar', selected: 'calendar.badge.checkmark' }} />
        <Label>حجوزاتي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>حسابي</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  // Dark mode: slightly deeper navy so the tab bar contrasts with cards
  const tabBg   = isDark ? '#071525' : NAVY;
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
        tabBarActiveTintColor:   GOLD,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: { fontFamily: 'Cairo_600SemiBold', fontSize: 11 },
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
        options={{ title: 'الرئيسية',
          tabBarIcon: ({ color, focused }) => icon('house', 'home-outline', 'home', color, focused) }} />
      <Tabs.Screen name="flights"
        options={{ title: 'رحلات',
          tabBarIcon: ({ color, focused }) => icon('airplane', 'airplane-outline', 'airplane', color, focused) }} />
      <Tabs.Screen name="visas"
        options={{ title: 'تأشيرات',
          tabBarIcon: ({ color, focused }) => icon('doc.text', 'document-text-outline', 'document-text', color, focused) }} />
      <Tabs.Screen name="bookings"
        options={{ title: 'حجوزاتي',
          tabBarIcon: ({ color, focused }) => icon('calendar', 'calendar-outline', 'calendar', color, focused) }} />
      <Tabs.Screen name="programs"
        options={{ title: 'البرامج',
          tabBarIcon: ({ color, focused }) => icon('globe', 'globe-outline', 'globe', color, focused) }} />
      <Tabs.Screen name="account"
        options={{ title: 'حسابي',
          tabBarIcon: ({ color, focused }) => icon('person', 'person-outline', 'person', color, focused) }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />;
}
