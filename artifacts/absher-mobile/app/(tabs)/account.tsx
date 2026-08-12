import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
  { value: 'light', label: 'النهاري', icon: 'sunny-outline', desc: 'أبيض ونقي' },
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
        <View style={[themeStyles.headerIcon, { backgroundColor: '#FBF6E4' }]}>
          <Ionicons name="contrast-outline" size={22} color="#D4AF37" />
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
                size={24}
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
                  <Ionicons name="checkmark-circle" size={18} color="#D4AF37" />
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
    borderRadius: 18,
    padding: 18,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    justifyContent: 'flex-end',
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17 },
  optionsRow: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  optionLabel: { fontSize: 14 },
  optionDesc: { fontSize: 11, textAlign: 'center' },
  activeDot: { position: 'absolute', top: 8, left: 8 },
});
// ─────────────────────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  { icon: 'person-circle-outline' as const, label: 'الملف الشخصي', route: '/profile-edit', color: '#D4AF37' },
  { icon: 'calendar-outline' as const, label: 'حجوزاتي', route: '/(tabs)/bookings', color: '#0A2342' },
  { icon: 'document-text-outline' as const, label: 'طلبات التأشيرة', route: null, color: '#D4AF37' },
  { icon: 'wallet-outline' as const, label: 'المحفظة', route: '/wallet', color: '#7C3AED' },
  { icon: 'notifications-outline' as const, label: 'الإشعارات', route: '/notifications', color: '#38BDF8' },
  { icon: 'settings-outline' as const, label: 'الإعدادات', route: '/settings', color: '#64748B' },
  { icon: 'help-circle-outline' as const, label: 'تواصل معنا', route: null, color: '#16A34A' },
  { icon: 'information-circle-outline' as const, label: 'عن التطبيق', route: null, color: '#0891B2' },
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
        <LinearGradient colors={['#071525', '#0A2342', '#1E3A5F']} style={[styles.guestHero, { paddingTop: topInset + 20 }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(212,175,55,0.15)', borderColor: '#D4AF37' }]}>
            <Ionicons name="person" size={52} color="#D4AF37" />
          </View>
          <Text style={[styles.guestTitle, { fontFamily: 'Cairo_700Bold' }]}>مرحباً بك</Text>
          <Text style={[styles.guestSub, { fontFamily: 'Cairo_400Regular' }]}>سجّل دخولك للوصول لحسابك وحجوزاتك</Text>
        </LinearGradient>
        <View style={styles.authButtons}>
          <Pressable
            style={({ pressed }) => [styles.loginBtn, { backgroundColor: '#D4AF37', opacity: pressed ? 0.9 : 1 }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.loginBtnText, { fontFamily: 'Cairo_700Bold' }]}>تسجيل الدخول</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.registerBtn, { borderColor: '#D4AF37', opacity: pressed ? 0.9 : 1 }]}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={[styles.registerBtnText, { color: '#D4AF37', fontFamily: 'Cairo_600SemiBold' }]}>إنشاء حساب جديد</Text>
          </Pressable>
        </View>
        <View style={styles.guestMenu}>
          {MENU_ITEMS.slice(-2).map((item) => (
            <View key={item.label} style={[styles.menuItem, { borderBottomColor: colors.border }]}>
              <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
              <Text style={[styles.menuLabel, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}>{item.label}</Text>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
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
      <LinearGradient colors={['#071525', '#0A2342', '#1E3A5F']} style={[styles.profileHero, { paddingTop: topInset + 18 }]}>
        <View style={styles.profileRow}>
          <View>
            <Text style={[styles.profileName, { fontFamily: 'Cairo_700Bold' }]}>{fullName}</Text>
            <Text style={[styles.profileEmail, { fontFamily: 'Cairo_400Regular' }]}>{user.email || user.phone || ''}</Text>
            <View style={styles.brandBadge}>
              <Text style={[styles.brandBadgeText, { fontFamily: 'Cairo_600SemiBold' }]}>ABSHER TRAVEL</Text>
            </View>
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
      </LinearGradient>

      {/* Profile completion prompt */}
      {!user.isProfileComplete && (
        <Pressable
          style={({ pressed }) => [styles.completeBanner, { opacity: pressed ? 0.9 : 1 }]}
          onPress={() => router.push('/profile-edit' as never)}
        >
          <Ionicons name="chevron-back" size={18} color="#92400E" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.completeBannerTitle, { fontFamily: 'Cairo_700Bold' }]}>أكمل ملفك الشخصي</Text>
            <Text style={[styles.completeBannerSub, { fontFamily: 'Cairo_400Regular' }]}>
              ارفع صورتك وجواز سفرك للتمكن من التقديم على التأشيرات
            </Text>
          </View>
          <View style={styles.completeBannerIcon}>
            <Ionicons name="alert-circle" size={24} color="#D97706" />
          </View>
        </Pressable>
      )}

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
            <View style={[styles.menuIcon, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
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
        <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Cairo_600SemiBold' }]}>تسجيل الخروج</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  guestHero: { paddingHorizontal: 20, paddingBottom: 36, alignItems: 'center', gap: 12 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 2 },
  guestTitle: { fontSize: 26, color: '#D4AF37' },
  guestSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  authButtons: { padding: 20, gap: 14 },
  loginBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  loginBtnText: { color: '#0A2342', fontSize: 17 },
  registerBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2 },
  registerBtnText: { fontSize: 16 },
  guestMenu: { paddingHorizontal: 16 },
  profileHero: { paddingHorizontal: 20, paddingBottom: 28 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileName: { fontSize: 22, color: '#FFFFFF' },
  profileEmail: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 5 },
  brandBadge: { backgroundColor: 'rgba(212,175,55,0.2)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  brandBadgeText: { fontSize: 10, color: '#D4AF37', letterSpacing: 0.5 },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#D4AF37' },
  avatarFallback: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 28, color: '#0A2342' },
  menuCard: { margin: 16, borderRadius: 18, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, gap: 14 },
  menuIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 16, textAlign: 'right' },
  completeBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 16, backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1.5, borderRadius: 16, padding: 14 },
  completeBannerTitle: { fontSize: 14, color: '#92400E', textAlign: 'right' },
  completeBannerSub: { fontSize: 11.5, color: '#B45309', textAlign: 'right', marginTop: 2 },
  completeBannerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 4, borderRadius: 16, borderWidth: 2, paddingVertical: 16, gap: 10 },
  logoutText: { fontSize: 16 },
});
