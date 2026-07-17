import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useListVisas } from '@workspace/api-client-react';
import { VisaCard } from '@/components/VisaCard';
import { EmptyState } from '@/components/EmptyState';

const CATEGORIES = [
  { value: '', label: 'الكل' },
  { value: 'tourist', label: 'سياحية' },
  { value: 'business', label: 'تجارية' },
  { value: 'umrah', label: 'عمرة' },
  { value: 'medical', label: 'طبية' },
  { value: 'study', label: 'دراسية' },
  { value: 'visit', label: 'زيارة' },
];

export default function VisasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { data: visas, isLoading, error, refetch } = useListVisas();

  const filtered = useMemo(() => {
    if (!visas) return [];
    return visas.filter((v) => {
      const matchSearch = !search || v.countryAr.includes(search) || (v.countryEn && v.countryEn.toLowerCase().includes(search.toLowerCase()));
      const matchCat = !category || v.category === category;
      return matchSearch && matchCat && v.isActive;
    });
  }, [visas, search, category]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: '#0A2342' }]}>
        <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>التأشيرات</Text>
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.7)" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن دولة..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={[styles.searchInput, { color: '#FFFFFF', fontFamily: 'Cairo_400Regular' }]}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        inverted
        data={CATEGORIES}
        keyExtractor={(c) => c.value}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, { backgroundColor: category === item.value ? '#0A2342' : colors.muted }]}
            onPress={() => setCategory(item.value)}
          >
            <Text style={[styles.chipText, { color: category === item.value ? '#FFFFFF' : colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
              {item.label}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        showsHorizontalScrollIndicator={false}
        style={[styles.chips, { borderBottomColor: colors.border }]}
      />

      {/* List */}
      {error ? (
        <EmptyState icon="wifi-outline" title="خطأ في التحميل" description="تعذر تحميل التأشيرات" actionLabel="إعادة المحاولة" onAction={() => refetch()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => String(v.id)}
          renderItem={({ item }) => (
            <VisaCard visa={item} onPress={() => router.push(`/visa/${item.id}` as any)} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 90 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isLoading
              ? <EmptyState loading title="" />
              : <EmptyState icon="document-text-outline" title="لا توجد تأشيرات" description="لا توجد نتائج مطابقة لبحثك" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 22, color: '#FFFFFF', textAlign: 'right', marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, textAlign: 'right' },
  chips: { borderBottomWidth: 1 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13 },
});
