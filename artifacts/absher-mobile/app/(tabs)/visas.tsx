import React, { useMemo, useState, useRef } from 'react';
import {
  Animated, FlatList, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useListVisas } from '@workspace/api-client-react';
import { VisaCard, VisaCardHorizontal } from '@/components/VisaCard';
import { EmptyState } from '@/components/EmptyState';

// ── filter data ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: '', label: 'الكل', icon: 'globe-outline' },
  { value: 'tourist', label: 'سياحية', icon: 'sunny-outline' },
  { value: 'business', label: 'تجارية', icon: 'briefcase-outline' },
  { value: 'umrah', label: 'عمرة', icon: 'moon-outline' },
  { value: 'medical', label: 'طبية', icon: 'medkit-outline' },
  { value: 'study', label: 'دراسية', icon: 'school-outline' },
  { value: 'visit', label: 'زيارة', icon: 'home-outline' },
] as const;

const ENTRY_FILTERS = [
  { value: '', label: 'أي دخول' },
  { value: 'single', label: 'دخول واحد' },
  { value: 'multiple', label: 'دخول متعدد' },
] as const;

const PROC_FILTERS = [
  { value: '', label: 'أي مدة' },
  { value: 'express', label: '1-3 أيام' },
  { value: 'standard', label: '4-7 أيام' },
  { value: 'long', label: '+7 أيام' },
] as const;

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, subtitle, color = '#D4AF37',
}: { icon: string; title: string; subtitle?: string; color?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { fontFamily: 'Cairo_700Bold' }]}>{title}</Text>
        {subtitle && <Text style={[styles.sectionSub, { fontFamily: 'Cairo_400Regular' }]}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function VisasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [entryType, setEntryType] = useState('');
  const [processing, setProcessing] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: visas, isLoading, error, refetch } = useListVisas();

  const active = useMemo(() => (visas || []).filter(v => v.isActive && v.status === 'available'), [visas]);

  const filtered = useMemo(() => {
    return active.filter((v) => {
      const matchSearch = !search ||
        v.countryAr.includes(search) ||
        (v.countryEn && v.countryEn.toLowerCase().includes(search.toLowerCase()));
      const matchCat = !category || v.category === category;
      const matchEntry = !entryType || v.entryType === entryType;
      const matchProc = !processing ||
        (processing === 'express' && v.processingDays <= 3) ||
        (processing === 'standard' && v.processingDays >= 4 && v.processingDays <= 7) ||
        (processing === 'long' && v.processingDays > 7);
      return matchSearch && matchCat && matchEntry && matchProc;
    });
  }, [active, search, category, entryType, processing]);

  // Section lists
  const fastApproval = useMemo(() => active.filter(v => v.processingDays <= 3), [active]);
  const multipleEntry = useMemo(() => active.filter(v => v.entryType === 'multiple'), [active]);
  const affordable = useMemo(() => [...active].sort((a, b) => Number(a.fee) - Number(b.fee)).slice(0, 8), [active]);
  const recentlyAdded = useMemo(() => [...active].sort((a, b) => b.id - a.id).slice(0, 8), [active]);

  const isSearching = !!(search || category || entryType || processing);

  const navToVisa = (id: number) => router.push(`/visa/${id}` as any);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#071525', '#0A2342', '#1A3460']}
        style={[styles.header, { paddingTop: topInset + 12 }]}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>مركز التأشيرات</Text>
            <Text style={[styles.headerSub, { fontFamily: 'Cairo_400Regular' }]}>
              {active.length > 0 ? `${active.length}+ تأشيرة متاحة` : 'جميع الوجهات العالمية'}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterBtn, { backgroundColor: showFilters ? '#D4AF37' : 'rgba(255,255,255,0.15)' }]}
          >
            <Ionicons name="options-outline" size={20} color={showFilters ? '#0A2342' : '#FFFFFF'} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(212,175,55,0.35)' }]}>
          <Ionicons name="search" size={18} color="#D4AF37" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن دولة أو نوع تأشيرة..."
            placeholderTextColor="rgba(255,255,255,0.45)"
            style={[styles.searchInput, { color: '#FFFFFF', fontFamily: 'Cairo_400Regular' }]}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { n: `${active.length}+`, l: 'تأشيرة' },
            { n: `${fastApproval.length}+`, l: 'موافقة سريعة' },
            { n: `${multipleEntry.length}+`, l: 'دخول متعدد' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={[styles.statNum, { fontFamily: 'Cairo_700Bold' }]}>{s.n}</Text>
              <Text style={[styles.statLabel, { fontFamily: 'Cairo_400Regular' }]}>{s.l}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Extra Filters Panel ── */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.filterGroupLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
            نوع الدخول
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
              {ENTRY_FILTERS.map(f => (
                <Pressable
                  key={f.value}
                  onPress={() => setEntryType(f.value)}
                  style={[styles.filterChip, {
                    backgroundColor: entryType === f.value ? '#0A2342' : colors.muted,
                    borderColor: entryType === f.value ? '#0A2342' : colors.border,
                  }]}
                >
                  <Text style={[styles.filterChipText, {
                    color: entryType === f.value ? '#FFFFFF' : colors.mutedForeground,
                    fontFamily: 'Cairo_600SemiBold',
                  }]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.filterGroupLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
            مدة المعالجة
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
              {PROC_FILTERS.map(f => (
                <Pressable
                  key={f.value}
                  onPress={() => setProcessing(f.value)}
                  style={[styles.filterChip, {
                    backgroundColor: processing === f.value ? '#D4AF37' : colors.muted,
                    borderColor: processing === f.value ? '#D4AF37' : colors.border,
                  }]}
                >
                  <Text style={[styles.filterChipText, {
                    color: processing === f.value ? '#0A2342' : colors.mutedForeground,
                    fontFamily: 'Cairo_600SemiBold',
                  }]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── Category chips ── */}
      <FlatList
        horizontal
        inverted
        data={CATEGORIES}
        keyExtractor={c => c.value}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, {
              backgroundColor: category === item.value ? '#D4AF37' : colors.muted,
              borderColor: category === item.value ? '#D4AF37' : colors.border,
            }]}
            onPress={() => setCategory(item.value)}
          >
            <Ionicons
              name={item.icon as any}
              size={14}
              color={category === item.value ? '#0A2342' : colors.mutedForeground}
            />
            <Text style={[styles.chipText, {
              color: category === item.value ? '#0A2342' : colors.mutedForeground,
              fontFamily: 'Cairo_600SemiBold',
            }]}>
              {item.label}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        showsHorizontalScrollIndicator={false}
        style={[styles.chips, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
      />

      {/* ── Content ── */}
      {error ? (
        <EmptyState icon="wifi-outline" title="خطأ في التحميل" description="تعذر تحميل التأشيرات" actionLabel="إعادة المحاولة" onAction={() => refetch()} />
      ) : isLoading ? (
        <EmptyState loading title="" />
      ) : isSearching ? (
        /* Search / filter results */
        <FlatList
          data={filtered}
          keyExtractor={v => String(v.id)}
          renderItem={({ item }) => (
            <VisaCard visa={item} onPress={() => navToVisa(item.id)} style={{ marginHorizontal: 16 }} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultsCount, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
              {filtered.length} نتيجة
            </Text>
          }
          ListEmptyComponent={
            <EmptyState icon="document-text-outline" title="لا توجد تأشيرات" description="لا توجد نتائج مطابقة لبحثك" />
          }
        />
      ) : (
        /* Sections view */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
        >
          {/* Umrah special banner */}
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
                  <Ionicons name="moon" size={26} color="#D4AF37" />
                </View>
              </View>
              <View style={styles.umrahText}>
                <Text style={[styles.umrahTitle, { fontFamily: 'Cairo_700Bold' }]}>تأشيرة العمرة</Text>
                <Text style={[styles.umrahSub, { fontFamily: 'Cairo_400Regular' }]}>تقديم فوري مع مسح الجواز تلقائياً</Text>
              </View>
              <Ionicons name="arrow-back" size={20} color="#D4AF37" />
            </LinearGradient>
          </Pressable>

          {/* Fast Approval */}
          {fastApproval.length > 0 && (
            <View style={styles.section}>
              <SectionHeader icon="flash" title="موافقة سريعة" subtitle={`${fastApproval.length} تأشيرة خلال 1-3 أيام`} color="#D4AF37" />
              <FlatList
                horizontal
                inverted
                data={fastApproval}
                keyExtractor={v => `fa-${v.id}`}
                renderItem={({ item }) => (
                  <VisaCardHorizontal visa={item} onPress={() => navToVisa(item.id)} width={185} />
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Most Affordable */}
          {affordable.length > 0 && (
            <View style={styles.section}>
              <SectionHeader icon="pricetag" title="الأقل سعراً" subtitle="ابدأ رحلتك بتكلفة معقولة" color="#16A34A" />
              <FlatList
                horizontal
                inverted
                data={affordable}
                keyExtractor={v => `af-${v.id}`}
                renderItem={({ item }) => (
                  <VisaCardHorizontal visa={item} onPress={() => navToVisa(item.id)} width={185} />
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Multiple Entry */}
          {multipleEntry.length > 0 && (
            <View style={styles.section}>
              <SectionHeader icon="airplane" title="دخول متعدد" subtitle="استمتع بالدخول أكثر من مرة" color="#3B82F6" />
              <FlatList
                horizontal
                inverted
                data={multipleEntry}
                keyExtractor={v => `me-${v.id}`}
                renderItem={({ item }) => (
                  <VisaCardHorizontal visa={item} onPress={() => navToVisa(item.id)} width={185} />
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* Recently Added */}
          {recentlyAdded.length > 0 && (
            <View style={styles.section}>
              <SectionHeader icon="sparkles" title="أحدث التأشيرات" subtitle="تمت إضافتها مؤخراً" color="#8B5CF6" />
              <FlatList
                horizontal
                inverted
                data={recentlyAdded}
                keyExtractor={v => `ra-${v.id}`}
                renderItem={({ item }) => (
                  <VisaCardHorizontal visa={item} onPress={() => navToVisa(item.id)} width={185} />
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {/* All Visas vertical list */}
          {active.length > 0 && (
            <View style={styles.section}>
              <SectionHeader icon="globe" title="جميع التأشيرات" subtitle={`${active.length} وجهة متاحة`} color="#0A2342" />
              <View style={{ paddingHorizontal: 16 }}>
                {active.slice(0, 20).map(item => (
                  <VisaCard key={item.id} visa={item} onPress={() => navToVisa(item.id)} />
                ))}
              </View>
            </View>
          )}

          {active.length === 0 && !isLoading && (
            <EmptyState icon="document-text-outline" title="لا توجد تأشيرات" description="لم يتم إضافة أي تأشيرات بعد" />
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Header
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  headerTitle: { fontSize: 22, color: '#D4AF37', textAlign: 'right' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  filterBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginStart: 12, marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, textAlign: 'right' },
  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, color: '#D4AF37' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  // Filters panel
  filtersPanel: {
    paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1,
  },
  filterGroupLabel: { fontSize: 12, textAlign: 'right', paddingHorizontal: 16, marginBottom: 8 },
  filterChip: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  filterChipText: { fontSize: 13 },
  // Category chips
  chips: { borderBottomWidth: 1, maxHeight: 56 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  chipText: { fontSize: 13 },
  // Sections
  section: { marginTop: 22 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, marginBottom: 14,
  },
  sectionIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, color: '#0A2342' },
  sectionSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  // Results
  resultsCount: { fontSize: 13, textAlign: 'right', marginBottom: 12 },
  // Umrah banner
  umrahBanner: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 18,
    overflow: 'hidden', elevation: 4,
    shadowColor: '#0A2342', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  umrahGradient: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16, gap: 12,
  },
  umrahLeft: {},
  umrahIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(212,175,55,0.15)', borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  umrahText: { flex: 1, alignItems: 'flex-end' },
  umrahTitle: { fontSize: 16, color: '#D4AF37' },
  umrahSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
});
