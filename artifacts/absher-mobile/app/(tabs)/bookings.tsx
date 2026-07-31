/**
 * bookings.tsx — شاشة حجوزاتي — ABSHER TRAVEL Premium
 * عرض جميع حجوزات المستخدم مع تصميم فاخر يتماشى مع هوية العلامة
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
import { LinearGradient } from 'expo-linear-gradient';
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
  flight:  { icon: 'airplane' as const,       label: 'رحلة طيران', color: '#38BDF8' },
  hotel:   { icon: 'bed-outline' as const,    label: 'فندق',       color: '#7C3AED' },
  program: { icon: 'globe-outline' as const,  label: 'برنامج سياحي', color: '#0891B2' },
  visa:    { icon: 'card-outline' as const,   label: 'تأشيرة',    color: '#D4AF37' },
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
    const msg = `حجزي مع أبشر ترافل:\n${typeConf.label}\nرقم الحجز: #${booking.id}\nالعميل: ${booking.clientName}\nالوجهة: ${booking.destination || '---'}\nتاريخ السفر: ${booking.travelDate ? formatDate(booking.travelDate) : '---'}\nالحالة: ${status.label}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={[bc.card, { backgroundColor: colors.card, borderLeftColor: typeConf.color, shadowColor: '#0A2342' }]}>
      {/* Header row */}
      <View style={bc.headerRow}>
        <View style={bc.leftGroup}>
          {/* Status badge */}
          <View style={[bc.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.text} />
            <Text style={[bc.statusText, { color: status.text, fontFamily: 'Cairo_600SemiBold' }]}>{status.label}</Text>
          </View>
          <Text style={[bc.bookingId, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>#{booking.id}</Text>
        </View>

        {/* Type icon + label */}
        <View style={bc.typeGroup}>
          <Text style={[bc.typeLabel, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{typeConf.label}</Text>
          <View style={[bc.typeIcon, { backgroundColor: `${typeConf.color}18` }]}>
            <Ionicons name={typeConf.icon} size={22} color={typeConf.color} />
          </View>
        </View>
      </View>

      {/* Route / destination */}
      <View style={bc.routeRow}>
        <Text style={[bc.routeText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
          {booking.destination || booking.clientName}
        </Text>
        {booking.travelDate && (
          <View style={bc.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#D4AF37" />
            <Text style={[bc.dateText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
              {formatDate(booking.travelDate)}
            </Text>
          </View>
        )}
      </View>

      {/* Passengers */}
      {(booking.adults ?? 0) > 0 && (
        <View style={bc.passBadge}>
          <Ionicons name="people-outline" size={15} color="#38BDF8" />
          <Text style={[bc.passText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            {booking.adults} {(booking.adults ?? 0) === 1 ? 'مسافر' : 'مسافرون'}
          </Text>
        </View>
      )}

      {/* Price */}
      {booking.totalPrice && (
        <Text style={[bc.price, { color: '#D4AF37', fontFamily: 'Cairo_700Bold' }]}>
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
          <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
          <Text style={[bc.actionText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>مشاركة</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [bc.actionBtn, { backgroundColor: expanded ? '#D4AF3720' : colors.muted, opacity: pressed ? 0.7 : 1 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded(!expanded); }}
        >
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#D4AF37" />
          <Text style={[bc.actionText, { color: '#D4AF37', fontFamily: 'Cairo_600SemiBold' }]}>تفاصيل</Text>
        </Pressable>
      </View>
    </View>
  );
}

const bc = StyleSheet.create({
  card: { borderRadius: 18, borderLeftWidth: 5, padding: 18, marginBottom: 14, gap: 12, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 10, elevation: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leftGroup: { gap: 5, alignItems: 'flex-start' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 13 },
  bookingId: { fontSize: 12 },
  typeGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeLabel: { fontSize: 16 },
  typeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  routeRow: { gap: 4 },
  routeText: { fontSize: 17, textAlign: 'right' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, textAlign: 'right' },
  passBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  passText: { fontSize: 13 },
  price: { fontSize: 22, textAlign: 'right' },
  expandedWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailKey: { fontSize: 14 },
  detailValue: { fontSize: 14, flex: 1, textAlign: 'right', paddingLeft: 10 },
  notesWrap: { borderRadius: 10, padding: 12 },
  notesText: { fontSize: 14, textAlign: 'right', lineHeight: 22 },
  createdAt: { fontSize: 12, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 11 },
  actionText: { fontSize: 14 },
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
      <LinearGradient colors={['#071525', '#0A2342', '#1E3A5F']} style={[s.header, { paddingTop: topInset + 14 }]}>
        <View style={s.headerRow}>
          <View style={{ width: 24 }} />
          <Text style={[s.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>حجوزاتي</Text>
          <Pressable onPress={() => router.push('/flight-results' as any)} style={{ opacity: 0 }}>
            <View style={{ width: 24 }} />
          </Pressable>
        </View>
        {bookings.length > 0 && (
          <Text style={[s.subTitle, { fontFamily: 'Cairo_400Regular' }]}>
            {bookings.length} {bookings.length === 1 ? 'حجز' : 'حجوزات'}
          </Text>
        )}
      </LinearGradient>

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
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#D4AF37', fontSize: 22 },
  subTitle: { color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center', marginTop: 6 },
});
