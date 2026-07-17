import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { getImageUrl } from '@/hooks/useImageUrl';

const MENU_ITEMS = [
  { icon: 'calendar-outline' as const, label: 'حجوزاتي', route: null },
  { icon: 'document-text-outline' as const, label: 'طلبات التأشيرة', route: null },
  { icon: 'notifications-outline' as const, label: 'الإشعارات', route: null },
  { icon: 'help-circle-outline' as const, label: 'تواصل معنا', route: null },
  { icon: 'information-circle-outline' as const, label: 'عن التطبيق', route: null },
];

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;
  const { user, isLoading, logout } = useAuth();

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
