import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      <LinearGradient colors={['#071525', '#0A2342', '#1E3A5F']} style={[styles.header, { paddingTop: topInset + 16 }]}>
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
      </LinearGradient>

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
          <Pressable style={[styles.swapBtn, { backgroundColor: '#38BDF8' }]} onPress={swap}>
            <Ionicons name="swap-vertical" size={20} color="#FFFFFF" />
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
              <Ionicons name="arrow-back" size={15} color="#D4AF37" />
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
                <Ionicons name="remove" size={20} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.countNum, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{adults}</Text>
              <Pressable
                style={[styles.countBtn, { backgroundColor: '#D4AF37' }]}
                onPress={() => setAdults(Math.min(9, adults + 1))}
              >
                <Ionicons name="add" size={20} color="#0A2342" />
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
                  style={[
                    styles.cabinChip,
                    {
                      backgroundColor: cabin === c.value ? '#D4AF37' : colors.muted,
                      borderColor: cabin === c.value ? '#D4AF37' : colors.border,
                    }
                  ]}
                  onPress={() => setCabin(c.value)}
                >
                  <Text style={[styles.cabinText, { color: cabin === c.value ? '#0A2342' : colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
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
            {
              opacity: pressed ? 0.9 : 1,
              backgroundColor: canSearch ? '#D4AF37' : colors.muted,
              shadowColor: canSearch ? '#D4AF37' : 'transparent',
            },
          ]}
          onPress={search}
          disabled={!canSearch}
        >
          <Ionicons name="search" size={22} color={canSearch ? '#0A2342' : colors.mutedForeground} />
          <Text style={[styles.searchBtnText, { color: canSearch ? '#0A2342' : colors.mutedForeground, fontFamily: 'Cairo_700Bold' }]}>
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
              <View style={styles.routeIcon}>
                <Ionicons name="airplane" size={16} color="#38BDF8" />
              </View>
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
  header:         { paddingHorizontal: 20, paddingBottom: 22 },
  headerTitle:    { fontSize: 24, color: '#D4AF37', textAlign: 'right', marginBottom: 16 },
  toggle:         { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 4, gap: 4 },
  toggleBtn:      { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  toggleBtnActive:{ backgroundColor: '#D4AF37' },
  toggleText:     { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  toggleTextActive:{ color: '#0A2342' },
  form:           { padding: 16, gap: 14 },
  card:           { borderRadius: 18, padding: 18, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, gap: 14 },
  swapBtn:        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', shadowColor: '#38BDF8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  returnRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  returnLabel:    { fontSize: 13 },
  returnDate:     { fontSize: 14 },
  returnHint:     { fontSize: 12, textAlign: 'right', paddingTop: 4 },
  passRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passLabel:      { fontSize: 16 },
  counter:        { flexDirection: 'row', alignItems: 'center', gap: 14 },
  countBtn:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  countNum:       { fontSize: 20, minWidth: 28, textAlign: 'center' },
  divider:        { height: 1 },
  cabinRow:       { flexDirection: 'row', gap: 10 },
  cabinChip:      { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  cabinText:      { fontSize: 14 },
  searchBtn:      { borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 12, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  searchBtnText:  { fontSize: 17 },
  section:        { marginTop: 10 },
  sectionTitle:   { fontSize: 17, marginBottom: 12, textAlign: 'right' },
  routeChip:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10, justifyContent: 'flex-end' },
  routeIcon:      { width: 34, height: 34, borderRadius: 10, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  routeText:      { flex: 1, fontSize: 15, textAlign: 'right' },
  routeCode:      { fontSize: 13 },
});
