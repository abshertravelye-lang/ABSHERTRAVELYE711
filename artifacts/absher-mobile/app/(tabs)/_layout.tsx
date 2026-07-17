import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>الرئيسية</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="flights">
        <Icon sf={{ default: 'airplane', selected: 'airplane.fill' }} />
        <Label>رحلات</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="visas">
        <Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
        <Label>تأشيرات</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="programs">
        <Icon sf={{ default: 'globe', selected: 'globe.americas.fill' }} />
        <Label>البرامج</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>حسابي</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  const tabIcon = (
    sfName: string,
    featherName: keyof typeof Ionicons.glyphMap,
    featherSelected: keyof typeof Ionicons.glyphMap,
    color: string,
    focused: boolean,
  ) =>
    isIOS ? (
      <SymbolView name={sfName} tintColor={color} size={24} />
    ) : (
      <Ionicons name={focused ? featherSelected : featherName} size={24} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: 'Cairo_600SemiBold', fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : '#0A2342',
          borderTopWidth: 0,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? 'dark' : 'extraLight'}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,35,66,0.85)' }]}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A2342' }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, focused }) => tabIcon('house', 'home-outline', 'home', color, focused),
        }}
      />
      <Tabs.Screen
        name="flights"
        options={{
          title: 'رحلات',
          tabBarIcon: ({ color, focused }) => tabIcon('airplane', 'airplane-outline', 'airplane', color, focused),
        }}
      />
      <Tabs.Screen
        name="visas"
        options={{
          title: 'تأشيرات',
          tabBarIcon: ({ color, focused }) => tabIcon('doc.text', 'document-text-outline', 'document-text', color, focused),
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'البرامج',
          tabBarIcon: ({ color, focused }) => tabIcon('globe', 'globe-outline', 'globe', color, focused),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, focused }) => tabIcon('person', 'person-outline', 'person', color, focused),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
