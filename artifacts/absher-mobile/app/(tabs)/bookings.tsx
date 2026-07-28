/**
 * bookings.tsx — شاشة حجوزاتي
 * عرض جميع حجوزات المستخدم مع تفاصيل وخيارات
 */
import React, { useState } from 'react';
import {
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useListMyBookings } from '@workspace/api-client-react';
import type { Booking } from '@workspace/api-client-react';
import { EmptyState } from '@/components/EmptyState';

// ── Status badge config ───────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'قيد الانتظار', bg: '#FEF9C3', text: '#854D0E', icon: 'time-outline' as const },
  confirmed: { label: 'مؤكد',         bg: '#DCFCE7', text: '#166534', icon: 'checkmark-circle-outline' as const },
  cancelled: { label: 'ملغي',         bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' as const },
};

const TYPE_CONFIG = {
  flight:  { icon: 'airplane' as const,       label: 'رحلة طيران', color: '#0A2342' },
  hotel:   { icon: 'bed-outline' as const,    label: 'فندق',       color: '#7C3AED' },
  program: { icon: 'globe-outline' as const,  label: 'برنامج سياحي', color: '#0891B2' },
  visa:    { icon: 'card-outline' as const,   label: 'تأشيرة',    color: '#D97706' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── BookingCard ───────────────────────────────────────────────────────────────
function BookingCard({ booking }: { booking: Booking }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const typeConf = TYPE_CONFIG[booking.type] || TYPE_CONFIG.flight;

  const shareWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg = `حجزي: ${typeConf.label}\nرقم الحجز: #${booking.id}\nالعميل: ${booking.clientName}\nالوجهة: ${booking.destination || '---'}\nتاريخ السفر: ${booking.travelDate ? formatDate(booking.travelDate) : '---'}\nالحالة: ${status.label}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={[bc.card, { backgroundColor: colors.card, borderLeftColor: typeConf.color, shadowColor: '#0A2342' }]}>
      {/* Header row */}
      <View style={bc.headerRow}>
        <View style={bc.leftGroup}>
          {/* Status badge */}
          <View style={[bc.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={13} color={status.text} />
            <Text style={[bc.statusText, { color: status.text, fontFamily: 'Cairo_600SemiBold' }]}>{status.label}</Text>
          </View>
          <Text style={[bc.bookingId, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>#{booking.id}</Text>
        </View>

        {/* Type icon + label */}
        <View style={bc.typeGroup}>
          <Text style={[bc.typeLabel, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{typeConf.label}</Text>
          <View style={[bc.typeIcon, { backgroundColor: `${typeConf.color}18` }]}>
            <Ionicons name={typeConf.icon} size={20} color={typeConf.color} />
          </View>
        </View>
      </View>

      {/* Route / destination */}
      <View style={bc.routeRow}>
        <Text style={[bc.routeText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
          {booking.destination || booking.clientName}
        </Text>
        {booking.travelDate && (
          <Text style={[bc.dateText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            {formatDate(booking.travelDate)}
          </Text>
        )}
      </View>

      {/* Passengers */}
      {(booking.adults ?? 0) > 0 && (
        <View style={bc.passBadge}>
          <Ionicons name="people-outline" size={14} color={colors.mutedForeground} />
          <Text style={[bc.passText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            {booking.adults} {(booking.adults ?? 0) === 1 ? 'مسافر' : 'مسافرون'}
          </Text>
        </View>
      )}

      {/* Price */}
      {booking.totalPrice && (
        <Text style={[bc.price, { color: '#0A2342', fontFamily: 'Cairo_700Bold' }]}>
          {booking.totalPrice.toLocaleString('ar-SA')} {booking.type === 'flight' ? 'USD' : 'ر.س'}
        </Text>
      )}

      {/* Expanded details */}
      {expanded && (
        <View style={[bc.expandedWrap, { borderTopColor: colors.border }]}>
          {booking.clientPhone && (
            <View style={bc.detailRow}>
              <Text style={[bc.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{booking.clientPhone}</Text>
              <Text style={[bc.detailKey, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>الجوال</Text>
            </View>
          )}
          {booking.clientEmail && (
            <View style={bc.detailRow}>
              <Text style={[bc.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{booking.clientEmail}</Text>
              <Text style={[bc.detailKey, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>البريد</Text>
            </View>
          )}
          {booking.returnDate && (
            <View style={bc.detailRow}>
              <Text style={[bc.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{formatDate(booking.returnDate)}</Text>
              <Text style={[bc.detailKey, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>تاريخ العودة</Text>
            </View>
          )}
          {booking.notes && (
            <View style={[bc.notesWrap, { backgroundColor: colors.muted }]}>
              <Text style={[bc.notesText, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}>{booking.notes}</Text>
            </View>
          )}
          <Text style={[bc.createdAt, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            تاريخ الحجز: {formatDate(booking.createdAt)}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={[bc.actions, { borderTopColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [bc.actionBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
          onPress={shareWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
          <Text style={[bc.actionText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>مشاركة</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [bc.actionBtn, { backgroundColor: expanded ? '#0A234215' : colors.muted, opacity: pressed ? 0.7 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded(!expanded); }}
        >
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#0A2342" />
          <Text style={[bc.actionText, { color: '#0A2342', fontFamily: 'Cairo_600SemiBold' }]}>تفاصيل</Text>
        </Pressable>
      </View>
    </View>
  );
}

const bc = StyleSheet.create({
  card: { borderRadius: 16, borderLeftWidth: 4, padding: 16, marginBottom: 12, gap: 10, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leftGroup: { gap: 4, alignItems: 'flex-start' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12 },
  bookingId: { fontSize: 11 },
  typeGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeLabel: { fontSize: 15 },
  typeIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  routeRow: { gap: 2 },
  routeText: { fontSize: 16, textAlign: 'right' },
  dateText: { fontSize: 12, textAlign: 'right' },
  passBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  passText: { fontSize: 12 },
  price: { fontSize: 20, textAlign: 'right' },
  expandedWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailKey: { fontSize: 13 },
  detailValue: { fontSize: 13, flex: 1, textAlign: 'right', paddingLeft: 8 },
  notesWrap: { borderRadius: 8, padding: 10 },
  notesText: { fontSize: 13, textAlign: 'right', lineHeight: 20 },
  createdAt: { fontSize: 11, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10 },
  actionText: { fontSize: 13 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  const { data, isLoading, error, refetch, isRefetching } = useListMyBookings();

  const bookings: Booking[] = Array.isArray(data) ? data : [];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topInset + 12, backgroundColor: '#0A2342' }]}>
        <View style={s.headerRow}>
          <View style={{ width: 22 }} />
          <Text style={[s.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>حجوزاتي</Text>
          <Pressable onPress={() => router.push('/flight-results' as any)} style={{ opacity: 0 }}>
            <View style={{ width: 22 }} />
          </Pressable>
        </View>
        {bookings.length > 0 && (
          <Text style={[s.subTitle, { fontFamily: 'Cairo_400Regular' }]}>
            {bookings.length} {bookings.length === 1 ? 'حجز' : 'حجوزات'}
          </Text>
        )}
      </View>

      {error ? (
        <EmptyState
          icon="calendar-outline"
          title="خطأ في تحميل الحجوزات"
          description="تعذر تحميل حجوزاتك، حاول مرة أخرى"
          actionLabel="إعادة المحاولة"
          onAction={() => refetch()}
        />
      ) : isLoading ? (
        <EmptyState loading title="جاري تحميل حجوزاتك..." />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="لا توجد حجوزات"
          description="لم تقم بأي حجز حتى الآن. ابدأ بالبحث عن رحلات أو تأشيرات"
          actionLabel="البحث عن رحلات"
          onAction={() => router.push('/(tabs)/flights')}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => String(b.id)}
          renderItem={({ item }) => <BookingCard booking={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 90 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor="#D4AF37"
              colors={['#D4AF37']}
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 20 },
  subTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginTop: 4 },
});
