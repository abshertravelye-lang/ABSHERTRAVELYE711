import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import ProfileHeader from '@/components/profile/ProfileHeader';
import PassportSummary from '@/components/profile/PassportSummary';
import DocumentList from '@/components/profile/DocumentList';
import DownloadedVisas from '@/components/profile/DownloadedVisas';
import type { SafeUser } from '@workspace/api-client-react';

const COMPLETION_FIELDS: (keyof SafeUser)[] = [
  'firstName', 'lastName', 'phone', 'nationality', 'dateOfBirth',
  'passportNumber', 'passportExpiryDate', 'profilePhotoUrl', 'passportImageUrl',
];

function getCompletion(user: SafeUser): number {
  const filled = COMPLETION_FIELDS.filter((k) => !!user[k]).length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

// ── Grouped settings list types ────────────────────────────────────────────
type SettingRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  value?: string;
  route?: string;
  onPress?: () => void;
  destructive?: boolean;
};

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;
  
  const { user, isLoading, logout } = useAuth();
  const { t } = useLanguage();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLogoutVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace('/welcome');
  };

  if (isLoading) return null;

  // ── Guest view ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: bottomInset + 90 }}
      >
        <View style={[styles.guestHero, { paddingTop: topInset + 40, backgroundColor: colors.card }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.goldTint, borderColor: colors.accent }]}>
            <Ionicons name="person" size={52} color={colors.accent} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{t('profile.guestWelcome') as string}</Text>
          <Text style={[styles.guestSub, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            {t('profile.guestSubtitle') as string}
          </Text>
        </View>

        <View style={styles.authButtons}>
          <Pressable
            style={({ pressed }) => [styles.loginBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.loginBtnText, { color: colors.primaryForeground, fontFamily: 'Cairo_700Bold' }]}>{t('welcome.login') as string}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.registerBtn, { borderColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={[styles.registerBtnText, { color: colors.primary, fontFamily: 'Cairo_600SemiBold' }]}>{t('welcome.register') as string}</Text>
          </Pressable>
        </View>

        <SettingsGroup
          colors={colors}
          title={(t('settings.aboutApp') as string) || "عن التطبيق"}
          rows={[
            { icon: 'shield-checkmark-outline', label: (t('legal.terms.title') as string) || 'الشروط والأحكام', color: colors.primary, route: '/terms' },
            { icon: 'lock-closed-outline', label: (t('legal.privacy.title') as string) || 'سياسة الخصوصية', color: colors.secondary, route: '/privacy' },
          ]}
        />
      </ScrollView>
    );
  }

  // ── Logged-in view ─────────────────────────────────────────────────────────
  const completion = getCompletion(user);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: bottomInset + 90 }}>
      <ProfileHeader 
        user={user} 
        completion={completion} 
        onEditPress={() => router.push('/profile-edit' as never)} 
        topInset={topInset} 
      />

      <PassportSummary user={user} onEditPress={() => router.push('/profile-edit' as never)} />

      <DocumentList user={user} onUploadPress={() => router.push('/profile-edit' as never)} />
      
      <DownloadedVisas />

      <View style={styles.shortcutsRow}>
        <Shortcut colors={colors} icon="calendar-outline" label={(t('nav.bookings') as string) || "حجوزاتي"} onPress={() => router.push('/(tabs)/bookings' as never)} />
        <Shortcut colors={colors} icon="wallet-outline" label={(t('payment.wallet') as string) || "المحفظة"} onPress={() => router.push('/wallet' as never)} />
      </View>

      <SettingsGroup
        colors={colors}
        title={(t('settings.advancedSettings') as string) || "الإعدادات المتقدمة"}
        rows={[
          { icon: 'settings-outline', label: (t('settings.generalSettings') as string) || 'الإعدادات العامة', color: '#64748B', route: '/settings' },
          { icon: 'notifications-outline', label: (t('settings.notifications') as string) || 'الإشعارات', color: colors.secondary, route: '/notifications' },
          { icon: 'person-circle-outline', label: (t('profile.edit') as string) || 'تعديل الملف الشخصي', color: colors.accent, route: '/profile-edit' },
        ]}
      />

      <SettingsGroup
        colors={colors}
        title={(t('settings.supportInfo') as string) || "الدعم والمعلومات"}
        rows={[
          { icon: 'help-buoy-outline', label: (t('support.contactUs') as string) || 'الدعم / تواصل معنا', color: colors.success, onPress: () => Alert.alert((t('support.contactUs') as string) || 'تواصل معنا', (t('settings.supportAvailable') as string) || 'فريق الدعم متاح لمساعدتك عبر قنوات التواصل داخل التطبيق.') },
          { icon: 'shield-checkmark-outline', label: (t('legal.terms.title') as string) || 'الشروط والأحكام', color: colors.primary, route: '/terms' },
          { icon: 'lock-closed-outline', label: (t('legal.privacy.title') as string) || 'سياسة الخصوصية', color: colors.secondary, route: '/privacy' },
        ]}
      />

      <Pressable
        style={({ pressed }) => [styles.logoutBtn, { borderColor: colors.destructive, opacity: pressed ? 0.8 : 1 }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Cairo_600SemiBold' }]}>{(t('profile.logout') as string) || "تسجيل الخروج"}</Text>
      </Pressable>

      <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{(t('settings.version') as string) || "الإصدار"} 1.0.0</Text>

      <ConfirmDialog
        visible={logoutVisible}
        icon="log-out-outline"
        confirmStyle="destructive"
        title={(t('profile.logoutConfirmTitle') as string) || "هل تريد تسجيل الخروج؟"}
        message={(t('profile.logoutConfirmBody') as string) || "هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟"}
        cancelLabel={(t('common.cancel') as string) || "إلغاء"}
        confirmLabel={(t('profile.logout') as string) || "تسجيل الخروج"}
        onCancel={() => setLogoutVisible(false)}
        onConfirm={confirmLogout}
      />
    </ScrollView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Shortcut({
  colors, icon, label, onPress,
}: {
  colors: ReturnType<typeof useColors>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.shortcut, { backgroundColor: colors.card, shadowColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: colors.goldTint }]}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <Text style={[styles.shortcutLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{label}</Text>
    </Pressable>
  );
}

function SettingsGroup({
  colors, title, rows,
}: {
  colors: ReturnType<typeof useColors>;
  title: string;
  rows: SettingRow[];
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>{title}</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, shadowColor: colors.primary, borderColor: colors.border }]}>
        {rows.map((row, i) => {
          const last = i === rows.length - 1;
          return (
            <Pressable
              key={row.label}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
                last && { borderBottomWidth: 0 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (row.onPress) row.onPress();
                else if (row.route) router.push(row.route as never);
              }}
            >
              {row.value ? (
                <Text style={[styles.rowValue, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{row.value}</Text>
              ) : (
                <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
              )}
              <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}>{row.label}</Text>
              <View style={[styles.rowIcon, { backgroundColor: `${row.color}22` }]}>
                <Ionicons name={row.icon} size={20} color={row.color} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Guest
  guestHero: { paddingHorizontal: 20, paddingBottom: 36, alignItems: 'center', gap: 12, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 2 },
  guestTitle: { fontSize: 26 },
  guestSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  authButtons: { padding: 20, gap: 14, marginTop: 10 },
  loginBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  loginBtnText: { fontSize: 17 },
  registerBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2 },
  registerBtnText: { fontSize: 16 },

  // Shortcuts
  shortcutsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 24 },
  shortcut: { flex: 1, borderRadius: 18, paddingVertical: 20, alignItems: 'center', gap: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  shortcutIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: 14 },

  // Groups
  group: { marginTop: 28 },
  groupTitle: { fontSize: 13, paddingHorizontal: 24, marginBottom: 8, textAlign: 'right' },
  groupCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, overflow: 'hidden', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, textAlign: 'right' },
  rowValue: { fontSize: 14 },

  // Logout
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 32, borderRadius: 16, borderWidth: 2, paddingVertical: 16, gap: 10 },
  logoutText: { fontSize: 16 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 24, marginBottom: 12 },
});
