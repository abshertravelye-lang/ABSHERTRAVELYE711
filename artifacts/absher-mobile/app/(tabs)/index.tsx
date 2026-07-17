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
  { icon: 'airplane-outline' as const, label: 'رحلات', route: '/flights' as const },
  { icon: 'document-text-outline' as const, label: 'تأشيرات', route: '/visas' as const },
  { icon: 'globe-outline' as const, label: 'برامج', route: '/programs' as const },
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
    >
      {/* Hero */}
      <LinearGradient colors={['#0A2342', '#1E3A5F', '#2563EB']} style={[styles.hero, { paddingTop: topInset + 10 }]}>
        <View style={styles.heroTop}>
          <Pressable onPress={() => router.push('/account')}>
            <Ionicons name="person-circle-outline" size={32} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={styles.logoArea}>
            <Text style={[styles.heroTitle, { fontFamily: 'Cairo_700Bold' }]}>أبشر أعمال</Text>
            <Text style={[styles.heroSub, { fontFamily: 'Cairo_400Regular' }]}>للسفريات والسياحة</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={[styles.heroCardTitle, { fontFamily: 'Cairo_700Bold' }]}>
            احجز رحلتك الآن
          </Text>
          <Text style={[styles.heroCardSub, { fontFamily: 'Cairo_400Regular' }]}>
            عروض حصرية على الرحلات والتأشيرات
          </Text>
          <Pressable style={styles.heroBtn} onPress={() => router.push('/flights')}>
            <Ionicons name="search" size={16} color="#0A2342" />
            <Text style={[styles.heroBtnText, { fontFamily: 'Cairo_600SemiBold' }]}>ابحث عن رحلة</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={[styles.quickActions, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
        {QUICK_ACTIONS.map(({ icon, label, route }) => (
          <Pressable key={label} style={styles.quickAction} onPress={() => router.push(route as any)}>
            <View style={[styles.quickIcon, { backgroundColor: '#F0F5FF' }]}>
              <Ionicons name={icon} size={24} color="#0A2342" />
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
          <View style={{ paddingHorizontal: 20 }}><SkeletonRow height={120} /></View>
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
                    colors={['transparent', 'rgba(10,35,66,0.8)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={[styles.destName, { fontFamily: 'Cairo_700Bold' }]}>{item.nameAr}</Text>
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
  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoArea: { alignItems: 'flex-end' },
  heroTitle: { fontSize: 22, color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: -4 },
  heroCard: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  heroCardTitle: { fontSize: 20, color: '#FFFFFF', textAlign: 'right', marginBottom: 6 },
  heroCardSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'right', marginBottom: 16 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D4AF37', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, gap: 8, alignSelf: 'flex-start' },
  heroBtnText: { color: '#0A2342', fontSize: 14 },
  quickActions: { flexDirection: 'row', marginHorizontal: 20, marginTop: -1, borderRadius: 18, padding: 16, justifyContent: 'space-around', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginBottom: 8 },
  quickAction: { alignItems: 'center', gap: 8 },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13 },
  section: { paddingTop: 20 },
  emptyText: { paddingHorizontal: 20, fontSize: 14 },
  destCard: { width: 150, height: 110, borderRadius: 14, overflow: 'hidden', marginLeft: 12, justifyContent: 'flex-end' },
  destImage: { ...StyleSheet.absoluteFillObject },
  destName: { color: '#FFFFFF', fontSize: 13, padding: 10, textAlign: 'right' },
});
