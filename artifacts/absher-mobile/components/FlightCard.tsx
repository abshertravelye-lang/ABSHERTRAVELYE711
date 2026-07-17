import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { FlightOffer } from '@workspace/api-client-react';

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}س ${m}د`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

type Props = { offer: FlightOffer; onPress?: () => void };

export function FlightCard({ offer, onPress }: Props) {
  const colors = useColors();
  const firstSeg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
      ]}
      onPress={onPress}
    >
      {/* Airline */}
      <View style={styles.header}>
        <Text style={[styles.airline, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
          {firstSeg?.airlineName}
        </Text>
        {offer.stops === 0 ? (
          <View style={[styles.stopBadge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.stopText, { color: '#16A34A', fontFamily: 'Cairo_600SemiBold' }]}>مباشر</Text>
          </View>
        ) : (
          <View style={[styles.stopBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.stopText, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
              {offer.stops} توقف
            </Text>
          </View>
        )}
      </View>

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.airport}>
          <Text style={[styles.time, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
            {firstSeg ? formatTime(firstSeg.departureAt) : '--'}
          </Text>
          <Text style={[styles.iata, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
            {firstSeg?.originIata}
          </Text>
        </View>

        <View style={styles.middle}>
          <Text style={[styles.duration, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            {formatDuration(offer.totalDurationMin)}
          </Text>
          <View style={styles.line}>
            <View style={[styles.dot, { backgroundColor: '#0A2342' }]} />
            <View style={[styles.track, { backgroundColor: colors.border }]} />
            <Ionicons name="airplane" size={16} color="#0A2342" />
          </View>
        </View>

        <View style={styles.airport}>
          <Text style={[styles.time, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
            {lastSeg ? formatTime(lastSeg.arrivalAt) : '--'}
          </Text>
          <Text style={[styles.iata, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
            {lastSeg?.destinationIata}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.badges}>
          {offer.baggageIncludedKg > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Ionicons name="bag-handle-outline" size={12} color={colors.mutedForeground} />
              <Text style={[styles.badgeText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                {offer.baggageIncludedKg} كغ
              </Text>
            </View>
          )}
          {offer.isRefundable && (
            <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.badgeText, { color: '#16A34A', fontFamily: 'Cairo_400Regular' }]}>قابل للاسترداد</Text>
            </View>
          )}
        </View>
        <Text style={[styles.price, { color: '#0A2342', fontFamily: 'Cairo_700Bold' }]}>
          {offer.totalPrice.toLocaleString('ar-SA')} {offer.currency}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  airline: { fontSize: 13 },
  stopBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  stopText: { fontSize: 12 },
  route: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  airport: { alignItems: 'center', gap: 4 },
  time: { fontSize: 22 },
  iata: { fontSize: 13 },
  middle: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  duration: { fontSize: 12 },
  line: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  track: { flex: 1, height: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11 },
  price: { fontSize: 18 },
});
