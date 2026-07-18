import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import AirportSearch from '@/components/AirportSearch';
import DatePickerModal, { DateField } from '@/components/DatePickerModal';
import { Airport, AIRPORTS } from '@/constants/airports';

const CABIN_CLASSES = [
  { value: 'economy',         label: 'اقتصادية' },
  { value: 'premium_economy', label: 'اقتصادية مميزة' },
  { value: 'business',        label: 'رجال الأعمال' },
  { value: 'first',           label: 'درجة أولى' },
];

const POPULAR_ROUTES: { fromCode: string; fromCity: string; toCode: string; toCity: string }[] = [
  { fromCode: 'RUH', fromCity: 'الرياض',   toCode: 'DXB', toCity: 'دبي' },
  { fromCode: 'JED', fromCity: 'جدة',       toCode: 'CAI', toCity: 'القاهرة' },
  { fromCode: 'RUH', fromCity: 'الرياض',   toCode: 'IST', toCity: 'إسطنبول' },
  { fromCode: 'RUH', fromCity: 'الرياض',   toCode: 'LHR', toCity: 'لندن' },
  { fromCode: 'DOH', fromCity: 'الدوحة',   toCode: 'BOM', toCity: 'مومباي' },
  { fromCode: 'AUH', fromCity: 'أبوظبي',   toCode: 'DEL', toCity: 'دلهي' },
];

