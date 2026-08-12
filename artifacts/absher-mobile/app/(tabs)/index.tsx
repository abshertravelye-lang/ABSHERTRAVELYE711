import React, { useCallback, useState } from 'react';
import { BackHandler, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useListNotifications, useGetCurrentUser, useListVisas, useListVisaCountries, useListVisaApplications, useListMyBookings } from '@workspace/api-client-react';

const SUPPORT_WHATSAPP = 'https://wa.me/966500000000';

export default function HomeScreen() {
  const colors = useColors();
  const { t, lang, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { data: user } = useGetCurrentUser();
  const { data: notifications, refetch: refetchNotifs } = useListNotifications();
  const { refetch: refetchVisas } = useListVisas();
  const { refetch: refetchCountries } = useListVisaCountries({ activeOnly: true });
  const { refetch: refetchApps } = useListVisaApplications();
  const { refetch: refetchBookings } = useListMyBookings();
  const unreadCount = (notifications || []).filter(n => !n.isRead).length;
  const [refreshing, setRefreshing] = useState(false);
  const [exitVisible, setExitVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setExitVisible(true); return true; });
    return () => sub.remove();
  }, []));

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchNotifs(), refetchVisas(), refetchCountries(), refetchApps(), refetchBookings()]);
    setRefreshing(false);
  };

  const services = [
    { icon: 'bed-outline', title: lang === 'ar' ? 'حجوزات الفنادق' : 'Hotel bookings', route: '/coming-soon?service=hotels' },
    { icon: 'airplane-outline', title: lang === 'ar' ? 'حجوزات الطيران' : 'Flight bookings', route: '/coming-soon?service=flights' },
    { icon: 'moon-outline', title: lang === 'ar' ? 'تأشيرة العمرة' : 'Umrah visa', route: '/(tabs)/umrah' },
    { icon: 'document-text-outline', title: lang === 'ar' ? 'التأشيرات الإلكترونية' : 'E-visas', route: '/(tabs)/visas' },
  ];

  return <>
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 16, 40), backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/notifications')}>
            <Ionicons name="notifications-outline" size={23} color={colors.primary} />
            {unreadCount > 0 && <View style={styles.badge} />}
          </Pressable>
          <Image source={require('@/assets/images/absher-travel-logo-nobg.png')} style={styles.logo} contentFit="contain" />
          <Pressable style={styles.langPill} onPress={() => {}}><Text style={[styles.lang, { color: colors.primary }]}>{lang === 'ar' ? 'AR' : 'EN'}</Text><Ionicons name="globe-outline" size={16} color={colors.primary} /></Pressable>
        </View>
      </View>

      <View style={styles.heroPad}>
        <LinearGradient colors={['#0A2342', '#163354']} style={styles.hero}>
          <Image source={require('@/assets/images/hero.jpg')} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroShade} />
          <View style={[styles.heroCopy, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.heroTitle, { fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }]}>{lang === 'ar' ? 'رحلتك تبدأ بثقة' : 'Your journey starts with confidence'}</Text>
            <Text style={[styles.heroSub, { fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{lang === 'ar' ? 'خدمات موثوقة لتجربة سفر استثنائية' : 'Trusted services for an exceptional journey'}</Text>
            <View style={styles.goldLine} />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.primary, fontFamily: 'Cairo_700Bold' }]}>{lang === 'ar' ? 'خدماتنا' : 'Our services'}</Text><View style={[styles.titleLine, { backgroundColor: colors.accent }]} /></View>
      <View style={styles.grid}>
        {services.map(item => <Pressable key={item.title} onPress={() => router.push(item.route as any)} style={({ pressed }) => [styles.service, { backgroundColor: colors.card, opacity: pressed ? .75 : 1 }]}>
          <Ionicons name={item.icon as any} size={45} color={colors.primary} />
          <Text style={[styles.serviceTitle, { color: colors.text, fontFamily: 'Cairo_600SemiBold' }]}>{item.title}</Text>
          <View style={styles.arrow}><Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={19} color={colors.accent} /></View>
        </Pressable>)}
      </View>

      <View style={styles.experiencePad}><LinearGradient colors={['#0A2342', '#163354']} style={styles.experience}><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="ribbon-outline" size={26} color={colors.accent} /><Text style={[styles.experienceTitle, { fontFamily: 'Cairo_700Bold' }]}>{lang === 'ar' ? 'تجربة سفر مميزة' : 'A remarkable travel experience'}</Text></View><Text style={[styles.experienceSub, { fontFamily: 'Cairo_400Regular' }]}>{lang === 'ar' ? 'خدمات عالية الجودة وأسعار تنافسية ودعم على مدار الساعة' : 'Quality services, competitive prices, and 24/7 support'}</Text></View><Pressable onPress={() => Linking.openURL(SUPPORT_WHATSAPP)} style={styles.discover}><Text style={[styles.discoverText, { fontFamily: 'Cairo_600SemiBold' }]}>{lang === 'ar' ? 'اكتشف المزيد' : 'Discover'}</Text><Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={16} color="#FFFFFF" /></Pressable></LinearGradient></View>
    </ScrollView>
    <ConfirmDialog visible={exitVisible} icon="exit-outline" title={t('common.close')} message={isRTL ? 'هل أنت متأكد أنك تريد الخروج من التطبيق؟' : 'Are you sure you want to exit?'} cancelLabel={t('common.cancel')} confirmLabel={t('common.confirm')} onCancel={() => setExitVisible(false)} onConfirm={() => { setExitVisible(false); BackHandler.exitApp(); }} />
  </>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 18 }, topBar: { justifyContent: 'space-between', alignItems: 'center' }, iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 2 }, badge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C9A24B' }, logo: { width: 140, height: 66 }, langPill: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, elevation: 2 }, lang: { fontFamily: 'Cairo_700Bold', fontSize: 12 }, heroPad: { paddingHorizontal: 20 }, hero: { height: 160, borderRadius: 20, overflow: 'hidden', position: 'relative' }, heroImage: { position: 'absolute', right: 0, width: '62%', height: '100%', opacity: .7 }, heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,35,66,.28)' }, heroCopy: { padding: 24, width: '65%', zIndex: 2 }, heroTitle: { color: '#FFFFFF', fontSize: 21 }, heroSub: { color: 'rgba(255,255,255,.78)', fontSize: 12, marginTop: 5, lineHeight: 19 }, goldLine: { width: 24, height: 2, backgroundColor: '#C9A24B', marginTop: 18 }, sectionHeader: { marginTop: 24, marginHorizontal: 20, alignItems: 'flex-end', gap: 7 }, sectionTitle: { fontSize: 19 }, titleLine: { width: 35, height: 2 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, marginTop: 12 }, service: { width: '48%', minHeight: 158, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 12, shadowColor: '#0A2342', shadowOpacity: .05, shadowRadius: 12, elevation: 2 }, serviceTitle: { fontSize: 14, marginTop: 9, textAlign: 'center' }, arrow: { marginTop: 7 }, experiencePad: { paddingHorizontal: 20, marginTop: 24 }, experience: { borderRadius: 20, padding: 20, minHeight: 120, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, experienceTitle: { color: '#FFFFFF', fontSize: 15 }, experienceSub: { color: 'rgba(255,255,255,.75)', fontSize: 11, lineHeight: 18, marginTop: 6, textAlign: 'right' }, discover: { borderWidth: 1, borderColor: '#C9A24B', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }, discoverText: { color: '#FFFFFF', fontSize: 10 }
});
