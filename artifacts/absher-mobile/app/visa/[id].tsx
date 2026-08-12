import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useGetVisa, useCreateVisaApplication } from '@workspace/api-client-react';
import DatePickerModal, { DateField } from '@/components/DatePickerModal';
import ImageUploader from '@/components/ImageUploader';
import NationalityPicker from '@/components/NationalityPicker';
import { Nationality } from '@/constants/nationalities';
import { useAuth } from '@/context/AuthContext';

const STATUS_LABEL_KEYS: Record<string, string> = {
  available: 'visaDetail.status.available', suspended: 'visaDetail.status.suspended', closed: 'visaDetail.status.closed',
};
const STATUS_COLORS: Record<string, string> = {
  available: '#16A34A', suspended: '#EAB308', closed: '#EF4444',
};

type DatePickerKey = 'dateOfBirth' | 'passportIssueDate' | 'passportExpiryDate';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function VisaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();

  const { data: visa, isLoading } = useGetVisa(Number(id));
  const createApp = useCreateVisaApplication();

  const [showForm,     setShowForm]     = useState(false);
  const [activePicker, setActivePicker] = useState<DatePickerKey | null>(null);

  const [form, setForm] = useState({
    fullName: '', nationality: '', passportNumber: '',
    passportIssueDate: '', passportExpiryDate: '', dateOfBirth: '',
    gender: 'male' as 'male' | 'female',
    email: '', phone: '',
    agreedToTerms: false,
    // image URLs (populated by ImageUploader after upload)
    personalPhotoUrl: '',
    passportImageUrl: '',
    residencyImageUrl: '',
    residencyBackImageUrl: '',
    visaImageUrl: '',
    alternativeVisaNumber: '',
    alternativeVisaExpiry: '',
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  // Determine whether each doc section is required based on visa flags
  const needsPersonalPhoto  = visa?.requiresPersonalPhoto  !== false; // default true
  const needsPassportImage  = visa?.requiresPassportImage  !== false; // default true
  const needsResidencyImage = visa?.requiresResidencyImage === true;
  const needsAltVisa =
    visa?.acceptsSchengenResidency || visa?.acceptsUkResidency ||
    visa?.acceptsUsVisa || visa?.acceptsCanadaResidency || visa?.acceptsAustraliaResidency;

  const submit = () => {
    if (!form.fullName || !form.nationality || !form.passportNumber || !form.email || !form.phone) {
      Alert.alert(t('visaDetail.missingDataTitle'), t('visaDetail.missingDataBody'));
      return;
    }
    if (!form.agreedToTerms) {
      Alert.alert(t('visaDetail.agreementRequiredTitle'), t('visaDetail.agreementRequiredBody'));
      return;
    }
    if (needsPersonalPhoto && !form.personalPhotoUrl) {
      Alert.alert(t('visaDetail.photoRequiredTitle'), t('visaDetail.uploadPersonalPhoto'));
      return;
    }
    if (needsPassportImage && !form.passportImageUrl) {
      Alert.alert(t('visaDetail.photoRequiredTitle'), t('visaDetail.uploadPassportImage'));
      return;
    }
    if (needsResidencyImage && !form.residencyImageUrl) {
      Alert.alert(t('visaDetail.photoRequiredTitle'), t('visaDetail.uploadResidencyImage'));
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
          passportIssueDate:  form.passportIssueDate  || '2020-01-01',
          passportExpiryDate: form.passportExpiryDate || '2030-01-01',
          dateOfBirth:        form.dateOfBirth        || '1990-01-01',
          gender: form.gender,
          email: form.email,
          phone: form.phone,
          agreedToTerms: true,
          personalPhotoUrl:     form.personalPhotoUrl     || undefined,
          passportImageUrl:     form.passportImageUrl     || undefined,
          residencyImageUrl:    form.residencyImageUrl    || undefined,
          visaImageUrl:         form.visaImageUrl         || undefined,
          alternativeVisaNumber: form.alternativeVisaNumber || undefined,
          alternativeVisaExpiry: form.alternativeVisaExpiry || undefined,
        },
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowForm(false);
          Alert.alert(t('visaDetail.submitSuccessTitle'), t('visaDetail.submitSuccessBody'));
        },
        onError: (err: any) =>
          Alert.alert(t('flow.error'), err?.message || t('visaDetail.submitError')),
      },
    );
  };

  if (isLoading)
    return (
      <View style={[s.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  if (!visa)
    return (
      <View style={[s.loading, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }}>
          {t('visaDetail.notFound')}
        </Text>
      </View>
    );

  const statusColor = STATUS_COLORS[visa.status] || '#64748B';

  const InfoRow = ({ label, value }: { label: string; value: string | number | null | undefined }) =>
    value ? (
      <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
        <Text style={[s.infoVal,   { color: colors.foreground,      fontFamily: 'Cairo_600SemiBold' }]}>{String(value)}</Text>
        <Text style={[s.infoLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular'  }]}>{label}</Text>
      </View>
    ) : null;

  const countryName = lang === 'ar' ? visa.countryAr : ((visa as any).countryEn || visa.countryAr);

  const datePickerConfigs: Record<DatePickerKey, { label: string; mode: 'birth' | 'passport'; minDate?: string; maxDate?: string }> = {
    dateOfBirth:        { label: t('visaDetail.dateOfBirth'),          mode: 'birth',    maxDate: todayISO() },
    passportIssueDate:  { label: t('visaDetail.passportIssueDate'),    mode: 'passport', maxDate: todayISO() },
    passportExpiryDate: { label: t('visaDetail.passportExpiryDate'),   mode: 'passport', minDate: todayISO() },
  };
  const activeConfig = activePicker ? datePickerConfigs[activePicker] : null;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={[s.header, { paddingTop: insets.top + 12, backgroundColor: colors.navy }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={s.flagArea}>
            <View style={[s.flag, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={s.flagText}>{visa.countryCode || '🌍'}</Text>
            </View>
            <Text style={[s.country, { fontFamily: 'Cairo_700Bold' }]}>{countryName}</Text>
            <View style={[s.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[s.statusText, { color: statusColor, fontFamily: 'Cairo_600SemiBold' }]}>
                {STATUS_LABEL_KEYS[visa.status] ? t(STATUS_LABEL_KEYS[visa.status]) : visa.status}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Price card ───────────────────────────────────────────────────── */}
        <View style={[s.priceCard, { backgroundColor: colors.card }]}>
          <View style={s.priceRow}>
            <Text style={[s.priceLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{t('visaDetail.fee')}</Text>
            <Text style={[s.price,      { color: colors.navy,              fontFamily: 'Cairo_700Bold'    }]}>{visa.fee} {visa.currency}</Text>
          </View>
          <View style={[s.divider, { backgroundColor: colors.border }]} />
          <View style={s.priceRow}>
            <Text style={[s.priceLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{t('visaDetail.processingTime')}</Text>
            <Text style={[s.priceVal,   { color: colors.foreground,      fontFamily: 'Cairo_600SemiBold'}]}>{visa.processingDays} {t('visaDetail.workingDays')}</Text>
          </View>
          {visa.stayDuration && (
            <>
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <View style={s.priceRow}>
                <Text style={[s.priceLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{t('visaDetail.stayDuration')}</Text>
                <Text style={[s.priceVal,   { color: colors.foreground,      fontFamily: 'Cairo_600SemiBold'}]}>{visa.stayDuration} {t('visaDetail.dayUnit')}</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Details ──────────────────────────────────────────────────────── */}
        <View style={[s.detailCard, { backgroundColor: colors.card }]}>
          <Text style={[s.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>تفاصيل التأشيرة</Text>
          <InfoRow label="نوع التأشيرة" value={visa.visaType} />
          <InfoRow label="نوع الدخول"   value={visa.entryType === 'single' ? 'دخول واحد' : visa.entryType === 'multiple' ? 'دخول متعدد' : 'عبور'} />
          <InfoRow label="الصلاحية"     value={visa.validityDays ? `${visa.validityDays} يوم` : null} />
        </View>

        {visa.descriptionAr && (
          <View style={[s.detailCard, { backgroundColor: colors.card }]}>
            <Text style={[s.sectionTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>متطلبات التأشيرة</Text>
            <Text style={[s.desc, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{visa.descriptionAr}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Apply Button ─────────────────────────────────────────────────── */}
      {visa.status === 'available' && (
        <View style={[s.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [s.applyBtn, { backgroundColor: colors.navy, opacity: pressed ? 0.9 : 1 }]}
            onPress={() => {
              if (!authUser) {
                Alert.alert(
                  'تسجيل الدخول مطلوب',
                  'يجب تسجيل الدخول للتقديم على التأشيرة',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'تسجيل الدخول', onPress: () => router.push('/auth/login') },
                  ]
                );
                return;
              }
              // Check profile completeness
              const profileComplete = !!(
                authUser.firstName && authUser.lastName && authUser.phone &&
                authUser.nationality && authUser.dateOfBirth &&
                authUser.profilePhotoUrl && authUser.passportNumber && authUser.passportExpiryDate
              );
              if (!profileComplete) {
                Alert.alert(
                  'الملف الشخصي غير مكتمل',
                  'يرجى إكمال بياناتك الشخصية قبل التقديم على التأشيرة',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'إكمال الملف', onPress: () => router.push('/(tabs)/account') },
                  ]
                );
                return;
              }
              // Route to the profile-driven 5-step wizard (single source of truth
              // for application submission — matches the server contract).
              router.push(`/umrah-visa?visaId=${Number(id)}` as never);
            }}
          >
            <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
            <Text style={[s.applyBtnText, { fontFamily: 'Cairo_700Bold' }]}>
              {!authUser ? 'سجل دخولك للتقديم' : 'تقديم طلب تأشيرة'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Application Form Modal
          ═══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>

          {/* Modal header */}
          <View style={[s.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[s.modalTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
              طلب تأشيرة {visa.countryAr}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">

            {/* ── Personal Info ──────────────────────────────────────────── */}
            <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.sectionHeader}>
                <Ionicons name="person-outline" size={18} color={colors.navy} />
                <Text style={[s.sectionHeaderText, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
                  البيانات الشخصية
                </Text>
              </View>

              {([
                { key: 'fullName',    label: 'الاسم الكامل',       placeholder: 'محمد أحمد السعيد',  keyboard: 'default' },
                { key: 'nationality', label: 'الجنسية',             placeholder: 'سعودي',              keyboard: 'default' },
                { key: 'email',       label: 'البريد الإلكتروني',   placeholder: 'example@email.com',  keyboard: 'email-address' },
                { key: 'phone',       label: 'رقم الهاتف',          placeholder: '+966 50 000 0000',   keyboard: 'phone-pad' },
              ] as { key: keyof typeof form; label: string; placeholder: string; keyboard: any }[]).map(f => (
                <View key={String(f.key)} style={s.field}>
                  <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{f.label}</Text>
                  <TextInput
                    value={String(form[f.key])}
                    onChangeText={v => set(f.key as any, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType={f.keyboard}
                    style={[s.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
                    textAlign="right"
                  />
                </View>
              ))}

              {/* Date of Birth */}
              <View style={s.field}>
                <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>تاريخ الميلاد</Text>
                <DateField
                  value={form.dateOfBirth}
                  placeholder="اختر تاريخ الميلاد"
                  onPress={() => setActivePicker('dateOfBirth')}
                  colors={colors}
                />
              </View>

              {/* Gender */}
              <View style={s.field}>
                <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>الجنس</Text>
                <View style={s.genderRow}>
                  {(['male', 'female'] as const).map(g => (
                    <Pressable
                      key={g}
                      style={[s.genderBtn, { backgroundColor: form.gender === g ? colors.navy : colors.muted, borderColor: colors.border }]}
                      onPress={() => set('gender', g)}
                    >
                      <Text style={[s.genderText, { color: form.gender === g ? '#FFFFFF' : colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
                        {g === 'male' ? '👨  ذكر' : '👩  أنثى'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* ── Passport ──────────────────────────────────────────────── */}
            <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.sectionHeader}>
                <Ionicons name="card-outline" size={18} color={colors.navy} />
                <Text style={[s.sectionHeaderText, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
                  بيانات جواز السفر
                </Text>
              </View>

              <View style={s.field}>
                <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>رقم الجواز</Text>
                <TextInput
                  value={form.passportNumber}
                  onChangeText={v => set('passportNumber', v)}
                  placeholder="رقم الجواز"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  style={[s.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
                  textAlign="right"
                />
              </View>

              <View style={s.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>تاريخ الإصدار</Text>
                  <DateField
                    value={form.passportIssueDate}
                    placeholder="اختر التاريخ"
                    onPress={() => setActivePicker('passportIssueDate')}
                    colors={colors}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>تاريخ الانتهاء</Text>
                  <DateField
                    value={form.passportExpiryDate}
                    placeholder="اختر التاريخ"
                    onPress={() => setActivePicker('passportExpiryDate')}
                    colors={colors}
                  />
                  {form.passportExpiryDate && form.passportExpiryDate < todayISO() && (
                    <Text style={[s.warn, { fontFamily: 'Cairo_400Regular' }]}>⚠️ الجواز منتهٍ</Text>
                  )}
                </View>
              </View>
            </View>

            {/* ── Documents ─────────────────────────────────────────────── */}
            <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.sectionHeader}>
                <Ionicons name="documents-outline" size={18} color={colors.navy} />
                <Text style={[s.sectionHeaderText, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
                  المستندات المطلوبة
                </Text>
              </View>

              {/* Personal photo */}
              {needsPersonalPhoto && (
                <ImageUploader
                  label="الصورة الشخصية"
                  sublabel="صورة حديثة بخلفية بيضاء"
                  icon="person-circle-outline"
                  required
                  value={form.personalPhotoUrl}
                  onUpload={url => set('personalPhotoUrl', url)}
                  onRemove={() => set('personalPhotoUrl', '')}
                />
              )}

              {/* Passport image */}
              {needsPassportImage && (
                <ImageUploader
                  label="صورة الجواز"
                  sublabel="الصفحة الأولى مع البيانات الشخصية"
                  icon="card-outline"
                  required
                  value={form.passportImageUrl}
                  onUpload={url => set('passportImageUrl', url)}
                  onRemove={() => set('passportImageUrl', '')}
                />
              )}

              {/* Residency images */}
              {needsResidencyImage && (
                <>
                  <ImageUploader
                    label="صورة الإقامة (وجه)"
                    sublabel="الجهة الأمامية للإقامة"
                    icon="id-card-outline"
                    required
                    value={form.residencyImageUrl}
                    onUpload={url => set('residencyImageUrl', url)}
                    onRemove={() => set('residencyImageUrl', '')}
                  />
                  <ImageUploader
                    label="صورة الإقامة (ظهر)"
                    sublabel="الجهة الخلفية للإقامة"
                    icon="id-card-outline"
                    value={form.residencyBackImageUrl}
                    onUpload={url => set('residencyBackImageUrl', url)}
                    onRemove={() => set('residencyBackImageUrl', '')}
                  />
                </>
              )}

              {/* Alternative visa (Schengen / UK / US etc.) */}
              {needsAltVisa && (
                <>
                  <ImageUploader
                    label="صورة التأشيرة البديلة"
                    sublabel={
                      [
                        visa?.acceptsSchengenResidency && 'شنغن',
                        visa?.acceptsUkResidency        && 'بريطانيا',
                        visa?.acceptsUsVisa             && 'أمريكا',
                        visa?.acceptsCanadaResidency    && 'كندا',
                        visa?.acceptsAustraliaResidency && 'أستراليا',
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'تأشيرة بديلة'
                    }
                    icon="earth-outline"
                    value={form.visaImageUrl}
                    onUpload={url => set('visaImageUrl', url)}
                    onRemove={() => set('visaImageUrl', '')}
                  />
                  <View style={s.field}>
                    <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>رقم التأشيرة البديلة</Text>
                    <TextInput
                      value={form.alternativeVisaNumber}
                      onChangeText={v => set('alternativeVisaNumber', v)}
                      placeholder="رقم التأشيرة"
                      placeholderTextColor={colors.mutedForeground}
                      style={[s.fieldInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
                      textAlign="right"
                    />
                  </View>
                </>
              )}
            </View>

            {/* ── Terms ─────────────────────────────────────────────────── */}
            <Pressable
              style={[s.termsRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => set('agreedToTerms', !form.agreedToTerms)}
            >
              <Ionicons
                name={form.agreedToTerms ? 'checkbox' : 'square-outline'}
                size={24}
                color={form.agreedToTerms ? colors.navy : colors.mutedForeground}
              />
              <Text style={[s.termsText, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}>
                أوافق على الشروط والأحكام وسياسة الخصوصية وأقر بصحة المعلومات المُدخلة
              </Text>
            </Pressable>

            {/* ── Submit ────────────────────────────────────────────────── */}
            <Pressable
              style={({ pressed }) => [s.submitBtn, { backgroundColor: colors.navy, opacity: pressed ? 0.9 : 1 }]}
              onPress={submit}
              disabled={createApp.isPending}
            >
              {createApp.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={[s.submitBtnText, { fontFamily: 'Cairo_700Bold' }]}>تقديم الطلب</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>

        {/* Date Picker (rendered on top of the form modal) */}
        {activeConfig && (
          <DatePickerModal
            visible={activePicker !== null}
            onClose={() => setActivePicker(null)}
            mode={activeConfig.mode}
            value={form[activePicker!] as string}
            onSelect={d => { set(activePicker! as any, d); setActivePicker(null); }}
            minDate={activeConfig.minDate}
            maxDate={activeConfig.maxDate}
            label={activeConfig.label}
          />
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1 },
  loading:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:          { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn:         { marginBottom: 16 },
  flagArea:        { alignItems: 'center', gap: 10 },
  flag:            { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  flagText:        { fontSize: 40 },
  country:         { fontSize: 24, color: '#FFFFFF' },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  statusDot:       { width: 8, height: 8, borderRadius: 4 },
  statusText:      { fontSize: 13 },
  priceCard:       { margin: 16, borderRadius: 16, padding: 16, elevation: 3 },
  priceRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  priceLabel:      { fontSize: 14 },
  price:           { fontSize: 22 },
  priceVal:        { fontSize: 15 },
  divider:         { height: 1 },
  detailCard:      { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, elevation: 3 },
  sectionTitle:    { fontSize: 16, marginBottom: 12, textAlign: 'right' },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel:       { fontSize: 13 },
  infoVal:         { fontSize: 14 },
  desc:            { fontSize: 14, lineHeight: 24, textAlign: 'right' },
  footer:          { padding: 16, borderTopWidth: 1 },
  applyBtn:        { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  applyBtnText:    { color: '#FFFFFF', fontSize: 16 },
  // ── Modal ────────────────────────────────────────────────────────────────
  modal:           { flex: 1 },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle:      { fontSize: 16 },
  formContent:     { padding: 16, gap: 14, paddingBottom: 60 },
  // ── Sections ─────────────────────────────────────────────────────────────
  section:         { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionHeaderText:{ fontSize: 15 },
  // ── Fields ───────────────────────────────────────────────────────────────
  field:           { gap: 6 },
  fieldLabel:      { fontSize: 14, textAlign: 'right' },
  fieldInput:      { borderRadius: 10, borderWidth: 1, padding: 13, fontSize: 14 },
  twoCol:          { flexDirection: 'row', gap: 10 },
  warn:            { fontSize: 11, color: '#EF4444', textAlign: 'right', marginTop: 3 },
  genderRow:       { flexDirection: 'row', gap: 10 },
  genderBtn:       { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  genderText:      { fontSize: 14 },
  // ── Terms / Submit ────────────────────────────────────────────────────────
  termsRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  termsText:       { fontSize: 13, flex: 1, textAlign: 'right', lineHeight: 20 },
  submitBtn:       { borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 },
  submitBtnText:   { color: '#FFFFFF', fontSize: 16 },
});
