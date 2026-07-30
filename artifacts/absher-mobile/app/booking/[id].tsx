import React from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useGetBooking, getGetBookingQueryKey } from '@workspace/api-client-react';

const STATUS_STEPS = [
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'confirmed', label: 'تم التأكيد' },
  { key: 'completed', label: 'مكتمل' }
];

const TYPE_CONFIG = {
  flight:  { icon: 'airplane' as const,       label: 'رحلة طيران', color: '#0A2342' },
  hotel:   { icon: 'bed-outline' as const,    label: 'فندق',       color: '#7C3AED' },
  program: { icon: 'globe-outline' as const,  label: 'برنامج سياحي', color: '#0891B2' },
  visa:    { icon: 'card-outline' as const,   label: 'تأشيرة',    color: '#D97706' },
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '---';
  return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BookingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20);

  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const { data: booking, isLoading, error } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) }
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: '#0A2342' }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
            حدث خطأ أثناء تحميل الحجز
          </Text>
        </View>
      </View>
    );
  }

  const typeConf = TYPE_CONFIG[booking.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.flight;
  const isCancelled = booking.status === 'cancelled';

  // Determine current step index
  let currentStepIndex = 0;
  if (booking.status === 'confirmed') currentStepIndex = 1;
  if (booking.status === 'completed') currentStepIndex = 2;

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg = `تفاصيل الحجز:\nرقم الحجز: #${booking.id}\nالنوع: ${typeConf.label}\nالعميل: ${booking.clientName}\nالحالة: ${isCancelled ? 'ملغي' : STATUS_STEPS[currentStepIndex].label}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`);
  };

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('قريباً', 'سيتم توفير إمكانية تحميل التذكرة/الإيصال قريباً.');
  };

  const handleSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: '#0A2342' }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>تفاصيل الحجز #{booking.id}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40, gap: 16 }}>
        {/* Hero Section */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: `${typeConf.color}15` }]}>
            <Ionicons name={typeConf.icon} size={36} color={typeConf.color} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
            {booking.destination || booking.clientName}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
            {typeConf.label}
          </Text>

          {isCancelled && (
            <View style={[styles.cancelledBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.cancelledText, { color: '#991B1B', fontFamily: 'Cairo_700Bold' }]}>تم الإلغاء</Text>
            </View>
          )}
        </View>

        {/* Status Timeline */}
        {!isCancelled && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>حالة الحجز</Text>
            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isLast = index === STATUS_STEPS.length - 1;
                
                return (
                  <View key={step.key} style={styles.timelineStepContainer}>
                    <View style={styles.timelineIconContainer}>
                      <View style={[
                        styles.timelineDot,
                        { 
                          backgroundColor: isActive ? '#D4AF37' : colors.muted,
                          borderColor: isActive ? '#D4AF37' : colors.border
                        }
                      ]}>
                        {isActive && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                      {!isLast && (
                        <View style={[
                          styles.timelineLine,
                          { backgroundColor: index < currentStepIndex ? '#D4AF37' : colors.muted }
                        ]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[
                        styles.timelineLabel,
                        { 
                          color: isCurrent ? colors.foreground : colors.mutedForeground,
                          fontFamily: isCurrent ? 'Cairo_700Bold' : 'Cairo_600SemiBold'
                        }
                      ]}>
                        {step.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Flight specific details */}
        {booking.type === 'flight' && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>تفاصيل الرحلة</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>SV-1042</Text>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>رقم الرحلة</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>الرياض (RUH)</Text>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>المغادرة</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>دبي (DXB)</Text>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>الوصول</Text>
            </View>
          </View>
        )}

        {/* Travel Dates */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>تواريخ السفر</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{formatDate(booking.travelDate)}</Text>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>تاريخ الذهاب</Text>
          </View>
          {booking.returnDate && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{formatDate(booking.returnDate)}</Text>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>تاريخ العودة</Text>
            </View>
          )}
        </View>

        {/* Passengers */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>المسافرون</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{booking.clientName}</Text>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>صاحب الحجز</Text>
          </View>
          {booking.adults ? (
            <View style={styles.detailRow}>
              <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{booking.adults} بالغ</Text>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>عدد المسافرين</Text>
            </View>
          ) : null}
        </View>

        {/* Price Breakdown */}
        {booking.totalPrice && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>تفاصيل الدفع</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailValue, { color: '#16A34A', fontFamily: 'Cairo_700Bold', fontSize: 18 }]}>
                {booking.totalPrice.toLocaleString('ar-SA')} {booking.type === 'flight' ? 'USD' : 'ر.س'}
              </Text>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>الإجمالي المدفوع</Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Action Buttons Fixed at Bottom */}
      <View style={[styles.bottomActions, { paddingBottom: bottomInset + 10, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.actionGrid}>
          <Pressable style={({ pressed }) => [styles.actionBtn, { backgroundColor: '#16A34A', opacity: pressed ? 0.8 : 1 }]} onPress={handleShare}>
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <Text style={[styles.actionBtnText, { fontFamily: 'Cairo_700Bold', color: '#FFFFFF' }]}>مشاركة</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.8 : 1 }]} onPress={handleDownload}>
            <Ionicons name="download-outline" size={20} color={colors.foreground} />
            <Text style={[styles.actionBtnText, { fontFamily: 'Cairo_700Bold', color: colors.foreground }]}>تحميل PDF</Text>
          </Pressable>
        </View>
        <Pressable style={({ pressed }) => [styles.supportBtn, { borderColor: '#0A2342', opacity: pressed ? 0.8 : 1 }]} onPress={handleSupport}>
          <Ionicons name="headset-outline" size={20} color="#0A2342" />
          <Text style={[styles.supportBtnText, { color: '#0A2342', fontFamily: 'Cairo_700Bold' }]}>التواصل مع الدعم</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 20 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { fontSize: 18 },
  
  heroCard: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 8 },
  heroIconWrap: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  heroTitle: { fontSize: 24, textAlign: 'center' },
  heroSubtitle: { fontSize: 16 },
  cancelledBadge: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  cancelledText: { fontSize: 14 },

  section: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 16 },
  sectionTitle: { fontSize: 16, textAlign: 'right', marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 15, flex: 1, textAlign: 'left', paddingRight: 16 },

  timeline: { gap: 0 },
  timelineStepContainer: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  timelineIconContainer: { width: 30, alignItems: 'center' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineLine: { width: 2, height: 40, marginTop: -2, zIndex: 1 },
  timelineContent: { flex: 1, paddingRight: 12, paddingBottom: 30, paddingTop: 2 },
  timelineLabel: { fontSize: 15, textAlign: 'right' },

  bottomActions: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, gap: 12 },
  actionGrid: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { fontSize: 15 },
  supportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  supportBtnText: { fontSize: 15 },
});