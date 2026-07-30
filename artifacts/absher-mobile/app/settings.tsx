import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20);
  const { mode, setMode } = useTheme();

  const [settings, setSettings] = useState({
    pushNotifs: true,
    emailNotifs: true,
    smsNotifs: false,
    biometrics: false,
    englishLang: false,
  });

  useEffect(() => {
    AsyncStorage.getItem('@absher_settings').then((val) => {
      if (val) {
        try {
          setSettings(JSON.parse(val));
        } catch {}
      }
    });
  }, []);

  const updateSetting = async (key: keyof typeof settings, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await AsyncStorage.setItem('@absher_settings', JSON.stringify(newSettings));
  };

  const handlePressComingSoon = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('قريباً', 'هذه الميزة ستكون متاحة في التحديث القادم.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'حذف الحساب',
      'هل أنت متأكد أنك تريد حذف حسابك نهائياً؟ سيتم مسح جميع بياناتك ولن تتمكن من التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف الحساب', 
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            // Simulate logout
            router.replace('/(tabs)/');
          }
        }
      ]
    );
  };

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  const RowItem = ({ 
    icon, 
    title, 
    value, 
    type = 'link', 
    onPress, 
    boolValue, 
    onToggle,
    destructive
  }: any) => (
    <Pressable 
      style={({ pressed }) => [
        styles.row, 
        { borderBottomColor: colors.border },
        pressed && type === 'link' ? { backgroundColor: colors.muted } : undefined
      ]}
      onPress={type === 'link' ? onPress || handlePressComingSoon : undefined}
    >
      <View style={styles.rowLeft}>
        {type === 'link' && <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />}
        {type === 'switch' && (
          <Switch
            value={boolValue}
            onValueChange={onToggle}
            trackColor={{ false: colors.mutedForeground, true: '#D4AF37' }}
            thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : boolValue ? '#FFFFFF' : '#f4f3f4'}
          />
        )}
        {value && <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{value}</Text>}
      </View>
      <View style={styles.rowRight}>
        <Text style={[
          styles.rowTitle, 
          { color: destructive ? colors.destructive : colors.foreground, fontFamily: destructive ? 'Cairo_600SemiBold' : 'Cairo_400Regular' }
        ]}>{title}</Text>
        <View style={[styles.iconWrap, { backgroundColor: destructive ? 'rgba(239, 68, 68, 0.1)' : colors.muted }]}>
          <Ionicons name={icon} size={20} color={destructive ? colors.destructive : '#0A2342'} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: '#0A2342' }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>الإعدادات</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40, gap: 24 }}>
        
        <Section title="الحساب">
          <RowItem icon="person-outline" title="تعديل الملف الشخصي" />
          <RowItem icon="people-outline" title="إدارة المسافرين" />
        </Section>

        <Section title="التطبيق">
          <RowItem 
            icon="language-outline" 
            title="اللغة" 
            type="switch" 
            boolValue={settings.englishLang} 
            onToggle={(v: boolean) => updateSetting('englishLang', v)}
            value={settings.englishLang ? 'English' : 'عربي'}
          />
          <RowItem icon="cash-outline" title="العملة المعتمدة" value="SAR (ر.س)" />
          <RowItem 
            icon={mode === 'dark' ? 'moon-outline' : 'sunny-outline'} 
            title="المظهر الداكن" 
            type="switch"
            boolValue={mode === 'dark'}
            onToggle={(v: boolean) => setMode(v ? 'dark' : 'light')}
          />
        </Section>

        <Section title="الإشعارات">
          <RowItem 
            icon="notifications-outline" 
            title="إشعارات التطبيق" 
            type="switch" 
            boolValue={settings.pushNotifs} 
            onToggle={(v: boolean) => updateSetting('pushNotifs', v)} 
          />
          <RowItem 
            icon="mail-outline" 
            title="رسائل البريد الإلكتروني" 
            type="switch" 
            boolValue={settings.emailNotifs} 
            onToggle={(v: boolean) => updateSetting('emailNotifs', v)} 
          />
          <RowItem 
            icon="chatbubble-outline" 
            title="الرسائل النصية SMS" 
            type="switch" 
            boolValue={settings.smsNotifs} 
            onToggle={(v: boolean) => updateSetting('smsNotifs', v)} 
          />
        </Section>

        <Section title="الأمان">
          <RowItem icon="lock-closed-outline" title="تغيير كلمة المرور" />
          <RowItem 
            icon="finger-print-outline" 
            title="الدخول بالبصمة" 
            type="switch" 
            boolValue={settings.biometrics} 
            onToggle={(v: boolean) => updateSetting('biometrics', v)} 
          />
          <RowItem icon="laptop-outline" title="الجلسات النشطة" />
        </Section>

        <Section title="الدعم">
          <RowItem icon="help-buoy-outline" title="تواصل معنا" onPress={() => router.push('/(tabs)/')} />
          <RowItem icon="help-circle-outline" title="الأسئلة الشائعة" />
          <RowItem icon="star-outline" title="تقييم التطبيق" />
          <RowItem icon="document-text-outline" title="سياسة الخصوصية" />
          <RowItem icon="shield-checkmark-outline" title="الشروط والأحكام" />
        </Section>

        <Section title="الحساب المتقدم">
          <RowItem icon="trash-outline" title="حذف الحساب نهائياً" destructive onPress={handleDeleteAccount} />
        </Section>

        <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
          الإصدار 1.0.0
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 20 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, paddingRight: 8, textAlign: 'right' },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 15, textAlign: 'right' },
  rowValue: { fontSize: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});