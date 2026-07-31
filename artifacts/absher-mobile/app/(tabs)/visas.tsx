import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      <LinearGradient colors={['#071525', '#0A2342', '#1E3A5F']} style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>التأشيرات</Text>
        <Text style={[styles.headerSubtitle, { fontFamily: 'Cairo_400Regular' }]}>أكثر من 150 وجهة حول العالم</Text>
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(212,175,55,0.3)' }]}>
          <Ionicons name="search" size={20} color="#D4AF37" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن دولة..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={[styles.searchInput, { color: '#FFFFFF', fontFamily: 'Cairo_400Regular' }]}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* Umrah Visa Banner */}
      <Pressable
        style={styles.umrahBanner}
        onPress={() => router.push('/umrah-visa' as any)}
      >
        <LinearGradient
          colors={['#0A2342', '#1E3A5F']}
          style={styles.umrahGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.umrahLeft}>
            <View style={styles.umrahIconWrap}>
              <Ionicons name="moon" size={28} color="#D4AF37" />
            </View>
            <View style={styles.umrahArrow}>
              <Ionicons name="arrow-back" size={20} color="#D4AF37" />
            </View>
          </View>
          <View style={styles.umrahText}>
            <Text style={[styles.umrahTitle, { fontFamily: 'Cairo_700Bold' }]}>تأشيرة العمرة</Text>
            <Text style={[styles.umrahSub, { fontFamily: 'Cairo_400Regular' }]}>تقديم فوري مع مسح الجواز تلقائياً</Text>
          </View>
        </LinearGradient>
      </Pressable>

      {/* Category Filter */}
      <FlatList
        horizontal
        inverted
        data={CATEGORIES}
        keyExtractor={(c) => c.value}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.chip,
              {
                backgroundColor: category === item.value ? '#D4AF37' : colors.muted,
                borderColor: category === item.value ? '#D4AF37' : colors.border,
              }
            ]}
            onPress={() => setCategory(item.value)}
          >
            <Text style={[styles.chipText, { color: category === item.value ? '#0A2342' : colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
              {item.label}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}
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
  header: { paddingHorizontal: 16, paddingBottom: 18 },
  headerTitle: { fontSize: 24, color: '#D4AF37', textAlign: 'right', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  searchInput: { flex: 1, fontSize: 15, textAlign: 'right' },
  chips: { borderBottomWidth: 1 },
  chip: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  chipText: { fontSize: 14 },
  // Umrah banner
  umrahBanner: { marginHorizontal: 16, marginTop: 14, marginBottom: 2, borderRadius: 18, overflow: 'hidden', elevation: 4, shadowColor: '#0A2342', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8 },
  umrahGradient: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  umrahLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  umrahIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(212,175,55,0.15)', borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.4)', alignItems: 'center', justifyContent: 'center' },
  umrahArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(212,175,55,0.1)', alignItems: 'center', justifyContent: 'center' },
  umrahText: { flex: 1, alignItems: 'flex-end' },
  umrahTitle: { fontSize: 17, color: '#D4AF37' },
  umrahSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
});
