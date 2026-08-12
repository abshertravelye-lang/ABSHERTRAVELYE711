/**
 * Home — ABSHER TRAVEL Premium Dashboard
 * Greeting header · e-visa services banner · quick actions · countries ·
 * tour programs carousel · latest offers.
 */
import React, { useCallback, useState } from 'react';
import {
  BackHandler, FlatList, Linking, Platform, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import {
  useListVisas,
  useListVisaCountries,
  useListVisaApplications,
  useListMyBookings,
  useListNotifications,
  useGetCurrentUser,
} from '@workspace/api-client-react';

// Shared UI components
import { SkeletonRow } from '@/components/EmptyState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { Button } from '@/components/ui/Button';

// Local home components
import { DestinationCard, MainServicesGrid } from '@/components/home/HomeServices';
import type { ServiceAction } from '@/components/home/HomeServices';
import { EVisaBanner } from '@/components/home/HomeComponents';

const SUPPORT_WHATSAPP = 'https://wa.me/966500000000';
const GOLD = '#D4A017';
const NAVY = '#062B5B';

export default function HomeScreen() {
  const colors = useColors();
  const { t, lang, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;
  const isDark = colors.background === '#031B3A';

  // ── Data Hooks ──
  const { data: user, isLoading: loadingUser, refetch: refetchUser } = useGetCurrentUser();
  const { data: visas, isLoading: loadingVisas, refetch: refetchVisas } = useListVisas();
  const { data: countries, isLoading: loadingCountries, refetch: refetchCountries } = useListVisaCountries({ activeOnly: true });
  const { data: applications, isLoading: loadingApps, refetch: refetchApps } = useListVisaApplications();
  const { data: bookings, isLoading: loadingBookings, refetch: refetchBookings } = useListMyBookings();
  const { data: notifications, isLoading: loadingNotifs, refetch: refetchNotifs } = useListNotifications();

  // ── Hardware Back ──
  const [exitVisible, setExitVisible] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      const onBackPress = () => {
        setExitVisible(true);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, []),
  );

  // ── Refresh ──
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchUser(),
      refetchVisas(),
      refetchCountries(),
      refetchApps(),
      refetchBookings(),
      refetchNotifs(),
    ]);
    setRefreshing(false);
  };

  // ── Computed Stats ──
  const stats = React.useMemo(() => {
    const active = (applications || []).filter(a => ['sent_to_embassy', 'processing'].includes(a.status)).length;
    const pending = (applications || []).filter(a => ['received', 'under_review', 'awaiting_documents', 'documents_uploaded'].includes(a.status)).length;
    const approved = (applications || []).filter(a => ['issued', 'completed'].includes(a.status)).length;
    const trips = (bookings || []).length;
    return { active, pending, approved, trips };
  }, [applications, bookings]);

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  // ── Services ──
  const mainServices: ServiceAction[] = [
    { id: 'umrah', icon: 'moon', title: t('homeTab.services.umrahVisa' as any), route: '/(tabs)/umrah', color: '#10B981', isUmrah: true },
    { id: 'visa', icon: 'document-text', title: t('homeTab.services.electronicVisa' as any), route: '/(tabs)/visas', color: '#3B82F6' },
    { id: 'programs', icon: 'earth', title: t('homeTab.services.tourismPrograms' as any), route: '/(tabs)/programs', color: '#F59E0B' },
    { id: 'flights', icon: 'airplane', title: t('homeTab.services.flightBooking' as any), route: '/(tabs)/flights', color: colors.skyBlue },
    { id: 'hotels', icon: 'bed', title: t('homeTab.services.hotelBooking' as any), route: '/(tabs)/flights', color: '#8B5CF6' },
    { id: 'support', icon: 'chatbubble-ellipses', title: t('homeTab.services.customerSupport' as any), route: 'support', color: '#EC4899', fullWidth: true },
  ];

  const handleServicePress = (route: string) => {
    if (route === 'support') {
      Linking.openURL(SUPPORT_WHATSAPP);
    } else {
      router.push(route as any);
    }
  };

  // ── Destinations ──
  // Take unique countries from visas to show up to 10 destinations
  const topVisas = React.useMemo(() => {
    if (!visas) return [];
    // Deduplicate by country to show variety
    const unique = new Map();
    for (const v of visas) {
      if (!unique.has(v.countryCode)) {
        unique.set(v.countryCode, v);
      }
    }
    return Array.from(unique.values()).slice(0, 10);
  }, [visas]);


  // ── Header Content ──
  const renderGreeting = () => {
    if (loadingUser) {
      return (
        <View style={[styles.greeting, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <SkeletonRow width={150} height={20} style={{ marginBottom: 8 }} />
          <SkeletonRow width={250} height={16} />
        </View>
      );
    }
    
    if (user) {
      return (
        <View style={[styles.greeting, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.greetTitle, { fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }]}>
            {t('homeTab.welcome' as any)}
          </Text>
          <Text style={[styles.greetSub, { fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>
            {t('homeTab.subtitle' as any)}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.greeting, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.greetTitle, { fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }]}>
          {t('homeTab.welcome' as any)}
        </Text>
        <Text style={[styles.greetSub, { fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>
          {t('homeTab.subtitle' as any)}
        </Text>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => router.push('/welcome')}
          style={styles.loginBtn}
          label={t('homeTab.loginInvite' as any)}
        />
      </View>
    );
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={isDark ? ['#031B3A', '#062B5B'] : ['#062B5B', '#0D4A8C']}
          style={[styles.header, { paddingTop: topInset + 14 }]}
        >
          <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <Pressable onPress={() => router.push('/notifications' as any)} style={styles.bellBtn}>
                <Ionicons name="notifications-outline" size={24} color={GOLD} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
            <View style={styles.logoArea}>
              <Image
                source={require('@/assets/images/absher-travel-logo-nobg.png')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              {user && (
                <Pressable onPress={() => router.push('/(tabs)/account' as any)} style={styles.avatarBtn}>
                  <Text style={[styles.avatarText, { fontFamily: 'Cairo_700Bold' }]}>
                    {user.firstName?.charAt(0) || 'A'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          {renderGreeting()}
        </LinearGradient>

        {/* ── E-Visa Promo ── */}
        <View style={styles.promoSection}>
          <EVisaBanner onPress={() => router.push('/(tabs)/visas' as any)} />
        </View>

        {/* ── Main Services ── */}
        <View style={styles.section}>
          <SectionHeader
            title={t('homeTab.section.services' as any)}
            onSeeAll={() => {}} // No see all needed for services
            style={{ paddingHorizontal: 20 }}
            hideSeeAll
          />
          <MainServicesGrid actions={mainServices} onActionPress={handleServicePress} />
        </View>

        {/* ── Destinations ── */}
        <View style={styles.section}>
          <SectionHeader
            title={t('homeTab.destinations' as any)}
            onSeeAll={() => router.push('/(tabs)/visas' as any)}
            style={{ paddingHorizontal: 20 }}
          />
          {loadingVisas ? (
            <View style={{ paddingHorizontal: 20 }}><SkeletonRow height={220} /></View>
          ) : topVisas.length === 0 ? (
            <EmptyState
              icon="earth"
              title={t('common.noData')}
              description=""
              style={{ paddingHorizontal: 20, paddingVertical: 40 }}
            />
          ) : (
            <FlatList
              horizontal
              
              data={topVisas}
              keyExtractor={(v) => String(v.id)}
              renderItem={({ item }) => (
                <DestinationCard
                  visa={item}
                  country={countries?.find((c) => c.countryCode === item.countryCode)}
                  onPress={() => router.push(`/(tabs)/visas` as any)} // we don't have individual visa detail route yet, so route to tab
                />
              )}
              contentContainerStyle={
                lang === 'ar'
                  ? { paddingRight: 20, paddingLeft: 8 }
                  : { paddingLeft: 20, paddingRight: 8 }
              }
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>

      </ScrollView>

      <ConfirmDialog
        visible={exitVisible}
        icon="exit-outline"
        title={t('common.close')} // Reusing common keys where possible
        message={isRTL ? 'هل أنت متأكد أنك تريد الخروج من التطبيق؟' : 'Are you sure you want to exit the app?'}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.confirm')}
        onCancel={() => setExitVisible(false)}
        onConfirm={() => {
          setExitVisible(false);
          BackHandler.exitApp();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.15)' } as any,
    }),
  },
  headerTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  bellBtn: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  badge: {
    position: 'absolute', top: 6, right: 8,
    backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: '#062B5B',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: NAVY, fontSize: 18 },
  logoArea: { flex: 1, alignItems: 'center' },
  logoImage: { width: 140, height: 54 },
  greeting: { marginTop: 22 },
  greetTitle: { fontSize: 24, color: '#FFFFFF', textAlign: 'left' },
  greetSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'left', marginTop: 4, lineHeight: 22 },
  loginBtn: { marginTop: 12, alignSelf: 'flex-start' },
  statsSection: { marginTop: -20, zIndex: 10 },
  promoSection: { marginTop: 20, paddingHorizontal: 20 },
  section: { paddingTop: 28 },
  emptyText: { paddingHorizontal: 20, fontSize: 15 },
});