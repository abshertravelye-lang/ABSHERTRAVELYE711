import React from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useGetVisaApplication, getGetVisaApplicationQueryKey } from '@workspace/api-client-react';

/**
 * Storage object paths are served by the API at /api/storage/objects/*.
 * A stored issued-visa reference looks like "/objects/uploads/<uuid>" — rewrite
 * it to the absolute served URL. Absolute (http) values are returned as-is.
 */
function toIssuedVisaUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const origin = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  if (path.startsWith('/objects/')) return `${origin}/api/storage${path}`;
  if (path.startsWith('/api/')) return `${origin}${path}`;
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

const TRACKING_STEPS = [
  { key: 'submitted', label: 'تقديم الطلب' },
  { key: 'review', label: 'مراجعة المستندات' },
  { key: 'processing', label: 'قيد المعالجة' },
  { key: 'embassy', label: 'الاعتماد من السفارة' },
  { key: 'ready', label: 'جاهزة للاستلام' }
];

export default function VisaTrackingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20);

  const { id } = useLocalSearchParams<{ id: string }>();
  const visaId = Number(id);

  const { data: application, isLoading, error } = useGetVisaApplication(visaId, {
    query: { enabled: !!visaId, queryKey: getGetVisaApplicationQueryKey(visaId) }
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  if (error || !application) {
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
            حدث خطأ أثناء تحميل الطلب
          </Text>
        </View>
      </View>
    );
  }

  // Derive current step from the real application status enum.
  const status = application.status;
  const STATUS_STEP: Record<string, number> = {
    received: 0,
    under_review: 1,
    awaiting_documents: 1,
    documents_uploaded: 1,
    processing: 2,
    sent_to_embassy: 3,
    issued: 4,
    completed: 4,
    rejected: 0,
    cancelled: 0,
  };
  const currentStepIndex = STATUS_STEP[status] ?? 0;

  const isRejected = status === 'rejected' || status === 'cancelled';

  const adminNote = (application.adminNotes ?? '').trim();
  const issuedVisaUrl = (application.issuedVisaUrl ?? '').trim();
  const hasVisaFile = issuedVisaUrl.length > 0;

  const handleDownload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!hasVisaFile) {
      Alert.alert('التأشيرة غير متوفرة بعد', 'لم يتم إصدار ملف التأشيرة الخاص بك بعد. سنعلمك فور جاهزيته.');
      return;
    }
    const url = toIssuedVisaUrl(issuedVisaUrl);
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        else Alert.alert('تعذر فتح الملف', 'حدث خطأ أثناء محاولة فتح ملف التأشيرة.');
      }
    } catch {
      Alert.alert('تعذر فتح الملف', 'حدث خطأ أثناء محاولة فتح ملف التأشيرة.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: '#0A2342' }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>تتبع طلب التأشيرة</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 40, gap: 16 }}>
        
        {/* Hero Section */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
            <Ionicons name="document-text" size={36} color="#D97706" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
            تأشيرة سياحية
          </Text>
          <Text style={[styles.refNumber, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
            الرقم المرجعي: #{application.id}
          </Text>
          {isRejected && (
            <View style={[styles.rejectedBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.rejectedText, { color: '#991B1B', fontFamily: 'Cairo_700Bold' }]}>تم رفض الطلب</Text>
            </View>
          )}
        </View>

        {/* Admin note — shown prominently when the team leaves a note */}
        {adminNote.length > 0 && (
          <View style={styles.adminNoteCard}>
            <View style={styles.adminNoteHeader}>
              <View style={styles.adminNoteIconWrap}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#0A2342" />
              </View>
              <Text style={[styles.adminNoteTitle, { fontFamily: 'Cairo_700Bold' }]}>ملاحظة من الإدارة</Text>
            </View>
            <Text style={[styles.adminNoteBody, { fontFamily: 'Cairo_600SemiBold' }]}>{adminNote}</Text>
          </View>
        )}

        {/* Issued visa file — available for download */}
        {hasVisaFile && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: '#16A34A' }]}>
            <View style={styles.docRow}>
              <View style={styles.docLeft}>
                <View style={[styles.docIcon, { backgroundColor: 'rgba(22, 163, 74, 0.12)' }]}>
                  <Ionicons name="document-attach" size={20} color="#16A34A" />
                </View>
                <View>
                  <Text style={[styles.docName, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>ملف التأشيرة</Text>
                  <Text style={[styles.docHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>جاهز للتحميل</Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>حالة الطلب</Text>
          
          <View style={styles.timeline}>
            {TRACKING_STEPS.map((step, index) => {
              const isPast = index < currentStepIndex;
              const isCurrent = index === currentStepIndex && !isRejected;
              const isLast = index === TRACKING_STEPS.length - 1;
              const isActive = isPast || isCurrent;

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
                      {isPast && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      {isCurrent && <View style={styles.pulsingDot} />}
                    </View>
                    {!isLast && (
                      <View style={[
                        styles.timelineLine,
                        { backgroundColor: isPast ? '#D4AF37' : colors.muted }
                      ]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineLabel,
                      { 
                        color: isCurrent ? '#D4AF37' : (isActive ? colors.foreground : colors.mutedForeground),
                        fontFamily: isCurrent ? 'Cairo_700Bold' : 'Cairo_600SemiBold'
                      }
                    ]}>
                      {step.label}
                    </Text>
                    {isActive && index === 0 && application.createdAt && (
                      <Text style={[styles.timelineDate, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                        {new Date(application.createdAt).toLocaleDateString('ar-SA')}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Supporting Documents */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>المستندات المرفقة</Text>
          <View style={styles.docRow}>
            <View style={styles.docLeft}>
              <View style={[styles.docIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name="image-outline" size={20} color={colors.foreground} />
              </View>
              <Text style={[styles.docName, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>جواز السفر</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
          </View>
          <View style={styles.docRow}>
            <View style={styles.docLeft}>
              <View style={[styles.docIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name="image-outline" size={20} color={colors.foreground} />
              </View>
              <Text style={[styles.docName, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>الصورة الشخصية</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
          </View>
        </View>

      </ScrollView>

      {/* Action Footer */}
      <View style={[styles.footer, { paddingBottom: bottomInset + 10, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.downloadBtn, 
            { backgroundColor: hasVisaFile ? '#0A2342' : colors.muted, opacity: pressed ? 0.8 : 1 }
          ]} 
          onPress={handleDownload}
          disabled={!hasVisaFile}
        >
          <Ionicons name="download-outline" size={20} color={hasVisaFile ? '#FFFFFF' : colors.mutedForeground} />
          <Text style={[
            styles.downloadBtnText, 
            { color: hasVisaFile ? '#FFFFFF' : colors.mutedForeground, fontFamily: 'Cairo_700Bold' }
          ]}>
            {hasVisaFile ? 'تحميل التأشيرة' : 'التأشيرة غير متوفرة بعد'}
          </Text>
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
  heroTitle: { fontSize: 22, textAlign: 'center' },
  refNumber: { fontSize: 14, writingDirection: 'ltr' },
  rejectedBadge: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  rejectedText: { fontSize: 14 },

  section: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 16 },
  sectionTitle: { fontSize: 16, textAlign: 'right', marginBottom: 8 },

  adminNoteCard: {
    padding: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)',
    backgroundColor: 'rgba(212, 175, 55, 0.10)', gap: 10,
  },
  adminNoteHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  adminNoteIconWrap: {
    width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
  },
  adminNoteTitle: { fontSize: 15, color: '#0A2342', textAlign: 'right' },
  adminNoteBody: { fontSize: 14, color: '#3F3F46', textAlign: 'right', lineHeight: 24 },
  docHint: { fontSize: 12, textAlign: 'right', marginTop: 2 },
  
  timeline: { gap: 0 },
  timelineStepContainer: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  timelineIconContainer: { width: 30, alignItems: 'center' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  pulsingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  timelineLine: { width: 2, height: 44, marginTop: -2, zIndex: 1 },
  timelineContent: { flex: 1, paddingRight: 12, paddingBottom: 30 },
  timelineLabel: { fontSize: 15, textAlign: 'right' },
  timelineDate: { fontSize: 12, textAlign: 'right', marginTop: 2 },

  docRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  docLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  docIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 15 },

  footer: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  downloadBtnText: { fontSize: 16 },
});