import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSearchFlights } from '@workspace/api-client-react';
import type { SearchFlightsParams } from '@workspace/api-client-react';
import { FlightCard } from '@/components/FlightCard';
import { EmptyState } from '@/components/EmptyState';

const SORT_OPTS = [
  { value: 'cheapest', label: 'الأرخص' },
  { value: 'fastest', label: 'الأسرع' },
  { value: 'best_value', label: 'الأفضل' },
];

export default function FlightResultsScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  const [sort, setSort] = useState<'cheapest' | 'fastest' | 'best_value'>('cheapest');

  const params = useMemo<SearchFlightsParams>(() => {
    try {
      const parsed = JSON.parse(q || '{}');
      return { ...parsed, sort };
    } catch {
      return { sort };
    }
  }, [q, sort]);

  const { data, isLoading, error } = useSearchFlights(params);

  const origin = params.origin;
  const dest = params.destination;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: '#0A2342', paddingBottom: 16 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.routeInfo}>
            <Text style={[styles.routeText, { fontFamily: 'Cairo_700Bold' }]}>
              {origin} → {dest}
            </Text>
            <Text style={[styles.routeSub, { fontFamily: 'Cairo_400Regular' }]}>
              {params.departureDate} · {params.adults || 1} مسافر
            </Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        {/* Sort */}
        <View style={styles.sortRow}>
          {SORT_OPTS.map((s) => (
            <Pressable
              key={s.value}
              style={[styles.sortChip, { backgroundColor: sort === s.value ? '#D4AF37' : 'rgba(255,255,255,0.15)' }]}
              onPress={() => setSort(s.value as any)}
            >
              <Text style={[styles.sortText, { color: sort === s.value ? '#0A2342' : 'rgba(255,255,255,0.8)', fontFamily: 'Cairo_600SemiBold' }]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <EmptyState icon="airplane-outline" title="خطأ في البحث" description="تعذر البحث عن الرحلات، حاول مرة أخرى" actionLabel="رجوع" onAction={() => router.back()} />
      ) : isLoading ? (
        <EmptyState loading title="جاري البحث عن الرحلات..." />
      ) : !data?.offers?.length ? (
        <EmptyState icon="airplane-outline" title="لا توجد رحلات" description="لم يتم العثور على رحلات مطابقة لبحثك" actionLabel="بحث جديد" onAction={() => router.back()} />
      ) : (
        <>
          <View style={[styles.resultsMeta, { backgroundColor: colors.muted }]}>
            <Text style={[styles.resultsCount, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
              {data.totalResults} رحلة متاحة
            </Text>
          </View>
          <FlatList
            data={data.offers}
            keyExtractor={(o) => o.providerOfferId}
            renderItem={({ item }) => (
              <FlightCard
                offer={item}
                onPress={() =>
                  router.push({
                    pathname: '/flight-booking',
                    params: { offer: JSON.stringify(item) },
                  })
                }
              />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 20 }}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  routeInfo: { alignItems: 'center' },
  routeText: { color: '#FFFFFF', fontSize: 18 },
  routeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: { flex: 1, borderRadius: 20, paddingVertical: 8, alignItems: 'center' },
  sortText: { fontSize: 13 },
  resultsMeta: { paddingHorizontal: 16, paddingVertical: 8 },
  resultsCount: { fontSize: 13, textAlign: 'right' },
});
