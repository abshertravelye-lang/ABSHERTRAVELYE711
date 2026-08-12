import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20);
  
  const { mode, setMode } = useTheme();
  const { lang, toggle: toggleLang, t } = useLanguage();

  const [settings, setSettings] = useState({
    pushNotifs: true,
    emailNotifs: true,
    smsNotifs: false,
    biometrics: false,
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
    Alert.alert(t('settings.comingSoonTitle') as string || 'قريباً', t('settings.comingSoonBody') as string || 'هذه الميزة ستكون متاحة في التحديث القادم.');
  };

  const handleBiometricsToggle = (v: boolean) => {
    // Biometrics will be fully wired later. Currently mocked.
    if (v) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(
        (t('common.comingSoon') as string) || 'قريباً',
        (t('settings.biometricSoonBody') as string) || 'الدخول بالبصمة سيكون متاحاً قريباً.'
      );
    } else {
      updateSetting('biometrics', v);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount') as string || 'حذف الحساب',
      t('profile.deleteConfirm') as string || 'هل أنت متأكد أنك تريد حذف حسابك نهائياً؟ سيتم مسح جميع بياناتك ولن تتمكن من التراجع عن هذا الإجراء.',
      [
        { text: t('common.cancel') as string || 'إلغاء', style: 'cancel' },
        { 
          text: t('profile.deleteAccount') as string || 'حذف الحساب', 
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            router.replace('/(tabs)/' as never);
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
            trackColor={{ false: colors.border, true: colors.accent }}
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
        <View style={[styles.iconWrap, { backgroundColor: destructive ? 'rgba(239, 68, 68, 0.1)' : colors.goldTint }]}>
          <Ionicons name={icon} size={20} color={destructive ? colors.destructive : colors.accent} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>{t('settings.title') || 'الإعدادات'}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40, gap: 24 }}>
        
        <Section title={(t('settings.account') as string) || "الحساب"}>
          <RowItem icon="person-outline" title={t('profile.edit') || "تعديل الملف الشخصي"} onPress={() => router.push('/profile-edit' as never)} />
          <RowItem icon="people-outline" title={(t('settings.manageTravelers') as string) || "إدارة المسافرين"} />
        </Section>

        <Section title={t('settings.title') || "التطبيق"}>
          <RowItem 
            icon="language-outline" 
            title={t('settings.language') || "اللغة"} 
            type="switch" 
            boolValue={lang === 'en'} 
            onToggle={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleLang();
            }}
            value={lang === 'en' ? 'English' : 'عربي'}
          />
          <RowItem icon="cash-outline" title={(t('settings.currency') as string) || "العملة المعتمدة"} value={(t('settings.currencyValue') as string) || "SAR (ر.س)"} />
          <RowItem 
            icon={mode === 'dark' ? 'moon-outline' : 'sunny-outline'} 
            title={t('settings.theme') || "المظهر الداكن"} 
            type="switch"
            boolValue={mode === 'dark'}
            onToggle={(v: boolean) => setMode(v ? 'dark' : 'light')}
          />
        </Section>

        <Section title={t('settings.notifications') || "الإشعارات"}>
          <RowItem 
            icon="notifications-outline" 
            title={t('settings.pushNotifs') || "إشعارات التطبيق"} 
            type="switch" 
            boolValue={settings.pushNotifs} 
            onToggle={(v: boolean) => updateSetting('pushNotifs', v)} 
          />
          <RowItem 
            icon="mail-outline" 
            title={t('settings.emailNotifs') || "رسائل البريد الإلكتروني"} 
            type="switch" 
            boolValue={settings.emailNotifs} 
            onToggle={(v: boolean) => updateSetting('emailNotifs', v)} 
          />
          <RowItem 
            icon="chatbubble-outline" 
            title={t('settings.smsNotifs') || "الرسائل النصية SMS"} 
            type="switch" 
            boolValue={settings.smsNotifs} 
            onToggle={(v: boolean) => updateSetting('smsNotifs', v)} 
          />
        </Section>

        <Section title={t('settings.security') || "الأمان"}>
          <RowItem icon="lock-closed-outline" title={(t('settings.changePassword') as string) || "تغيير كلمة المرور"} />
          <RowItem 
            icon="finger-print-outline" 
            title={t('settings.biometrics') || "الدخول بالبصمة"} 
            type="switch" 
            boolValue={settings.biometrics} 
            onToggle={handleBiometricsToggle} 
          />
          <RowItem icon="laptop-outline" title={(t('settings.activeSessions') as string) || "الجلسات النشطة"} />
        </Section>

        <Section title={t('settings.help') || "الدعم"}>
          <RowItem icon="help-buoy-outline" title={(t('support.contactUs') as string) || "تواصل معنا"} onPress={() => Alert.alert((t('support.contactUs') as string) || 'تواصل معنا', (t('settings.supportAvailable') as string) || 'فريق الدعم متاح')} />
          <RowItem icon="help-circle-outline" title={(t('settings.faq') as string) || "الأسئلة الشائعة"} />
          <RowItem icon="star-outline" title={(t('settings.rateApp') as string) || "تقييم التطبيق"} />
          <RowItem icon="document-text-outline" title={(t('legal.privacy.title') as string) || "سياسة الخصوصية"} onPress={() => router.push('/privacy' as never)} />
          <RowItem icon="shield-checkmark-outline" title={(t('legal.terms.title') as string) || "الشروط والأحكام"} onPress={() => router.push('/terms' as never)} />
        </Section>

        <Section title={(t('settings.advancedAccount') as string) || "الحساب المتقدم"}>
          <RowItem icon="trash-outline" title={t('profile.deleteAccount') || "حذف الحساب نهائياً"} destructive onPress={handleDeleteAccount} />
        </Section>

        <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
          {(t('settings.version') as string) || "الإصدار"} 1.0.0
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 20 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, paddingRight: 8, textAlign: 'right' },
  sectionCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 15, textAlign: 'right' },
  rowValue: { fontSize: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});