// today's ISO string
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function FlightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  const [tripType,       setTripType]       = useState<'one_way' | 'round_trip'>('one_way');
  const [origin,         setOrigin]         = useState<Airport | null>(null);
  const [destination,    setDestination]    = useState<Airport | null>(null);
  const [departureDate,  setDepartureDate]  = useState('');
  const [returnDate,     setReturnDate]     = useState('');
  const [adults,         setAdults]         = useState(1);
  const [cabin,          setCabin]          = useState('economy');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const swap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tmp = origin;
    setOrigin(destination);
    setDestination(tmp);
  };

  const search = () => {
    if (!origin || !destination || !departureDate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const params = JSON.stringify({
      origin: origin.iata,
      destination: destination.iata,
      departureDate,
      returnDate: tripType === 'round_trip' ? returnDate : undefined,
      tripType,
      adults,
      cabinClass: cabin,
    });
    router.push({ pathname: '/flight-results', params: { q: params } });
  };

  const applyPopularRoute = (r: (typeof POPULAR_ROUTES)[0]) => {
    const from = AIRPORTS.find((a) => a.iata === r.fromCode) ?? null;
    const to   = AIRPORTS.find((a) => a.iata === r.toCode)   ?? null;
    setOrigin(from);
    setDestination(to);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const canSearch = !!origin && !!destination && !!departureDate;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: '#0A2342' }]}>
        <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>البحث عن رحلات</Text>
        <View style={styles.toggle}>
          {(['one_way', 'round_trip'] as const).map((t) => (
            <Pressable
              key={t}
              style={[styles.toggleBtn, tripType === t && styles.toggleBtnActive]}
              onPress={() => {
                setTripType(t);
                if (t === 'one_way') setReturnDate('');
              }}
            >
              <Text style={[styles.toggleText, { fontFamily: 'Cairo_600SemiBold' }, tripType === t && styles.toggleTextActive]}>
                {t === 'one_way' ? 'ذهاب فقط' : 'ذهاب وعودة'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.form}>
        {/* ── From / To ───────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <AirportSearch
            selected={origin}
            onSelect={setOrigin}
            placeholder="مطار المغادرة"
            icon="airplane-outline"
          />

          {/* Swap button */}
          <Pressable style={[styles.swapBtn, { backgroundColor: '#0A2342' }]} onPress={swap}>
            <Ionicons name="swap-vertical" size={18} color="#FFFFFF" />
          </Pressable>

          <AirportSearch
            selected={destination}
            onSelect={setDestination}
            placeholder="مطار الوصول"
            icon="location-outline"
          />
        </View>

        {/* ── Dates ───────────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <DateField
            value={departureDate}
            placeholder={tripType === 'round_trip' ? 'تاريخ الذهاب' : 'تاريخ السفر'}
            onPress={() => setShowDatePicker(true)}
            colors={colors}
          />
          {tripType === 'round_trip' && returnDate !== '' && (
            <View style={styles.returnRow}>
              <Ionicons name="arrow-back" size={14} color={colors.mutedForeground} />
              <Text style={[styles.returnLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>العودة:</Text>
              <Text style={[styles.returnDate, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{returnDate}</Text>
            </View>
          )}
          {tripType === 'round_trip' && returnDate === '' && departureDate !== '' && (
            <Text style={[styles.returnHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
              اضغط مجدداً لاختيار تاريخ العودة
            </Text>
          )}
        </View>

        {/* ── Passengers + Cabin ──────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.passRow}>
            <View style={styles.counter}>
              <Pressable
                style={[styles.countBtn, { backgroundColor: colors.muted }]}
                onPress={() => setAdults(Math.max(1, adults - 1))}
              >
                <Ionicons name="remove" size={18} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.countNum, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{adults}</Text>
              <Pressable
                style={[styles.countBtn, { backgroundColor: '#0A2342' }]}
                onPress={() => setAdults(Math.min(9, adults + 1))}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
            <Text style={[styles.passLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>عدد المسافرين</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cabinRow}>
              {CABIN_CLASSES.map((c) => (
                <Pressable
                  key={c.value}
                  style={[styles.cabinChip, { backgroundColor: cabin === c.value ? '#0A2342' : colors.muted }]}
                  onPress={() => setCabin(c.value)}
                >
                  <Text style={[styles.cabinText, { color: cabin === c.value ? '#FFFFFF' : colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* ── Search Button ───────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.searchBtn,
            { opacity: pressed ? 0.9 : 1, backgroundColor: canSearch ? '#0A2342' : colors.muted },
          ]}
          onPress={search}
          disabled={!canSearch}
        >
          <Ionicons name="search" size={20} color={canSearch ? '#FFFFFF' : colors.mutedForeground} />
          <Text style={[styles.searchBtnText, { color: canSearch ? '#FFFFFF' : colors.mutedForeground, fontFamily: 'Cairo_700Bold' }]}>
            بحث عن رحلات
          </Text>
        </Pressable>

        {/* ── Popular Routes ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>مسارات شائعة</Text>
          {POPULAR_ROUTES.map((r, i) => (
            <Pressable
              key={i}
              style={[styles.routeChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => applyPopularRoute(r)}
            >
              <Ionicons name="airplane" size={15} color="#0A2342" />
              <Text style={[styles.routeText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
                {r.fromCity} ← {r.toCity}
              </Text>
              <Text style={[styles.routeCode, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                {r.fromCode} - {r.toCode}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Date Picker Modal ───────────────────────────────────────────────── */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        mode={tripType === 'round_trip' ? 'range' : 'single'}
        value={departureDate}
        value2={returnDate}
        onSelect={(d) => setDepartureDate(d)}
        onSelect2={(d) => setReturnDate(d)}
        minDate={todayISO()}
        label={tripType === 'round_trip' ? 'تاريخ الذهاب والعودة' : 'تاريخ السفر'}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle:    { fontSize: 22, color: '#FFFFFF', textAlign: 'right', marginBottom: 14 },
  toggle:         { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 3, gap: 3 },
  toggleBtn:      { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  toggleBtnActive:{ backgroundColor: '#D4AF37' },
  toggleText:     { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  toggleTextActive:{ color: '#0A2342' },
  form:           { padding: 16, gap: 12 },
  card:           { borderRadius: 16, padding: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, gap: 12 },
  swapBtn:        { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  returnRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  returnLabel:    { fontSize: 12 },
  returnDate:     { fontSize: 13 },
  returnHint:     { fontSize: 11, textAlign: 'right', paddingTop: 4 },
  passRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passLabel:      { fontSize: 15 },
  counter:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countBtn:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  countNum:       { fontSize: 18, minWidth: 24, textAlign: 'center' },
  divider:        { height: 1 },
  cabinRow:       { flexDirection: 'row', gap: 8 },
  cabinChip:      { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  cabinText:      { fontSize: 13 },
  searchBtn:      { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  searchBtnText:  { fontSize: 16 },
  section:        { marginTop: 8 },
  sectionTitle:   { fontSize: 16, marginBottom: 10, textAlign: 'right' },
  routeChip:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8, justifyContent: 'flex-end' },
  routeText:      { flex: 1, fontSize: 14, textAlign: 'right' },
  routeCode:      { fontSize: 12 },
});
