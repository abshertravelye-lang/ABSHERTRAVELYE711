import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { getImageUrl } from '@/hooks/useImageUrl';
import { useOcrPassport, useUpdateProfile } from '@workspace/api-client-react';
import type { ProfileUpdate, SafeUser } from '@workspace/api-client-react';

const NAVY = '#0A2342';
const GOLD = '#D4AF37';

const GCC_COUNTRIES = [
  { value: 'Saudi Arabia', label: 'السعودية' },
  { value: 'United Arab Emirates', label: 'الإمارات' },
  { value: 'Kuwait', label: 'الكويت' },
  { value: 'Qatar', label: 'قطر' },
  { value: 'Bahrain', label: 'البحرين' },
  { value: 'Oman', label: 'عُمان' },
];

const EURO_DOC_TYPES = [
  { value: 'schengen_visa', label: 'تأشيرة شنغن' },
  { value: 'eu_residency', label: 'إقامة أوروبية' },
  { value: 'uk_visa', label: 'تأشيرة بريطانية' },
  { value: 'uk_residency', label: 'إقامة بريطانية' },
];

type ProfileState = ProfileUpdate & { email?: string };

function apiBase(): string {
  return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
}

/** Upload a picked image to the same endpoint the web app uses. */
async function uploadAsset(
  asset: ImagePicker.ImagePickerAsset,
  token: string | null,
): Promise<{ objectPath: string } | null> {
  const formData = new FormData();
  const name = asset.fileName || `photo-${Date.now()}.jpg`;
  const type = asset.mimeType || 'image/jpeg';
  if (Platform.OS === 'web') {
    // On web the asset URI is a blob:/data: URI — convert to a Blob
    const blob = await (await fetch(asset.uri)).blob();
    formData.append('file', new File([blob], name, { type: blob.type || type }));
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formData.append('file', { uri: asset.uri, name, type } as any);
  }
  const res = await fetch(`${apiBase()}/api/storage/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  if (!res.ok) return null;
  return res.json();
}

async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('الصلاحية مطلوبة', 'يرجى السماح بالوصول إلى الصور لرفع المستندات');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

/* ── Small shared UI pieces ── */

function SectionCard({
  num, title, subtitle, colors, children,
}: {
  num: number; title: string; subtitle?: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.card, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
      <View style={s.cardHeader}>
        <View style={s.cardHeaderText}>
          <Text style={[s.cardTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{title}</Text>
          {subtitle ? (
            <Text style={[s.cardSubtitle, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={[s.numBadge, { backgroundColor: NAVY }]}>
          <Text style={[s.numBadgeText, { fontFamily: 'Cairo_700Bold' }]}>{num}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function Field({
  label, value, onChange, colors, placeholder, ltr, keyboardType, editable = true,
}: {
  label: string; value?: string | null; onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  placeholder?: string; ltr?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  editable?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={[s.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>{label}</Text>
      <TextInput
        style={[
          s.input,
          {
            backgroundColor: editable ? colors.muted : colors.border,
            color: editable ? colors.foreground : colors.mutedForeground,
            borderColor: colors.border,
            fontFamily: 'Cairo_400Regular',
            textAlign: ltr ? 'left' : 'right',
          },
        ]}
        value={value ?? ''}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize="none"
      />
    </View>
  );
}

function DateField(props: Omit<Parameters<typeof Field>[0], 'ltr' | 'placeholder'>) {
  return <Field {...props} value={(props.value ?? '').split('T')[0]} ltr placeholder="YYYY-MM-DD" />;
}

function YesNo({
  value, onChange, colors,
}: { value?: boolean; onChange: (v: boolean) => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={s.yesNoRow}>
      {[{ v: true, t: 'نعم' }, { v: false, t: 'لا' }].map(({ v, t }) => {
        const active = value === v;
        return (
          <Pressable
            key={t}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(v); }}
            style={[
              s.yesNoBtn,
              {
                backgroundColor: active ? NAVY : colors.muted,
                borderColor: active ? GOLD : colors.border,
              },
            ]}
          >
            <Text style={[s.yesNoText, { color: active ? '#FFF' : colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{t}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChoiceChips({
  options, value, onChange, colors,
}: {
  options: { value: string; label: string }[];
  value?: string | null; onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={s.chipsWrap}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              s.chip,
              { backgroundColor: active ? NAVY : colors.muted, borderColor: active ? GOLD : colors.border },
            ]}
          >
            <Text style={[s.chipText, { color: active ? '#FFF' : colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DocUpload({
  label, value, busy, onPick, onRemove, colors,
}: {
  label: string; value?: string | null; busy?: boolean;
  onPick: () => void; onRemove: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const uri = getImageUrl(value);
  return (
    <View style={s.field}>
      <Text style={[s.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>{label}</Text>
      {uri ? (
        <View style={[s.docRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Pressable onPress={onRemove} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Image source={{ uri }} style={s.docThumb} contentFit="cover" />
        </View>
      ) : (
        <Pressable
          onPress={onPick}
          disabled={busy}
          style={[s.docUploadBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
        >
          {busy ? (
            <ActivityIndicator color={NAVY} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={22} color={colors.mutedForeground} />
              <Text style={[s.docUploadText, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>اختر صورة</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

/* ── Screen ── */

export default function ProfileEditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, accessToken, updateUser } = useAuth();

  const [profile, setProfile] = useState<ProfileState>({});
  const set = (patch: Partial<ProfileState>) => setProfile((p) => ({ ...p, ...patch }));

  // photo state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);
  const [photoRejected, setPhotoRejected] = useState(false);

  // passport state
  const [isUploadingPassport, setIsUploadingPassport] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);

  // doc uploads
  const [busyDoc, setBusyDoc] = useState<string | null>(null);

  const ocrMutation = useOcrPassport();
  const updateProfileMutation = useUpdateProfile();

  useEffect(() => {
    if (!user) return;
    setProfile({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      whatsapp: user.whatsapp || '',
      address: user.address || '',
      nationality: user.nationality || '',
      gender: (user.gender as ProfileState['gender']) || 'male',
      dateOfBirth: user.dateOfBirth || '',
      passportNumber: user.passportNumber || '',
      passportIssueCountry: user.passportIssueCountry || '',
      passportIssuePlace: user.passportIssuePlace || '',
      passportIssueDate: user.passportIssueDate || '',
      passportExpiryDate: user.passportExpiryDate || '',
      passportImageUrl: user.passportImageUrl || '',
      profilePhotoUrl: user.profilePhotoUrl || '',
      isGccResident: user.isGccResident || false,
      gccResidenceCountry: user.gccResidenceCountry || '',
      gccResidenceNumber: user.gccResidenceNumber || '',
      gccResidenceExpiry: user.gccResidenceExpiry || '',
      gccResidenceFrontUrl: user.gccResidenceFrontUrl || '',
      gccResidenceBackUrl: user.gccResidenceBackUrl || '',
      isEuropeanResident: user.isEuropeanResident || false,
      europeanDocumentType: user.europeanDocumentType || '',
      europeanDocumentUrl: user.europeanDocumentUrl || '',
      europeanDocumentExpiry: user.europeanDocumentExpiry || '',
    });
  }, [user]);

  if (!user) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }}>سجّل دخولك أولاً</Text>
      </View>
    );
  }

  /** Upload personal photo → AI validation → keep or reject */
  const handlePhotoUpload = async () => {
    const asset = await pickImage();
    if (!asset) return;
    setPhotoRejected(false);
    setIsUploadingPhoto(true);
    try {
      const r = await uploadAsset(asset, accessToken);
      if (!r) {
        Alert.alert('فشل رفع الصورة', 'حدث خطأ أثناء رفع الصورة. حاول مرة أخرى.');
        return;
      }
      set({ profilePhotoUrl: r.objectPath });
      setIsValidatingPhoto(true);
      try {
        const vRes = await fetch(`${apiBase()}/api/visa-applications/validate-photo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ imageUrl: r.objectPath }),
        });
        const vData = await vRes.json();
        if (!vData.valid) {
          set({ profilePhotoUrl: '' });
          setPhotoRejected(true);
        }
      } catch {
        // Validation unavailable — accept the photo (same as web)
      } finally {
        setIsValidatingPhoto(false);
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  /** Upload passport → OCR → prefill fields */
  const handlePassportUpload = async () => {
    const asset = await pickImage();
    if (!asset) return;
    setOcrFailed(false);
    setIsUploadingPassport(true);
    try {
      const r = await uploadAsset(asset, accessToken);
      if (!r) {
        Alert.alert('فشل رفع الجواز', 'حدث خطأ أثناء رفع صورة الجواز. حاول مرة أخرى.');
        return;
      }
      set({ passportImageUrl: r.objectPath });
      setIsUploadingPassport(false);
      setIsOcrRunning(true);
      try {
        const ocr = await ocrMutation.mutateAsync({ data: { imageUrl: r.objectPath } });
        if (ocr.success) {
          setProfile((p) => ({
            ...p,
            passportImageUrl: r.objectPath,
            ...(ocr.firstName && !p.firstName ? { firstName: ocr.firstName } : {}),
            ...(ocr.lastName && !p.lastName ? { lastName: ocr.lastName } : {}),
            ...(ocr.passportNumber ? { passportNumber: ocr.passportNumber } : {}),
            ...(ocr.nationality ? { nationality: ocr.nationality } : {}),
            ...(ocr.dateOfBirth ? { dateOfBirth: ocr.dateOfBirth } : {}),
            ...(ocr.issueDate ? { passportIssueDate: ocr.issueDate } : {}),
            ...(ocr.expiryDate ? { passportExpiryDate: ocr.expiryDate } : {}),
            ...(ocr.issuingCountry ? { passportIssueCountry: ocr.issuingCountry } : {}),
            ...(ocr.gender
              ? { gender: ocr.gender === 'M' || ocr.gender.toLowerCase() === 'male' ? 'male' : 'female' }
              : {}),
          }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setOcrFailed(true);
        }
      } catch {
        setOcrFailed(true);
      } finally {
        setIsOcrRunning(false);
      }
    } finally {
      setIsUploadingPassport(false);
    }
  };

  const handleDocUpload = async (key: 'gccResidenceFrontUrl' | 'gccResidenceBackUrl' | 'europeanDocumentUrl') => {
    const asset = await pickImage();
    if (!asset) return;
    setBusyDoc(key);
    try {
      const r = await uploadAsset(asset, accessToken);
      if (!r) {
        Alert.alert('فشل الرفع', 'حدث خطأ أثناء رفع الصورة. حاول مرة أخرى.');
        return;
      }
      set({ [key]: r.objectPath } as Partial<ProfileState>);
    } finally {
      setBusyDoc(null);
    }
  };

  const handleSave = () => {
    const { email: _email, ...data } = profile;
    updateProfileMutation.mutate(
      { data },
      {
        onSuccess: async (updated) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await updateUser(updated as SafeUser);
          Alert.alert('تم الحفظ', 'تم حفظ بيانات الملف الشخصي بنجاح', [
            { text: 'حسناً', onPress: () => router.back() },
          ]);
        },
        onError: () => {
          Alert.alert('خطأ', 'فشل تحديث الملف الشخصي. حاول مرة أخرى.');
        },
      },
    );
  };

  const keyFields: (keyof ProfileState)[] = [
    'firstName', 'lastName', 'phone', 'nationality', 'dateOfBirth',
    'passportNumber', 'passportExpiryDate', 'profilePhotoUrl', 'passportImageUrl',
  ];
  const completion = Math.round(
    (keyFields.filter((k) => !!profile[k]).length / keyFields.length) * 100,
  );

  const photoUri = getImageUrl(profile.profilePhotoUrl);
  const passportUri = getImageUrl(profile.passportImageUrl);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <LinearGradient colors={['#071525', '#0A2342', '#1E3A5F']} style={[s.header, { paddingTop: (Platform.OS === 'web' ? 24 : insets.top) + 12 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.closeBtn}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <Text style={[s.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>إكمال الملف الشخصي</Text>
          <View style={s.progressRow}>
            <Text style={[s.progressText, { fontFamily: 'Cairo_600SemiBold' }]}>{completion}%</Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${completion}%` }]} />
            </View>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}>
          {/* 1 — Personal photo */}
          <SectionCard num={1} title="الصورة الشخصية" subtitle="صورة واضحة للوجه — سيتم التحقق منها تلقائياً" colors={colors}>
            {photoRejected && (
              <View style={[s.warnBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[s.warnText, { color: '#B91C1C', fontFamily: 'Cairo_600SemiBold' }]}>
                  الصورة غير مقبولة — يرجى رفع صورة شخصية أوضح
                </Text>
              </View>
            )}
            <View style={s.photoRow}>
              <Pressable
                onPress={handlePhotoUpload}
                disabled={isUploadingPhoto || isValidatingPhoto}
                style={[s.photoUploadBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
              >
                {isUploadingPhoto || isValidatingPhoto ? (
                  <>
                    <ActivityIndicator color={NAVY} />
                    <Text style={[s.photoUploadText, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
                      {isUploadingPhoto ? 'جاري الرفع...' : 'جاري التحقق من الصورة...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={26} color={NAVY} />
                    <Text style={[s.photoUploadText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
                      {photoUri ? 'استبدال الصورة' : 'ارفع الصورة الشخصية'}
                    </Text>
                  </>
                )}
              </Pressable>
              {photoUri ? (
                <View>
                  <Image source={{ uri: photoUri }} style={s.photoPreview} contentFit="cover" />
                  <View style={s.photoCheck}>
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  </View>
                </View>
              ) : null}
            </View>
          </SectionCard>

          {/* 2 — Passport */}
          <SectionCard num={2} title="جواز السفر" subtitle="ارفع صفحة المعلومات — سيتم استخراج البيانات تلقائياً" colors={colors}>
            {isUploadingPassport || isOcrRunning ? (
              <View style={[s.ocrBox, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <ActivityIndicator color={NAVY} size="large" />
                <Text style={[s.ocrText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
                  {isUploadingPassport ? 'جاري الرفع...' : 'جاري قراءة بيانات الجواز...'}
                </Text>
                {isOcrRunning && (
                  <Text style={[s.ocrHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                    الذكاء الاصطناعي يستخرج البيانات تلقائياً
                  </Text>
                )}
              </View>
            ) : passportUri ? (
              <View style={[s.docRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Pressable onPress={handlePassportUpload} style={s.replaceBtn}>
                  <Ionicons name="camera-outline" size={16} color={NAVY} />
                  <Text style={[s.replaceText, { fontFamily: 'Cairo_600SemiBold' }]}>استبدال</Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                <Image source={{ uri: passportUri }} style={s.passportThumb} contentFit="cover" />
              </View>
            ) : (
              <Pressable onPress={handlePassportUpload} style={[s.ocrBox, { borderColor: 'rgba(10,35,66,0.25)', backgroundColor: 'rgba(10,35,66,0.04)' }]}>
                <Ionicons name="document-text-outline" size={32} color={NAVY} />
                <Text style={[s.ocrText, { color: NAVY, fontFamily: 'Cairo_700Bold' }]}>ارفع صورة جواز السفر</Text>
                <Text style={[s.ocrHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>صفحة المعلومات الشخصية فقط</Text>
              </Pressable>
            )}

            {ocrFailed && (
              <View style={[s.warnBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Text style={[s.warnText, { color: '#92400E', fontFamily: 'Cairo_600SemiBold' }]}>
                  تعذّر قراءة الجواز تلقائياً — يرجى إدخال البيانات يدوياً أدناه
                </Text>
              </View>
            )}

            {!!profile.passportImageUrl && !isOcrRunning && (
              <View style={{ marginTop: 14 }}>
                <Field label="الاسم الأول *" value={profile.firstName} onChange={(v) => set({ firstName: v })} colors={colors} />
                <Field label="اسم العائلة *" value={profile.lastName} onChange={(v) => set({ lastName: v })} colors={colors} />
                <Field label="رقم الجواز *" value={profile.passportNumber} onChange={(v) => set({ passportNumber: v })} colors={colors} ltr />
                <Field label="الجنسية *" value={profile.nationality} onChange={(v) => set({ nationality: v })} colors={colors} placeholder="مثال: اليمن" />
                <DateField label="تاريخ الميلاد *" value={profile.dateOfBirth} onChange={(v) => set({ dateOfBirth: v })} colors={colors} />
                <View style={s.field}>
                  <Text style={[s.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>الجنس</Text>
                  <ChoiceChips
                    options={[{ value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' }]}
                    value={profile.gender}
                    onChange={(v) => set({ gender: v as ProfileState['gender'] })}
                    colors={colors}
                  />
                </View>
                <DateField label="تاريخ الإصدار" value={profile.passportIssueDate} onChange={(v) => set({ passportIssueDate: v })} colors={colors} />
                <DateField label="تاريخ الانتهاء *" value={profile.passportExpiryDate} onChange={(v) => set({ passportExpiryDate: v })} colors={colors} />
                <Field label="دولة الإصدار" value={profile.passportIssueCountry} onChange={(v) => set({ passportIssueCountry: v })} colors={colors} />
                <Field label="مكان الإصدار" value={profile.passportIssuePlace} onChange={(v) => set({ passportIssuePlace: v })} colors={colors} />
              </View>
            )}
          </SectionCard>

          {/* 3 — Contact */}
          <SectionCard num={3} title="معلومات التواصل" colors={colors}>
            <Field label="رقم الهاتف *" value={profile.phone} onChange={(v) => set({ phone: v })} colors={colors} ltr keyboardType="phone-pad" placeholder="+9661234567" />
            <Field label="واتساب" value={profile.whatsapp} onChange={(v) => set({ whatsapp: v })} colors={colors} ltr keyboardType="phone-pad" placeholder="+9661234567" />
            <Field label="العنوان" value={profile.address} onChange={(v) => set({ address: v })} colors={colors} />
            <Field label="البريد الإلكتروني" value={profile.email} onChange={() => {}} colors={colors} ltr editable={false} />
          </SectionCard>

          {/* 4 — GCC residency */}
          <SectionCard num={4} title="إقامة دول مجلس التعاون" subtitle="هل أنت مقيم في إحدى دول مجلس التعاون الخليجي؟" colors={colors}>
            <YesNo
              value={profile.isGccResident}
              onChange={(v) => set(v ? { isGccResident: true } : { isGccResident: false, gccResidenceCountry: '', gccResidenceFrontUrl: '', gccResidenceBackUrl: '' })}
              colors={colors}
            />
            {profile.isGccResident && (
              <View style={{ marginTop: 14 }}>
                <View style={s.field}>
                  <Text style={[s.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>دولة الإقامة</Text>
                  <ChoiceChips options={GCC_COUNTRIES} value={profile.gccResidenceCountry} onChange={(v) => set({ gccResidenceCountry: v })} colors={colors} />
                </View>
                <Field label="رقم الإقامة" value={profile.gccResidenceNumber} onChange={(v) => set({ gccResidenceNumber: v })} colors={colors} ltr />
                <DateField label="تاريخ الانتهاء" value={profile.gccResidenceExpiry} onChange={(v) => set({ gccResidenceExpiry: v })} colors={colors} />
                <DocUpload
                  label="صورة الإقامة (الوجه الأمامي)"
                  value={profile.gccResidenceFrontUrl}
                  busy={busyDoc === 'gccResidenceFrontUrl'}
                  onPick={() => handleDocUpload('gccResidenceFrontUrl')}
                  onRemove={() => set({ gccResidenceFrontUrl: '' })}
                  colors={colors}
                />
                <DocUpload
                  label="صورة الإقامة (الوجه الخلفي)"
                  value={profile.gccResidenceBackUrl}
                  busy={busyDoc === 'gccResidenceBackUrl'}
                  onPick={() => handleDocUpload('gccResidenceBackUrl')}
                  onRemove={() => set({ gccResidenceBackUrl: '' })}
                  colors={colors}
                />
              </View>
            )}
          </SectionCard>

          {/* 5 — European residency */}
          <SectionCard num={5} title="الإقامة الأوروبية / تأشيرة شنغن" subtitle="هل لديك إقامة أوروبية أو تأشيرة شنغن سارية؟" colors={colors}>
            <YesNo
              value={profile.isEuropeanResident}
              onChange={(v) => set(v ? { isEuropeanResident: true } : { isEuropeanResident: false, europeanDocumentType: '', europeanDocumentUrl: '' })}
              colors={colors}
            />
            {profile.isEuropeanResident && (
              <View style={{ marginTop: 14 }}>
                <View style={s.field}>
                  <Text style={[s.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>نوع الوثيقة</Text>
                  <ChoiceChips options={EURO_DOC_TYPES} value={profile.europeanDocumentType} onChange={(v) => set({ europeanDocumentType: v })} colors={colors} />
                </View>
                <DateField label="تاريخ الانتهاء" value={profile.europeanDocumentExpiry} onChange={(v) => set({ europeanDocumentExpiry: v })} colors={colors} />
                <DocUpload
                  label="صورة الوثيقة"
                  value={profile.europeanDocumentUrl}
                  busy={busyDoc === 'europeanDocumentUrl'}
                  onPick={() => handleDocUpload('europeanDocumentUrl')}
                  onRemove={() => set({ europeanDocumentUrl: '' })}
                  colors={colors}
                />
              </View>
            )}
          </SectionCard>
        </ScrollView>

        {/* Save bar */}
        <View style={[s.saveBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleSave}
            disabled={updateProfileMutation.isPending}
            style={({ pressed }) => [s.saveBtn, { backgroundColor: GOLD, opacity: pressed || updateProfileMutation.isPending ? 0.85 : 1 }]}
          >
            {updateProfileMutation.isPending ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <Ionicons name="save-outline" size={20} color={NAVY} />
            )}
            <Text style={[s.saveBtnText, { fontFamily: 'Cairo_700Bold' }]}>حفظ الملف الشخصي</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  closeBtn: { alignSelf: 'flex-start', marginBottom: 6 },
  headerTitle: { fontSize: 20, color: '#FFFFFF', textAlign: 'right' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: GOLD },
  progressText: { fontSize: 13, color: GOLD },

  card: {
    borderRadius: 18, padding: 16, marginBottom: 14,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, justifyContent: 'flex-end' },
  cardHeaderText: { flex: 1, alignItems: 'flex-end' },
  cardTitle: { fontSize: 16, textAlign: 'right' },
  cardSubtitle: { fontSize: 12, marginTop: 2, textAlign: 'right' },
  numBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  numBadgeText: { color: '#FFF', fontSize: 14 },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, marginBottom: 6, textAlign: 'right' },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },

  yesNoRow: { flexDirection: 'row', gap: 10 },
  yesNoBtn: { flex: 1, borderRadius: 14, borderWidth: 2, paddingVertical: 12, alignItems: 'center' },
  yesNoText: { fontSize: 14 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  chip: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13 },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoUploadBtn: { flex: 1, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', paddingVertical: 22, alignItems: 'center', gap: 8 },
  photoUploadText: { fontSize: 14 },
  photoPreview: { width: 84, height: 84, borderRadius: 14, borderWidth: 2, borderColor: '#10B981' },
  photoCheck: { position: 'absolute', top: -8, left: -8, backgroundColor: '#FFF', borderRadius: 11 },

  ocrBox: { borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', paddingVertical: 26, alignItems: 'center', gap: 8 },
  ocrText: { fontSize: 15 },
  ocrHint: { fontSize: 12 },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 10 },
  docThumb: { width: 64, height: 44, borderRadius: 8 },
  passportThumb: { width: 80, height: 54, borderRadius: 8 },
  replaceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(10,35,66,0.08)' },
  replaceText: { fontSize: 12, color: NAVY },
  docUploadBtn: { borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', paddingVertical: 18, alignItems: 'center', gap: 6, flexDirection: 'row', justifyContent: 'center' },
  docUploadText: { fontSize: 13 },

  warnBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  warnText: { fontSize: 13, textAlign: 'right' },

  saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 15 },
  saveBtnText: { fontSize: 16, color: NAVY },
});
