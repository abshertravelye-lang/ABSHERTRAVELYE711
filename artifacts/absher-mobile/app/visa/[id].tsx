import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useGetVisa, useCreateVisaApplication } from '@workspace/api-client-react';

const STATUS_LABELS: Record<string, string> = { available: 'متاحة', suspended: 'موقوفة', closed: 'مغلقة' };
const STATUS_COLORS: Record<string, string> = { available: '#16A34A', suspended: '#EAB308', closed: '#EF4444' };

export default function VisaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: visa, isLoading } = useGetVisa(Number(id));
  const createApp = useCreateVisaApplication();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', nationality: '', passportNumber: '', passportIssueDate: '', passportExpiryDate: '', dateOfBirth: '', gender: 'male' as 'male' | 'female', email: '', phone: '', agreedToTerms: false });

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.fullName || !form.nationality || !form.passportNumber || !form.email || !form.phone || !form.agreedToTerms) {
      Alert.alert('بيانات ناقصة', 'يرجى تعبئة جميع الحقول المطلوبة والموافقة على الشروط');
      return;
    }
    createApp.mutate(
      {
        data: {
          visaId: Number(id),
          eligibilityPath: 'direct',
          fullName: form.fullName,
          nationality: form.nationality,
          passportNumber: form.passportNumber,
          passportIssueDate: form.passportIssueDate || '2020-01-01',
          passportExpiryDate: form.passportExpiryDate || '2030-01-01',
          dateOfBirth: form.dateOfBirth || '1990-01-01',
          gender: form.gender,
          email: form.email,
          phone: form.phone,
          agreedToTerms: true,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowForm(false);
          Alert.alert('تم تقديم الطلب', 'سيتم مراجعة طلبك والتواصل معك قريباً.');
        },
        onError: (err: any) => Alert.alert('خطأ', err?.message || 'تعذر تقديم الطلب'),
      }
    );
  };

  if (isLoading) return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (!visa) return <View style={[styles.loading, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }}>لم يتم العثور على التأشيرة</Text></View>;

  const statusColor = STATUS_COLORS[visa.status] || '#64748B';

  const InfoRow = ({ label, value }: { label: string; value: string | number | null | undefined }) =>
    value ? (
      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.infoVal, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{String(value)}</Text>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{label}</Text>
      </View>
    ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: '#0A2342' }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.flagArea}>
            <View style={[styles.flag, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={styles.flagText}>{visa.countryCode || '🌍'}</Text>
            </View>
            <Text style={[styles.country, { fontFamily: 'Cairo_700Bold' }]}>{visa.countryAr}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor, fontFamily: 'Cairo_600SemiBold' }]}>{STATUS_LABELS[visa.status]}</Text>
            </View>
          </View>
        </View>

        {/* Price Card */}
        <View style={[styles.priceCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>رسوم التأشيرة</Text>
            <Text style={[styles.price, { color: '#0A2342', fontFamily: 'Cairo_700Bold' }]}>{visa.fee} {visa.currency}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>مدة المعالجة</Text>
            <Text style={[styles.priceVal, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{visa.processingDays} أيام عمل</Text>
          </View>
          {visa.stayDuration && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>مدة الإقامة</Text>
                <Text style={[styles.priceVal, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{visa.stayDuration} يوم</Text>
              </View>
            </>
          )}
        </View>

        {/* Details */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>تفاصيل التأشيرة</Text>
          <InfoRow label="نوع التأشيرة" value={visa.visaType} />
          <InfoRow label="نوع الدخول" value={visa.entryType === 'single' ? 'دخول واحد' : visa.entryType === 'multiple' ? 'دخول متعدد' : 'عبور'} />
          <InfoRow label="الصلاحية" value={visa.validityDays ? `${visa.validityDays} يوم` : null} />
        </View>

        {/* Requirements */}
        {visa.descriptionAr && (
          <View style={[styles.detailCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>متطلبات التأشيرة</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{visa.descriptionAr}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Apply Button */}
      {visa.status === 'available' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [styles.applyBtn, { backgroundColor: '#0A2342', opacity: pressed ? 0.9 : 1 }]}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.applyBtnText, { fontFamily: 'Cairo_700Bold' }]}>تقديم طلب تأشيرة</Text>
          </Pressable>
        </View>
      )}

      {/* Application Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Pressable onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>طلب تأشيرة {visa.countryAr}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.formContent}>
            {([
              { key: 'fullName', label: 'الاسم الكامل', placeholder: 'محمد أحمد السعيد' },
              { key: 'nationality', label: 'الجنسية', placeholder: 'سعودي' },
              { key: 'passportNumber', label: 'رقم الجواز', placeholder: 'A1234567' },
              { key: 'passportIssueDate', label: 'تاريخ الإصدار', placeholder: '2020-01-01' },
              { key: 'passportExpiryDate', label: 'تاريخ الانتهاء', placeholder: '2030-01-01' },
              { key: 'dateOfBirth', label: 'تاريخ الميلاد', placeholder: '1990-01-01' },
              { key: 'email', label: 'البريد الإلكتروني', placeholder: 'example@email.com' },
              { key: 'phone', label: 'رقم الهاتف', placeholder: '0500000000' },
            ] as { key: keyof typeof form; label: string; placeholder: string }[]).map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{f.label}</Text>
                <TextInput
                  value={String(form[f.key])}
                  onChangeText={(v) => set(f.key, v)}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
                />
              </View>
            ))}

            {/* Gender */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>الجنس</Text>
              <View style={styles.genderRow}>
                {(['male', 'female'] as const).map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.genderBtn, { backgroundColor: form.gender === g ? '#0A2342' : colors.muted, borderColor: colors.border }]}
                    onPress={() => set('gender', g)}
                  >
                    <Text style={[styles.genderText, { color: form.gender === g ? '#FFFFFF' : colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
                      {g === 'male' ? 'ذكر' : 'أنثى'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Terms */}
            <Pressable style={styles.termsRow} onPress={() => set('agreedToTerms', !form.agreedToTerms)}>
              <Text style={[styles.termsText, { color: colors.foreground, fontFamily: 'Cairo_400Regular', flex: 1, textAlign: 'right' }]}>
                أوافق على الشروط والأحكام وسياسة الخصوصية
              </Text>
              <Ionicons name={form.agreedToTerms ? 'checkbox' : 'square-outline'} size={22} color={form.agreedToTerms ? '#0A2342' : colors.mutedForeground} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.submitBtn, { backgroundColor: '#0A2342', opacity: pressed ? 0.9 : 1 }]}
              onPress={submit}
              disabled={createApp.isPending}
            >
              {createApp.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={[styles.submitBtnText, { fontFamily: 'Cairo_700Bold' }]}>تقديم الطلب</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 16 },
  flagArea: { alignItems: 'center', gap: 10 },
  flag: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  flagText: { fontSize: 40 },
  country: { fontSize: 24, color: '#FFFFFF' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13 },
  priceCard: { margin: 16, borderRadius: 16, padding: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  priceLabel: { fontSize: 14 },
  price: { fontSize: 22 },
  priceVal: { fontSize: 15 },
  divider: { height: 1 },
  detailCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, marginBottom: 12, textAlign: 'right' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13 },
  infoVal: { fontSize: 14 },
  desc: { fontSize: 14, lineHeight: 24, textAlign: 'right' },
  footer: { padding: 16, borderTopWidth: 1 },
  applyBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  applyBtnText: { color: '#FFFFFF', fontSize: 16 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16 },
  formContent: { padding: 16, gap: 16, paddingBottom: 40 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14, textAlign: 'right' },
  fieldInput: { borderRadius: 10, borderWidth: 1, padding: 13, fontSize: 14, textAlign: 'right' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  genderText: { fontSize: 14 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  termsText: { fontSize: 13 },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16 },
});
