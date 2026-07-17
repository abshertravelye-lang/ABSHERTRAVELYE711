import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

const CABIN_CLASSES = [
  { value: 'economy', label: 'اقتصادية' },
  { value: 'premium_economy', label: 'اقتصادية مميزة' },
  { value: 'business', label: 'رجال الأعمال' },
  { value: 'first', label: 'درجة أولى' },
];

const POPULAR_ROUTES = [
  { from: 'RUH', fromCity: 'الرياض', to: 'DXB', toCity: 'دبي' },
  { from: 'JED', fromCity: 'جدة', to: 'CAI', toCity: 'القاهرة' },
  { from: 'RUH', fromCity: 'الرياض', to: 'IST', toCity: 'إسطنبول' },
  { from: 'RUH', fromCity: 'الرياض', to: 'LHR', toCity: 'لندن' },
];

export default function FlightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  const [tripType, setTripType] = useState<'one_way' | 'round_trip'>('one_way');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [cabin, setCabin] = useState('economy');

  const swap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOrigin(destination);
    setDestination(origin);
  };

  const search = () => {
    if (!origin || !destination || !departureDate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const params = JSON.stringify({ origin, destination, departureDate, returnDate: tripType === 'round_trip' ? returnDate : undefined, tripType, adults, cabinClass: cabin });
    router.push({ pathname: '/flight-results', params: { q: params } });
  };

  const InputBox = ({ value, onChange, placeholder, icon }: { value: string; onChange: (v: string) => void; placeholder: string; icon: keyof typeof Ionicons.glyphMap }) => (
    <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.inputText, { color: colors.foreground, fontFamily: 'Cairo_400Regular', textAlign: 'right' }]}
        autoCapitalize="characters"
        maxLength={3}
      />
      <Ionicons name={icon} size={20} color={colors.mutedForeground} />
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: bottomInset + 90 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: '#0A2342' }]}>
        <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>البحث عن رحلات</Text>
        {/* Trip type */}
        <View style={styles.toggle}>
          {(['one_way', 'round_trip'] as const).map((t) => (
            <Pressable
              key={t}
              style={[styles.toggleBtn, tripType === t && styles.toggleBtnActive]}
              onPress={() => setTripType(t)}
            >
              <Text style={[styles.toggleText, { fontFamily: 'Cairo_600SemiBold' }, tripType === t && styles.toggleTextActive]}>
                {t === 'one_way' ? 'ذهاب فقط' : 'ذهاب وعودة'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.form}>
        {/* From / To */}
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
          <InputBox value={origin} onChange={setOrigin} placeholder="من (RUH)" icon="airplane-outline" />
          <Pressable style={[styles.swapBtn, { backgroundColor: '#0A2342' }]} onPress={swap}>
            <Ionicons name="swap-vertical" size={18} color="#FFFFFF" />
          </Pressable>
          <InputBox value={destination} onChange={setDestination} placeholder="إلى (DXB)" icon="location-outline" />
        </View>

        {/* Dates */}
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
          <View style={styles.dateRow}>
            <TextInput
              value={departureDate}
              onChangeText={setDepartureDate}
              placeholder="تاريخ الذهاب (YYYY-MM-DD)"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.dateInput, { color: colors.foreground, borderColor: colors.border, fontFamily: 'Cairo_400Regular', textAlign: 'right' }]}
            />
            <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
          </View>
          {tripType === 'round_trip' && (
            <View style={[styles.dateRow, { marginTop: 12 }]}>
              <TextInput
                value={returnDate}
                onChangeText={setReturnDate}
                placeholder="تاريخ العودة (YYYY-MM-DD)"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.dateInput, { color: colors.foreground, borderColor: colors.border, fontFamily: 'Cairo_400Regular', textAlign: 'right' }]}
              />
              <Ionicons name="calendar-outline" size={20} color={colors.mutedForeground} />
            </View>
          )}
        </View>

        {/* Passengers + Cabin */}
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
          <View style={styles.passRow}>
            <View style={styles.counter}>
              <Pressable style={[styles.countBtn, { backgroundColor: colors.muted }]} onPress={() => setAdults(Math.max(1, adults - 1))}>
                <Ionicons name="remove" size={18} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.countNum, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{adults}</Text>
              <Pressable style={[styles.countBtn, { backgroundColor: '#0A2342' }]} onPress={() => setAdults(Math.min(9, adults + 1))}>
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

        {/* Search Button */}
        <Pressable
          style={({ pressed }) => [styles.searchBtn, { opacity: pressed ? 0.9 : 1, backgroundColor: (!origin || !destination || !departureDate) ? colors.mutedForeground : '#0A2342' }]}
          onPress={search}
          disabled={!origin || !destination || !departureDate}
        >
          <Ionicons name="search" size={20} color="#FFFFFF" />
          <Text style={[styles.searchBtnText, { fontFamily: 'Cairo_700Bold' }]}>بحث عن رحلات</Text>
        </Pressable>

        {/* Popular Routes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>مسارات شائعة</Text>
          {POPULAR_ROUTES.map((r, i) => (
            <Pressable
              key={i}
              style={[styles.routeChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { setOrigin(r.from); setDestination(r.to); }}
            >
              <Ionicons name="airplane" size={15} color="#0A2342" />
              <Text style={[styles.routeText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
                {r.fromCity} ← {r.toCity}
              </Text>
              <Text style={[styles.routeCode, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                {r.from} - {r.to}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 22, color: '#FFFFFF', textAlign: 'right', marginBottom: 14 },
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 3, gap: 3 },
  toggleBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#D4AF37' },
  toggleText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  toggleTextActive: { color: '#0A2342' },
  form: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  inputText: { flex: 1, fontSize: 16 },
  swapBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateInput: { flex: 1, fontSize: 14, borderBottomWidth: 1, paddingBottom: 8 },
  passRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passLabel: { fontSize: 15 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  countNum: { fontSize: 18, minWidth: 24, textAlign: 'center' },
  divider: { height: 1, marginVertical: 12 },
  cabinRow: { flexDirection: 'row', gap: 8 },
  cabinChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  cabinText: { fontSize: 13 },
  searchBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  searchBtnText: { color: '#FFFFFF', fontSize: 16 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, marginBottom: 10, textAlign: 'right' },
  routeChip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8, justifyContent: 'flex-end' },
  routeText: { flex: 1, fontSize: 14, textAlign: 'right' },
  routeCode: { fontSize: 12 },
});
