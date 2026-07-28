import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getImageUrl } from '@/hooks/useImageUrl';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { value: 'light', label: 'النهاري', icon: 'sunny-outline', desc: 'أبيض وأزرق' },
  { value: 'dark',  label: 'الليلي',  icon: 'moon-outline',  desc: 'داكن ومريح' },
  { value: 'system',label: 'تلقائي',  icon: 'phone-portrait-outline', desc: 'حسب الجهاز' },
];

// ── ThemeSection component ─────────────────────────────────────────────────
function ThemeSection({
  colors,
  mode,
  setMode,
}: {
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
  mode: string;
  setMode: (m: 'light' | 'dark' | 'system') => void;
}) {
  return (
    <View style={[themeStyles.card, { backgroundColor: colors.card, shadowColor: colors.primary, marginHorizontal: 16, marginBottom: 12 }]}>
      {/* Header */}
      <View style={themeStyles.header}>
        <View style={[themeStyles.headerIcon, { backgroundColor: '#FFF7E0' }]}>
          <Ionicons name="contrast-outline" size={20} color="#D4AF37" />
        </View>
        <Text style={[themeStyles.headerTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
          المظهر
        </Text>
      </View>

      {/* Options row */}
      <View style={themeStyles.optionsRow}>
        {THEME_OPTIONS.map((opt) => {
          const active = mode === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={({ pressed }) => [
                themeStyles.option,
                {
                  backgroundColor: active ? '#0A2342' : colors.muted,
                  borderColor: active ? '#D4AF37' : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMode(opt.value);
              }}
            >
              <Ionicons
                name={opt.icon}
                size={22}
                color={active ? '#D4AF37' : colors.mutedForeground}
              />
              <Text
                style={[
                  themeStyles.optionLabel,
                  { color: active ? '#FFFFFF' : colors.foreground, fontFamily: 'Cairo_700Bold' },
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[
                  themeStyles.optionDesc,
                  { color: active ? 'rgba(255,255,255,0.65)' : colors.mutedForeground, fontFamily: 'Cairo_400Regular' },
                ]}
              >
                {opt.desc}
              </Text>
              {active && (
                <View style={themeStyles.activeDot}>
                  <Ionicons name="checkmark-circle" size={16} color="#D4AF37" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const themeStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    justifyContent: 'flex-end',
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16 },
  optionsRow: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  optionLabel: { fontSize: 13 },
  optionDesc: { fontSize: 10, textAlign: 'center' },
  activeDot: { position: 'absolute', top: 6, left: 6 },
});
// ─────────────────────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  { icon: 'calendar-outline' as const, label: 'حجوزاتي', route: '/(tabs)/bookings' },
  { icon: 'document-text-outline' as const, label: 'طلبات التأشيرة', route: null },
  { icon: 'notifications-outline' as const, label: 'الإشعارات', route: '/notifications' },
  { icon: 'help-circle-outline' as const, label: 'تواصل معنا', route: null },
  { icon: 'information-circle-outline' as const, label: 'عن التطبيق', route: null },
];

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;
  const { user, isLoading, logout } = useAuth();
  const { mode, setMode } = useTheme();

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          logout();
        },
      },
    ]);
  };

  if (isLoading) return null;

  // Guest view
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.guestHero, { paddingTop: topInset + 20, backgroundColor: '#0A2342' }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="person" size={48} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={[styles.guestTitle, { fontFamily: 'Cairo_700Bold' }]}>مرحباً بك</Text>
          <Text style={[styles.guestSub, { fontFamily: 'Cairo_400Regular' }]}>سجّل دخولك للوصول لحسابك وحجوزاتك</Text>
        </View>
        <View style={styles.authButtons}>
          <Pressable
            style={({ pressed }) => [styles.loginBtn, { backgroundColor: '#0A2342', opacity: pressed ? 0.9 : 1 }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.loginBtnText, { fontFamily: 'Cairo_700Bold' }]}>تسجيل الدخول</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.registerBtn, { borderColor: '#0A2342', opacity: pressed ? 0.9 : 1 }]}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={[styles.registerBtnText, { color: '#0A2342', fontFamily: 'Cairo_600SemiBold' }]}>إنشاء حساب جديد</Text>
          </Pressable>
        </View>
        <View style={styles.guestMenu}>
          {MENU_ITEMS.slice(-2).map((item) => (
            <View key={item.label} style={[styles.menuItem, { borderBottomColor: colors.border }]}>
              <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
              <Text style={[styles.menuLabel, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}>{item.label}</Text>
              <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name={item.icon} size={20} color="#0A2342" />
              </View>
            </View>
          ))}
        </View>
        {/* Theme even for guests */}
        <ThemeSection colors={colors} mode={mode} setMode={setMode} />
      </View>
    );
  }

  const avatarUri = getImageUrl(user.profilePhotoUrl);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.phone || 'المستخدم';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: bottomInset + 90 }}>
      {/* Profile Header */}
      <View style={[styles.profileHero, { paddingTop: topInset + 16, backgroundColor: '#0A2342' }]}>
        <View style={styles.profileRow}>
          <View>
            <Text style={[styles.profileName, { fontFamily: 'Cairo_700Bold' }]}>{fullName}</Text>
            <Text style={[styles.profileEmail, { fontFamily: 'Cairo_400Regular' }]}>{user.email || user.phone || ''}</Text>
          </View>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: '#D4AF37' }]}>
              <Text style={[styles.avatarLetter, { fontFamily: 'Cairo_700Bold' }]}>
                {(user.firstName || user.email || 'م')[0]}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu */}
      <View style={[styles.menuCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
        {MENU_ITEMS.map((item, i) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [
              styles.menuItem,
              { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
              i === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 },
            ]}
            onPress={() => item.route && router.push(item.route as any)}
          >
            <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
            <Text style={[styles.menuLabel, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}>{item.label}</Text>
            <View style={[styles.menuIcon, { backgroundColor: '#F0F5FF' }]}>
              <Ionicons name={item.icon} size={20} color="#0A2342" />
            </View>
          </Pressable>
        ))}
      </View>

      {/* Theme Section */}
      <ThemeSection colors={colors} mode={mode} setMode={setMode} />

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, { borderColor: colors.destructive, opacity: pressed ? 0.8 : 1 }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Cairo_600SemiBold' }]}>تسجيل الخروج</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  guestHero: { paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center', gap: 10 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  guestTitle: { fontSize: 24, color: '#FFFFFF' },
  guestSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  authButtons: { padding: 20, gap: 12 },
  loginBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  loginBtnText: { color: '#FFFFFF', fontSize: 16 },
  registerBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', borderWidth: 2 },
  registerBtnText: { fontSize: 15 },
  guestMenu: { paddingHorizontal: 16 },
  profileHero: { paddingHorizontal: 20, paddingBottom: 24 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileName: { fontSize: 20, color: '#FFFFFF' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#D4AF37' },
  avatarFallback: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 24, color: '#0A2342' },
  menuCard: { margin: 16, borderRadius: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, gap: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, textAlign: 'right' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 4, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, gap: 8 },
  logoutText: { fontSize: 15 },
});
