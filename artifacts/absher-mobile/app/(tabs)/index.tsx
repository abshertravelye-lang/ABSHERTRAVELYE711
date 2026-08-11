import React from 'react';
import { FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useListOffers, useListDestinations, useListPrograms } from '@workspace/api-client-react';
import { OfferCard } from '@/components/OfferCard';
import { ProgramCard } from '@/components/ProgramCard';
import { SectionHeader } from '@/components/SectionHeader';
import { SkeletonRow } from '@/components/EmptyState';
import { getImageUrl } from '@/hooks/useImageUrl';

const QUICK_ACTIONS = [
  { icon: 'airplane' as const, label: 'رحلات', route: '/flights' as const, color: '#38BDF8' },
  { icon: 'document-text' as const, label: 'تأشيرات', route: '/visas' as const, color: '#D4AF37' },
  { icon: 'globe' as const, label: 'برامج', route: '/programs' as const, color: '#0A2342' },
  { icon: 'wallet' as const, label: 'المحفظة', route: '/wallet' as const, color: '#7C3AED' },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  const { data: offers, isLoading: loadingOffers, refetch: refetchOffers } = useListOffers({ featured: true, limit: 10 });
  const { data: destinations, isLoading: loadingDest, refetch: refetchDest } = useListDestinations();
  const { data: programs, isLoading: loadingPrograms, refetch: refetchPrograms } = useListPrograms({ featured: true });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOffers(), refetchDest(), refetchPrograms()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomInset + 90 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      {/* Hero */}
      <LinearGradient colors={['#071525', '#0A2342', '#1E3A5F']} style={[styles.hero, { paddingTop: topInset + 12 }]}>
        <View style={styles.heroTop}>
          <Pressable onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={26} color="#D4AF37" />
          </Pressable>
          <View style={styles.logoArea}>
            <Image
              source={require('@/assets/images/absher-logo-transparent.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
            <View style={styles.brandText}>
              <Text style={[styles.heroTitleEn, { fontFamily: 'Cairo_600SemiBold' }]}>ABSHER TRAVEL</Text>
            </View>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={[styles.heroCardTitle, { fontFamily: 'Cairo_700Bold' }]}>
            رحلتك القادمة تبدأ هنا
          </Text>
          <Text style={[styles.heroCardSub, { fontFamily: 'Cairo_400Regular' }]}>
            عروض حصرية على الرحلات والتأشيرات والبرامج السياحية
          </Text>
          <Pressable style={styles.heroBtn} onPress={() => router.push('/flights')}>
            <Ionicons name="search" size={18} color="#0A2342" />
            <Text style={[styles.heroBtnText, { fontFamily: 'Cairo_600SemiBold' }]}>ابحث عن رحلة</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={[styles.quickActions, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
        {QUICK_ACTIONS.map(({ icon, label, route, color }) => (
          <Pressable key={label} style={styles.quickAction} onPress={() => router.push(route as any)}>
            <View style={[styles.quickIcon, { backgroundColor: `${color}18` }]}>
              <Ionicons name={icon} size={26} color={color} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Featured Offers */}
      <View style={styles.section}>
        <SectionHeader title="أحدث العروض" onSeeAll={() => router.push('/programs' as any)} />
        {loadingOffers ? (
          <View style={{ paddingHorizontal: 20 }}><SkeletonRow height={170} /></View>
        ) : (
          <FlatList
            horizontal
            inverted
            data={offers}
            keyExtractor={(o) => String(o.id)}
            renderItem={({ item }) => <OfferCard offer={item} onPress={() => {}} />}
            contentContainerStyle={{ paddingRight: 20, paddingLeft: 8 }}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={!!(offers && offers.length > 0)}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>لا توجد عروض حالياً</Text>}
          />
        )}
      </View>

      {/* Destinations */}
      <View style={styles.section}>
        <SectionHeader title="وجهات مميزة" />
        {loadingDest ? (
          <View style={{ paddingHorizontal: 20 }}><SkeletonRow height={130} /></View>
        ) : (
          <FlatList
            horizontal
            inverted
            data={destinations}
            keyExtractor={(d) => String(d.id)}
            renderItem={({ item }) => {
              const imgUri = getImageUrl(item.imageUrl);
              return (
                <Pressable
                  style={styles.destCard}
                  onPress={() => router.push(`/destination/${item.id}` as any)}
                >
                  <Image
                    source={imgUri ? { uri: imgUri } : require('@/assets/images/hero.jpg')}
                    style={styles.destImage}
                    contentFit="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(10,35,66,0.9)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={[styles.destName, { fontFamily: 'Cairo_700Bold' }]}>{item.nameAr}</Text>
                  <View style={styles.destBadge}>
                    <Ionicons name="location" size={12} color="#D4AF37" />
                  </View>
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingRight: 20, paddingLeft: 8 }}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>

      {/* Programs */}
      <View style={styles.section}>
        <SectionHeader title="البرامج السياحية" onSeeAll={() => router.push('/programs' as any)} />
        {loadingPrograms ? (
          <View style={{ paddingHorizontal: 20 }}><SkeletonRow height={200} /></View>
        ) : (
          <FlatList
            horizontal
            inverted
            data={programs}
            keyExtractor={(p) => String(p.id)}
            renderItem={({ item }) => (
              <ProgramCard program={item} onPress={() => router.push(`/program/${item.id}` as any)} />
            )}
            contentContainerStyle={{ paddingRight: 20, paddingLeft: 8 }}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 26 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoImage: { width: 100, height: 40 },
  brandText: { alignItems: 'flex-end' },
  heroTitle: { fontSize: 18, color: '#D4AF37' },
  heroTitleEn: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, marginTop: -2 },
  heroCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)' },
  heroCardTitle: { fontSize: 21, color: '#FFFFFF', textAlign: 'right', marginBottom: 8 },
  heroCardSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'right', marginBottom: 18, lineHeight: 22 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D4AF37', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 14, gap: 10, alignSelf: 'flex-start', shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  heroBtnText: { color: '#0A2342', fontSize: 15 },
  quickActions: { flexDirection: 'row', marginHorizontal: 20, marginTop: -1, borderRadius: 20, padding: 18, justifyContent: 'space-around', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5, marginBottom: 8 },
  quickAction: { alignItems: 'center', gap: 10 },
  quickIcon: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13 },
  section: { paddingTop: 22 },
  emptyText: { paddingHorizontal: 20, fontSize: 14 },
  destCard: { width: 160, height: 130, borderRadius: 16, overflow: 'hidden', marginLeft: 14, justifyContent: 'flex-end', shadowColor: '#0A2342', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  destImage: { ...StyleSheet.absoluteFillObject },
  destName: { color: '#FFFFFF', fontSize: 14, padding: 12, textAlign: 'right' },
  destBadge: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(10,35,66,0.8)', alignItems: 'center', justifyContent: 'center' },
});
