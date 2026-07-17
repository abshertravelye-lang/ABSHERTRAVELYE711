import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Visa } from '@workspace/api-client-react';

const CATEGORY_LABELS: Record<string, string> = {
  tourist: 'سياحية',
  business: 'تجارية',
  medical: 'طبية',
  visit: 'زيارة',
  study: 'دراسية',
  umrah: 'عمرة',
};

const STATUS_COLORS: Record<string, string> = {
  available: '#16A34A',
  suspended: '#EAB308',
  closed: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'متاحة',
  suspended: 'موقوفة',
  closed: 'مغلقة',
};

type Props = { visa: Visa; onPress?: () => void };

export function VisaCard({ visa, onPress }: Props) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[visa.status] || colors.mutedForeground;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={styles.left}>
        <View style={[styles.flag, { backgroundColor: colors.muted }]}>
          <Text style={styles.flagText}>{visa.countryCode || '🌍'}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.status, { color: statusColor, fontFamily: 'Cairo_600SemiBold' }]}>
            {STATUS_LABELS[visa.status] || visa.status}
          </Text>
        </View>
        <Text style={[styles.country, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
          {visa.countryAr}
        </Text>
        <Text style={[styles.type, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
          {CATEGORY_LABELS[visa.category || ''] || visa.visaType}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.fee, { color: '#0A2342', fontFamily: 'Cairo_700Bold' }]}>
          {visa.fee} {visa.currency}
        </Text>
        <View style={styles.days}>
          <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.daysText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            {visa.processingDays} أيام
          </Text>
        </View>
        <Ionicons name="chevron-back" size={18} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  left: {},
  flag: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  flagText: { fontSize: 20 },
  body: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  status: { fontSize: 11 },
  country: { fontSize: 15, textAlign: 'right' },
  type: { fontSize: 12, textAlign: 'right' },
  right: { alignItems: 'flex-end', gap: 4 },
  fee: { fontSize: 14 },
  days: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  daysText: { fontSize: 11 },
});
