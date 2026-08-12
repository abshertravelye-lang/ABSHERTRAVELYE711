/**
 * Visa Application — premium wizard driven ENTIRELY by the stored user profile.
 *
 * SERVER CONTRACT (see api-server/src/routes/visaApplications.ts):
 *   POST /visa-applications requires auth, a REAL visaId, a COMPLETE stored
 *   profile, and builds the application record entirely from the stored profile.
 *   Client-entered fields are NOT persisted as application data — so this wizard
 *   edits the PROFILE (useUpdateProfile) and only submits the chosen visaId.
 *
 * Flow (profile-driven, NO re-entry of personal data):
 *   PROFILE GATE: at entry, if the stored profile is incomplete a branded dialog
 *   sends the customer to the profile-completion screen (/profile-edit). Only a
 *   COMPLETE profile may proceed.
 *
 *   0) اختيار التأشيرة   (visa selection — skipped when a visaId route param is present)
 *   1) بيانات التأشيرة   (visa details: price + processing duration, a read-only
 *                         "بطاقة بياناتي" card rendered from the stored profile,
 *                         and the الإقرار declaration checkbox)
 *   2) التأكيد            (confirm → if no immediate payment: a branded
 *                         "ستدفع بعد الموافقة الأولية" popup showing the fee,
 *                         then POST /visa-applications → success renders ONLY
 *                         from the API response; back is fully blocked)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
import ConfirmDialog from '@/components/ConfirmDialog';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { getImageSource } from '@/hooks/useImageUrl';
import WizardStepper from '@/components/wizard/WizardStepper';
import {
  ApiError,
  useOcrPassport,
  useListVisas,
  getListVisasQueryKey,
  useGetVisa,
  getGetVisaQueryKey,
  useGetCurrentUser,
  getGetCurrentUserQueryKey,
  useUpdateProfile,
  useCreateVisaApplication,
} from '@workspace/api-client-react';
import type { Visa, SafeUser, ProfileUpdate, VisaApplication } from '@workspace/api-client-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Gender = 'male' | 'female';

interface DocPicked {
  uri: string;
  name: string;
  mimeType: string;
  isPdf: boolean;
}

// ─── Upload helper (multipart POST, authenticated) ─────────────────────────────
/** Uploads a local file to /api/storage/uploads and returns the objectPath. */
async function uploadToStorage(
  uri: string,
  token: string | null,
  name: string,
  mimeType: string,
): Promise<string | null> {
  try {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      formData.append('file', new File([blob], name, { type: blob.type || mimeType }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formData.append('file', { uri, name, type: mimeType } as any);
    }
    const res = await fetch(`${API_BASE}/api/storage/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) return null;
    const { objectPath } = await res.json();
    return objectPath as string;
  } catch {
    return null;
  }
}

async function pickImageAsset(): Promise<DocPicked | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('الصلاحية مطلوبة', 'يرجى السماح بالوصول إلى الصور لرفع المستندات');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg`, mimeType: a.mimeType ?? 'image/jpeg', isPdf: false };
}

async function captureImageAsset(): Promise<DocPicked | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('الصلاحية مطلوبة', 'يرجى السماح بالوصول إلى الكاميرا');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg`, mimeType: a.mimeType ?? 'image/jpeg', isPdf: false };
}

async function pickPdfAsset(): Promise<DocPicked | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.name ?? `document_${Date.now()}.pdf`, mimeType: a.mimeType ?? 'application/pdf', isPdf: true };
}

// New profile-driven flow. When the profile is complete the customer never
// re-enters data — they only review their details, tick the declaration, and
// confirm. Two logical steps: (1) visa details + data card + declaration,
// (2) confirm/submit (with a deferred-payment notice popup when applicable).
const STEP_LABELS = ['بيانات التأشيرة', 'التأكيد'];
const STEP_LABELS_WITH_VISA = ['التأشيرة', ...STEP_LABELS];

// ─── Reusable field ─────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, keyboardType, required, ltr,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'phone-pad' | 'email-address';
  required?: boolean; ltr?: boolean;
}) {
  const c = useColors();
  return (
    <View style={f.wrap}>
      <Text style={[f.label, { color: c.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
        {label}{required && <Text style={{ color: c.destructive }}> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={c.mutedForeground}
        keyboardType={keyboardType ?? 'default'}
        style={[f.input, { backgroundColor: c.muted, borderColor: c.border, color: c.foreground, fontFamily: 'Cairo_400Regular', textAlign: ltr ? 'left' : 'right' }]}
      />
    </View>
  );
}
const f = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, textAlign: 'right' },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
});

// ─── Document tile (uploads into a profile field) ───────────────────────────
function DocField({
  label, hint, icon, required, value, busy, onPick, onRemove, allowPdf = true,
}: {
  label: string; hint?: string; icon: keyof typeof Ionicons.glyphMap;
  required?: boolean; value?: string | null; busy?: boolean;
  onPick: (a: DocPicked) => void; onRemove: () => void; allowPdf?: boolean;
}) {
  const c = useColors();
  const imageSource = getImageSource(value);
  const isPdf = !!value && /\.pdf(\?|$)/i.test(value);

  const choose = async () => {
    if (busy) return;
    const handle = async (source: 'camera' | 'gallery' | 'pdf') => {
      const a = source === 'camera' ? await captureImageAsset()
        : source === 'gallery' ? await pickImageAsset()
        : await pickPdfAsset();
      if (a) onPick(a);
    };
    if (Platform.OS === 'web') {
      const buttons: { text: string; onPress?: () => void; style?: 'cancel' }[] = [
        { text: 'المعرض', onPress: () => handle('gallery') },
      ];
      if (allowPdf) buttons.push({ text: 'ملف PDF', onPress: () => handle('pdf') });
      buttons.push({ text: 'إلغاء', style: 'cancel' });
      Alert.alert(label, 'اختر مصدر الملف', buttons);
      return;
    }
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' }[] = [
      { text: 'الكاميرا', onPress: () => handle('camera') },
      { text: 'المعرض', onPress: () => handle('gallery') },
    ];
    if (allowPdf) buttons.push({ text: 'ملف PDF', onPress: () => handle('pdf') });
    buttons.push({ text: 'إلغاء', style: 'cancel' });
    Alert.alert(label, 'اختر مصدر الملف', buttons);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={docS.labelRow}>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={[docS.label, { color: c.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
            {label}{required && <Text style={{ color: c.destructive }}> *</Text>}
          </Text>
          {hint ? <Text style={[docS.hint, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{hint}</Text> : null}
        </View>
        {!!value && (
          <View style={[docS.badge, { backgroundColor: c.success + '18', borderColor: c.success }]}>
            <Ionicons name="checkmark-circle" size={13} color={c.success} />
            <Text style={[docS.badgeText, { color: c.success, fontFamily: 'Cairo_600SemiBold' }]}>تم الرفع</Text>
          </View>
        )}
      </View>

      {busy ? (
        <View style={[docS.area, { backgroundColor: c.muted, borderColor: c.border }]}>
          <ActivityIndicator color={colors.gold} />
          <Text style={[docS.uploadHint, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>جارٍ الرفع...</Text>
        </View>
      ) : value && isPdf ? (
        <View style={[docS.pdfCard, { backgroundColor: c.goldTint, borderColor: colors.gold }]}>
          <View style={[docS.pdfIcon, { backgroundColor: colors.gold }]}>
            <Ionicons name="document-text" size={22} color={colors.umrahGreen} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[docS.pdfName, { color: c.foreground, fontFamily: 'Cairo_600SemiBold' }]} numberOfLines={1}>
              {decodeURIComponent(value.split('/').pop() ?? 'document.pdf')}
            </Text>
            <Text style={[docS.hint, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>ملف PDF</Text>
          </View>
          <Pressable onPress={choose} hitSlop={8} style={[docS.pdfBtn, { backgroundColor: colors.umrahGreen }]}>
            <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={8} style={[docS.pdfBtn, { backgroundColor: c.destructive }]}>
            <Ionicons name="trash" size={15} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : imageSource ? (
        <View style={[docS.imgRow, { backgroundColor: c.muted, borderColor: c.border }]}>
          <Pressable onPress={onRemove} hitSlop={8}><Ionicons name="trash-outline" size={20} color={c.destructive} /></Pressable>
          <Pressable onPress={choose} style={docS.replaceBtn}>
            <Ionicons name="camera-outline" size={16} color={colors.umrahGreen} />
            <Text style={[docS.replaceText, { fontFamily: 'Cairo_600SemiBold' }]}>تغيير</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Image source={imageSource} style={docS.thumb} contentFit="cover" />
        </View>
      ) : (
        <Pressable onPress={choose} style={({ pressed }) => [docS.area, { backgroundColor: c.muted, borderColor: required ? c.destructive + '55' : c.border, opacity: pressed ? 0.85 : 1 }]}>
          <View style={[docS.iconCircle, { backgroundColor: c.goldTint }]}><Ionicons name={icon} size={24} color={colors.gold} /></View>
          <Text style={[docS.uploadTitle, { color: c.foreground, fontFamily: 'Cairo_600SemiBold' }]}>اضغط لرفع الملف</Text>
          <Text style={[docS.uploadHint, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{allowPdf ? 'كاميرا · معرض · PDF' : 'كاميرا · معرض'}</Text>
        </Pressable>
      )}
    </View>
  );
}
const docS = StyleSheet.create({
  labelRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 14, textAlign: 'right' },
  hint: { fontSize: 11.5, textAlign: 'right', marginTop: 1 },
  badge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11 },
  area: { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 8 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 14 },
  uploadHint: { fontSize: 12 },
  pdfCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 16, padding: 14 },
  pdfIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pdfName: { fontSize: 14, textAlign: 'right' },
  pdfBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  imgRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  replaceBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  replaceText: { fontSize: 13, color: colors.umrahGreen },
  thumb: { width: 60, height: 60, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,175,55,0.15)' },
});

// ═══════════════════════════════════════════════════════════════════════════
//  Main screen
// ═══════════════════════════════════════════════════════════════════════════
export default function VisaApplicationWizard() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 16);
  const scroll = useRef<ScrollView>(null);

  const { visaId: visaIdParam } = useLocalSearchParams<{ visaId?: string }>();
  const { user: authUser, accessToken, updateUser } = useAuth();

  const paramVisaId = visaIdParam ? Number(visaIdParam) : null;
  const hasParamVisa = paramVisaId !== null && !Number.isNaN(paramVisaId);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: currentUser, isLoading: userLoading } = useGetCurrentUser({
    query: { enabled: !!authUser, queryKey: getGetCurrentUserQueryKey() },
  });
  const { data: visas, isLoading: visasLoading } = useListVisas(undefined, {
    query: { enabled: !hasParamVisa && !!authUser, queryKey: getListVisasQueryKey(undefined) },
  });
  // When entered via a visaId route param the list isn't fetched, so load the
  // single visa directly to render its price / processing duration.
  const { data: paramVisa } = useGetVisa(paramVisaId ?? 0, {
    query: { enabled: hasParamVisa && !!authUser, queryKey: getGetVisaQueryKey(paramVisaId ?? 0) },
  });

  const ocrMutation = useOcrPassport();
  const updateProfileMutation = useUpdateProfile();
  const createAppMutation = useCreateVisaApplication();

  const navigation = useNavigation();

  // ── Unsaved-data guard state ───────────────────────────────────────────────
  // `dirty` becomes true once the user actually starts entering/editing data
  // (past the visa-selection step). It is force-disabled after a successful
  // submission so the success screen never triggers the warning.
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const markDirty = () => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirty(true);
    }
  };
  // Pending navigation action, held while the "unsaved data" dialog is shown.
  const [leaveDialog, setLeaveDialog] = useState<{ proceed: () => void } | null>(null);

  // ── Local editable profile snapshot (persisted via updateProfile) ─────────
  const [profile, setProfile] = useState<ProfileUpdate>({});
  const setP = (patch: Partial<ProfileUpdate>) => {
    markDirty();
    setProfile((p) => ({ ...p, ...patch }));
  };

  const [selectedVisaId, setSelectedVisaId] = useState<number | null>(hasParamVisa ? paramVisaId : null);

  // Step index — when a visaId param is present we skip the selection step.
  const stepLabels = hasParamVisa ? STEP_LABELS : STEP_LABELS_WITH_VISA;
  const [step, setStep] = useState(0);

  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);

  // Declaration (الإقرار) — the customer must tick it after reading their data.
  const [declared, setDeclared] = useState(false);

  // Deferred-payment notice popup ("ستدفع بعد الموافقة الأولية على التأشيرة").
  const [payNotice, setPayNotice] = useState(false);

  // Profile-gate dialog — shown when the stored profile is incomplete.
  const [gateDialog, setGateDialog] = useState(false);

  // Submit result — success screen renders ONLY from this.
  const [result, setResult] = useState<VisaApplication | null>(null);
  const [submitError, setSubmitError] = useState<{ message: string; profileIncomplete: boolean } | null>(null);

  // Prefill from the freshly-fetched profile.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!currentUser || seededRef.current) return;
    seededRef.current = true;
    setProfile({
      firstName: currentUser.firstName || '',
      lastName: currentUser.lastName || '',
      phone: currentUser.phone || '',
      whatsapp: currentUser.whatsapp || '',
      nationality: currentUser.nationality || '',
      gender: (currentUser.gender as Gender) || 'male',
      dateOfBirth: currentUser.dateOfBirth || '',
      passportNumber: currentUser.passportNumber || '',
      passportIssueDate: currentUser.passportIssueDate || '',
      passportExpiryDate: currentUser.passportExpiryDate || '',
      passportIssueCountry: currentUser.passportIssueCountry || '',
      passportImageUrl: currentUser.passportImageUrl || '',
      profilePhotoUrl: currentUser.profilePhotoUrl || '',
      isGccResident: currentUser.isGccResident || false,
      gccResidenceCountry: currentUser.gccResidenceCountry || '',
      gccResidenceFrontUrl: currentUser.gccResidenceFrontUrl || '',
      gccResidenceBackUrl: currentUser.gccResidenceBackUrl || '',
      isEuropeanResident: currentUser.isEuropeanResident || false,
      europeanDocumentUrl: currentUser.europeanDocumentUrl || '',
    });
  }, [currentUser]);

  // ── PROFILE GATE ───────────────────────────────────────────────────────────
  // The stored profile MUST be complete before the customer may apply. The
  // server enforces this too (422 profileIncomplete), but we gate the UI at
  // entry so no data is ever re-entered. `isProfileComplete` is computed by the
  // server and returned on SafeUser.
  // Drive the gate from the FRESHEST source. On returning from profile-edit the
  // React Query cache is updated (setQueryData there), and AuthContext `user`
  // is also refreshed; treat the profile as complete if EITHER source says so,
  // so a completed profile never re-triggers the gate from stale cache.
  const profileComplete =
    currentUser?.isProfileComplete === true ||
    authUser?.isProfileComplete === true;
  useEffect(() => {
    if (!currentUser) return;
    if (profileComplete) setGateDialog(false); // completed → ensure gate is closed
    else setGateDialog(true); // incomplete → block entry
  }, [currentUser, profileComplete]);

  // Success animation
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (result) {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    }
  }, [result, successScale, successOpacity]);

  const selectedVisa: Visa | undefined = useMemo(
    () => (visas ?? []).find((v) => v.id === selectedVisaId) ?? (paramVisa && paramVisa.id === selectedVisaId ? paramVisa : undefined),
    [visas, selectedVisaId, paramVisa],
  );

  const goToStep = (s: number) => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    setStep(s);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const next = () => goToStep(step + 1);

  // After a successful submission the UNSAVED-DATA guard is disabled, but the
  // success screen BLOCKS all back navigation (hardware back + swipe + browser
  // back) — the only way forward is the two explicit buttons at the bottom.
  const submittedRef = useRef(false);
  const resultRef = useRef(false);
  useEffect(() => {
    if (result) {
      submittedRef.current = true;
      resultRef.current = true;
    }
  }, [result]);

  // ── WEB browser-Back trap for the success screen ───────────────────────────
  // On Expo web, `beforeRemove` cannot stop a real browser Back (it is genuine
  // history navigation, not a router GO_BACK). We arm a history sentinel: push a
  // duplicate same-URL entry, then on every `popstate` re-push it — so Back is a
  // no-op while the success screen is showing. Explicit buttons disarm first
  // (they use router.replace, so any leftover sentinel entry is harmless).
  // Set when the user leaves the success screen via an explicit exit button, so
  // the beforeRemove success-block lets that navigation through.
  const exitRef = useRef(false);
  const disarmWebBackTrapRef = useRef<null | (() => void)>(null);
  const disarmWebBackTrap = useCallback(() => {
    disarmWebBackTrapRef.current?.();
    disarmWebBackTrapRef.current = null;
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web' || !result) return;
    if (typeof window === 'undefined' || !window.history) return;
    if (disarmWebBackTrapRef.current) return; // already armed
    const onPopState = () => {
      // Success screen still showing → immediately cancel the Back by re-pushing.
      if (resultRef.current) window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href); // sentinel entry
    window.addEventListener('popstate', onPopState);
    disarmWebBackTrapRef.current = () => window.removeEventListener('popstate', onPopState);
    return () => disarmWebBackTrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Safely leave the wizard WITHOUT ever dispatching an unhandled GO_BACK.
  // On a fresh deep-load of /umrah-visa there is no back stack, so fall back
  // to replacing with the tabs root.
  const leaveWizard = useCallback(() => {
    dirtyRef.current = false;
    submittedRef.current = true; // let the pending navigation through the safety net
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The first DATA-ENTRY step in UI-step terms. Steps above it are data steps
  // (personal/passport/docs/review/submit); stepping back BETWEEN them retains
  // data and never prompts. Stepping back FROM the first data step would leave
  // the data-entry flow (onto visa-selection, or exit when the visa is a param),
  // so it is treated as an EXIT and guarded when dirty.
  const firstDataStep = hasParamVisa ? 0 : 1;

  // Header back/close control.
  const back = () => {
    // Deep within the wizard (a previous DATA step exists) → plain step-back,
    // data retained, no prompt (spec §3: normal in-wizard back).
    if (step > firstDataStep) { goToStep(step - 1); return; }
    // At the first data step (or the visa-selection step) → back would leave the
    // data-entry flow. Guard when dirty; مغادرة fully exits the wizard route.
    if (dirtyRef.current && !submittedRef.current) {
      setLeaveDialog({ proceed: leaveWizard });
      return;
    }
    if (step > 0) { goToStep(step - 1); return; }        // clean, still in-wizard
    leaveWizard();                                       // clean exit at step 0
  };

  // ── Safety net: OS/browser-level removal (swipe-back, browser back button) ──
  // The header control above is the PRIMARY path. This only catches removals
  // that bypass our button. It preventDefault()s and shows the same dialog; on
  // confirm it re-dispatches the original action (which the navigator produced,
  // so it is guaranteed handleable). It never fabricates a GO_BACK.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: { preventDefault: () => void; data: { action: unknown } }) => {
      // Success screen → fully block back; never leave via OS/browser removal.
      // Exception: the two explicit exit buttons set `exitRef` before navigating.
      if (resultRef.current) {
        if (!exitRef.current) e.preventDefault();
        return;
      }
      if (!dirtyRef.current || submittedRef.current) return; // allow when clean/submitted
      e.preventDefault();
      const action = e.data.action;
      setLeaveDialog({
        proceed: () => {
          setLeaveDialog(null);
          dirtyRef.current = false;
          submittedRef.current = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigation.dispatch(action as any);
        },
      });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, dirty]);

  // Android hardware back inside the wizard: step-back for sub-steps; at step 0
  // route through the same explicit exit logic (dirty → dialog, clean → leave).
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      const onBackPress = () => {
        // Success screen → fully block hardware back.
        if (resultRef.current) return true;
        // Deep within the wizard → plain step-back, no prompt.
        if (step > firstDataStep) { goToStep(step - 1); return true; }
        // First data step (or visa-selection) → guard when dirty.
        if (dirtyRef.current && !submittedRef.current) {
          setLeaveDialog({ proceed: leaveWizard });
          return true;
        }
        if (step > 0) { goToStep(step - 1); return true; } // clean, in-wizard
        return false; // clean at step 0 → let default removal proceed
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, leaveWizard]),
  );

  // Logical step accessor (0=visa selection, 1=data+declaration, 2=confirm).
  // When a param visa exists the visa step is removed, so shift indices by +1.
  const logical = hasParamVisa ? step + 1 : step;

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (lstep: number): boolean => {
    if (lstep === 0) {
      if (!selectedVisaId) { Alert.alert('اختر تأشيرة', 'يرجى اختيار التأشيرة التي ترغب بالتقديم عليها'); return false; }
      return true;
    }
    if (lstep === 1) {
      // Profile is guaranteed complete by the gate; only the declaration matters.
      if (!declared) { Alert.alert('الإقرار مطلوب', 'يرجى قراءة بياناتك والموافقة على الإقرار قبل المتابعة'); return false; }
      return true;
    }
    return true;
  };

  const handleNext = async () => {
    // Hard profile gate — never advance past visa selection with an incomplete
    // profile (server enforces too, but we stop it here to avoid re-entry).
    if (currentUser && !profileComplete) { setGateDialog(true); return; }
    if (!validate(logical)) return;
    next();
  };

  // ── OCR passport scan → prefill profile fields ─────────────────────────────
  const handlePassportScan = async (a: DocPicked) => {
    setBusyDoc('passport');
    setOcrDone(false);
    const objectPath = await uploadToStorage(a.uri, accessToken, a.name, a.mimeType);
    setBusyDoc(null);
    if (!objectPath) {
      Alert.alert('خطأ في الرفع', 'تعذّر رفع صورة الجواز.');
      return;
    }
    setP({ passportImageUrl: objectPath });
    if (a.isPdf) return; // OCR only for images
    setOcrRunning(true);
    try {
      const ocr = await ocrMutation.mutateAsync({ data: { imageUrl: objectPath } });
      if (ocr.success) {
        setProfile((p) => ({
          ...p,
          passportImageUrl: objectPath,
          ...(ocr.firstName && !p.firstName ? { firstName: ocr.firstName } : {}),
          ...(ocr.lastName && !p.lastName ? { lastName: ocr.lastName } : {}),
          ...(ocr.passportNumber ? { passportNumber: ocr.passportNumber } : {}),
          ...(ocr.nationality ? { nationality: ocr.nationality } : {}),
          ...(ocr.dateOfBirth ? { dateOfBirth: ocr.dateOfBirth } : {}),
          ...(ocr.issueDate ? { passportIssueDate: ocr.issueDate } : {}),
          ...(ocr.expiryDate ? { passportExpiryDate: ocr.expiryDate } : {}),
          ...(ocr.gender ? { gender: (ocr.gender === 'M' || ocr.gender.toLowerCase() === 'male' ? 'male' : 'female') as Gender } : {}),
        }));
        setOcrDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setOcrDone(true);
        Alert.alert('تنبيه', 'لم نتمكن من قراءة الجواز بالكامل. يرجى مراجعة البيانات وإكمالها يدوياً.');
      }
    } catch {
      setOcrDone(true);
      Alert.alert('تعذر المسح', 'يمكنك إدخال بيانات الجواز يدوياً.');
    } finally {
      setOcrRunning(false);
    }
  };

  // ── Upload a document straight into a profile field ────────────────────────
  const uploadDoc = async (key: keyof ProfileUpdate, a: DocPicked) => {
    setBusyDoc(String(key));
    const objectPath = await uploadToStorage(a.uri, accessToken, a.name, a.mimeType);
    setBusyDoc(null);
    if (!objectPath) { Alert.alert('خطأ في الرفع', 'تعذّر رفع الملف.'); return; }
    setP({ [key]: objectPath } as Partial<ProfileUpdate>);
  };

  // ── Submit — only the real visaId + agreedToTerms. Server rebuilds the whole
  // application record from the STORED profile (no re-entry). TS still requires
  // the personal fields on the request body; we source them from the stored
  // profile snapshot (currentUser) — the server ignores them regardless.
  const submitApplication = () => {
    if (!selectedVisaId) { Alert.alert('اختر تأشيرة', 'يرجى اختيار التأشيرة'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitError(null);

    const fullName = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim();
    createAppMutation.mutate(
      {
        data: {
          visaId: selectedVisaId,
          agreedToTerms: true,
          fullName,
          nationality: currentUser?.nationality ?? '',
          gender: (currentUser?.gender as Gender) ?? 'male',
          dateOfBirth: currentUser?.dateOfBirth ?? '',
          email: currentUser?.email ?? '',
          phone: currentUser?.phone ?? '',
          passportNumber: currentUser?.passportNumber ?? '',
          passportIssueDate: currentUser?.passportIssueDate ?? '',
          passportExpiryDate: currentUser?.passportExpiryDate ?? '',
        },
      },
      {
        onSuccess: (res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Arm the back-blocking refs SYNCHRONOUSLY (before the state commit)
          // so a back gesture landing in the same tick is already blocked; the
          // effect on `result` is now just a backstop.
          submittedRef.current = true;
          resultRef.current = true;
          setResult(res);
        },
        onError: (err) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          let message = 'تعذّر تقديم الطلب. يرجى المحاولة لاحقاً.';
          let profileIncomplete = false;
          if (err instanceof ApiError) {
            const data = err.data as { error?: string; profileIncomplete?: boolean } | null;
            if (data?.error) message = data.error;
            profileIncomplete = !!data?.profileIncomplete;
          }
          setSubmitError({ message, profileIncomplete });
        },
      },
    );
  };

  // Confirm-step primary action. If the visa had an immediate payment flow we
  // would branch to it here; today no immediate payment exists for visas, so we
  // show the deferred-payment notice popup then submit on "موافق".
  const hasImmediatePayment = false; // no immediate visa payment flow exists yet
  const handleConfirm = () => {
    if (!selectedVisaId) { Alert.alert('اختر تأشيرة', 'يرجى اختيار التأشيرة'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (hasImmediatePayment) {
      // Future: route to the existing payment flow here.
      submitApplication();
      return;
    }
    setPayNotice(true);
  };

  // ── Shared small components ─────────────────────────────────────────────────
  const NextButton = ({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) => (
    <Pressable style={({ pressed }) => [styles.nextBtn, { opacity: pressed || loading ? 0.85 : 1 }]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={colors.umrahGreen} /> : (
        <>
          <Text style={[styles.nextBtnText, { fontFamily: 'Cairo_700Bold' }]}>{label}</Text>
          <Ionicons name="arrow-back" size={20} color={colors.umrahGreen} />
        </>
      )}
    </Pressable>
  );
  const StepHead = ({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) => (
    <View style={styles.stepHead}>
      <View style={[styles.stepHeadIcon, { backgroundColor: c.goldTint }]}><Ionicons name={icon} size={22} color={colors.gold} /></View>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={[styles.stepTitle, { color: c.foreground, fontFamily: 'Cairo_700Bold' }]}>{title}</Text>
        <Text style={[styles.stepSub, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{sub}</Text>
      </View>
    </View>
  );

  // ── Step renderers keyed by LOGICAL step ────────────────────────────────────
  const renderVisaSelect = () => {
    const activeVisas = (visas ?? []).filter((v) => v.isActive && v.status === 'available');
    // Umrah category first, then the rest — matches this screen's original intent.
    const sorted = [...activeVisas].sort((a, b) => {
      const au = a.category === 'umrah' ? 0 : 1;
      const bu = b.category === 'umrah' ? 0 : 1;
      return au - bu || a.countryAr.localeCompare(b.countryAr);
    });
    return (
      <View style={styles.stepWrap}>
        <StepHead icon="airplane-outline" title="اختر التأشيرة" sub="حدد نوع التأشيرة التي ترغب بالتقديم عليها" />
        {visasLoading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 30 }} />
        ) : sorted.length === 0 ? (
          <Text style={[styles.stepSub, { color: c.mutedForeground, fontFamily: 'Cairo_600SemiBold', textAlign: 'center', marginTop: 20 }]}>
            لا توجد تأشيرات متاحة حالياً
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {sorted.map((v) => {
              const active = selectedVisaId === v.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => { setSelectedVisaId(v.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.visaCard, { backgroundColor: c.card, borderColor: active ? colors.gold : c.border }]}
                >
                  <View style={[styles.visaRadio, { borderColor: active ? colors.gold : c.border, backgroundColor: active ? colors.gold : 'transparent' }]}>
                    {active && <Ionicons name="checkmark" size={14} color={colors.umrahGreen} />}
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={[styles.visaTitle, { color: c.foreground, fontFamily: 'Cairo_700Bold' }]}>{v.countryAr} — {v.visaType}</Text>
                    <Text style={[styles.visaMeta, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                      {v.fee} {v.currency} · {v.processingDays} أيام عمل
                    </Text>
                  </View>
                  <Text style={styles.visaFlag}>{v.countryCode || '🌍'}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        <NextButton label="التالي" onPress={handleNext} />
      </View>
    );
  };

  // ── Read-only "بطاقة بياناتي" row ──────────────────────────────────────────
  const DataRow = ({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) =>
    value ? (
      <View style={[styles.reviewRow, { borderBottomColor: c.border }]}>
        <Text style={[styles.reviewVal, { color: c.foreground, fontFamily: 'Cairo_600SemiBold', textAlign: ltr ? 'left' : 'right', writingDirection: ltr ? 'ltr' : 'rtl' }]}>{value}</Text>
        <Text style={[styles.reviewKey, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{label}</Text>
      </View>
    ) : null;

  // ── STEP 1: visa details + بطاقة بياناتي (read-only) + الإقرار ──────────────
  const renderDataStep = () => {
    const u = currentUser;
    const fullName = `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();
    const docs: [string, boolean][] = [
      ['جواز السفر', !!u?.passportImageUrl],
      ['الصورة الشخصية', !!u?.profilePhotoUrl],
      ...(u?.isGccResident ? ([['الإقامة الخليجية', !!u?.gccResidenceFrontUrl]] as [string, boolean][]) : []),
      ...(u?.isEuropeanResident ? ([['الوثيقة الأوروبية / شنغن', !!u?.europeanDocumentUrl]] as [string, boolean][]) : []),
    ];
    return (
      <View style={styles.stepWrap}>
        <StepHead icon="airplane-outline" title="بيانات التأشيرة" sub="راجع تفاصيل التأشيرة وبياناتك المحفوظة ثم وافق على الإقرار" />

        {/* Visa details: price + processing duration */}
        <View style={[styles.visaDetailCard, { backgroundColor: c.goldTint, borderColor: colors.gold }]}>
          <View style={styles.visaDetailHead}>
            <View style={[styles.visaDetailIcon, { backgroundColor: colors.gold }]}>
              <Ionicons name="ribbon-outline" size={22} color={colors.umrahGreen} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.visaDetailTitle, { color: c.foreground, fontFamily: 'Cairo_700Bold' }]}>
                {selectedVisa ? `${selectedVisa.countryAr} — ${selectedVisa.visaType}` : 'طلب تأشيرة'}
              </Text>
              {selectedVisa?.entryType ? (
                <Text style={[styles.visaDetailSub, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                  {selectedVisa.entryType === 'single' ? 'دخول مرة واحدة' : selectedVisa.entryType === 'multiple' ? 'دخول متعدد' : selectedVisa.entryType}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.visaDetailStats}>
            <View style={[styles.visaStat, { backgroundColor: c.card, borderColor: colors.gold + '55' }]}>
              <Text style={[styles.visaStatLabel, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>الرسوم</Text>
              <Text style={[styles.visaStatValue, { color: colors.gold, fontFamily: 'Cairo_700Bold' }]}>
                {selectedVisa ? `${selectedVisa.fee} ${selectedVisa.currency}` : '—'}
              </Text>
            </View>
            <View style={[styles.visaStat, { backgroundColor: c.card, borderColor: colors.gold + '55' }]}>
              <Text style={[styles.visaStatLabel, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>مدة المعالجة</Text>
              <Text style={[styles.visaStatValue, { color: c.foreground, fontFamily: 'Cairo_700Bold' }]}>
                {selectedVisa ? `${selectedVisa.processingDays} أيام عمل` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* بطاقة بياناتي — read-only, pulled from the stored profile */}
        <View style={[styles.reviewCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.reviewHeader}>
            <Pressable onPress={() => router.push('/profile-edit' as never)} hitSlop={8} style={styles.editLink}>
              <Ionicons name="create-outline" size={15} color={colors.gold} />
              <Text style={[styles.editLinkText, { fontFamily: 'Cairo_600SemiBold' }]}>تعديل الملف</Text>
            </Pressable>
            <View style={styles.reviewHeaderRight}>
              <Text style={[styles.reviewCardTitle, { color: c.foreground, fontFamily: 'Cairo_700Bold' }]}>بطاقة بياناتي</Text>
              <Ionicons name="id-card-outline" size={20} color={colors.gold} />
            </View>
          </View>
          <Text style={[styles.dataCardHint, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            بيانات طلبك مأخوذة من ملفك الشخصي — لا حاجة لإعادة إدخالها.
          </Text>
          <DataRow label="الاسم الكامل" value={fullName} />
          <DataRow label="الجنسية" value={u?.nationality} />
          <DataRow label="الجنس" value={u?.gender ? (u.gender === 'female' ? 'أنثى' : 'ذكر') : ''} />
          <DataRow label="تاريخ الميلاد" value={u?.dateOfBirth} ltr />
          <DataRow label="رقم الجوال" value={u?.phone} ltr />
          <DataRow label="البريد الإلكتروني" value={u?.email} ltr />
          <DataRow label="رقم جواز السفر" value={u?.passportNumber} ltr />
          <DataRow label="تاريخ إصدار الجواز" value={u?.passportIssueDate} ltr />
          <DataRow label="تاريخ انتهاء الجواز" value={u?.passportExpiryDate} ltr />
          <DataRow label="دولة إصدار الجواز" value={u?.passportIssueCountry} />
          {u?.isGccResident ? <DataRow label="الإقامة الخليجية" value={u?.gccResidenceCountry} /> : null}

          {/* Uploaded documents summary (upload logic lives in the profile) */}
          <View style={[styles.dataDocsWrap, { borderTopColor: c.border }]}>
            <Text style={[styles.dataDocsTitle, { color: c.foreground, fontFamily: 'Cairo_600SemiBold' }]}>المستندات المرفقة</Text>
            {docs.map(([k, ok]) => (
              <View key={k} style={styles.reviewRow}>
                <View style={styles.dataDocBadge}>
                  <Ionicons name={ok ? 'checkmark-circle' : 'remove-circle-outline'} size={16} color={ok ? c.success : c.mutedForeground} />
                  <Text style={[styles.reviewVal, { color: ok ? c.success : c.mutedForeground, fontFamily: 'Cairo_600SemiBold', flex: 0 }]}>{ok ? 'مرفق' : 'غير مرفق'}</Text>
                </View>
                <Text style={[styles.reviewKey, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{k}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* الإقرار — declaration checkbox */}
        <Pressable
          onPress={() => { markDirty(); setDeclared((d) => !d); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.declareRow, { backgroundColor: c.card, borderColor: declared ? colors.gold : c.border }]}
        >
          <View style={[styles.declareBox, { borderColor: declared ? colors.gold : c.border, backgroundColor: declared ? colors.gold : 'transparent' }]}>
            {declared && <Ionicons name="checkmark" size={16} color={colors.umrahGreen} />}
          </View>
          <Text style={[styles.declareText, { color: c.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
            أقر بأنني راجعت بياناتي أعلاه وأنها صحيحة وكاملة، وأتحمل مسؤولية صحتها.
          </Text>
        </Pressable>

        <NextButton label="متابعة" onPress={handleNext} />
      </View>
    );
  };

  // ── STEP 2: confirm & submit ────────────────────────────────────────────────
  const renderSubmit = () => (
    <View style={styles.stepWrap}>
      <StepHead icon="send-outline" title="تأكيد الطلب" sub="بالضغط على تأكيد أنت تقر بصحة جميع البيانات وترسل طلبك" />

      <View style={[styles.summaryCard, { backgroundColor: c.goldTint, borderColor: colors.gold }]}>
        <Ionicons name="shield-checkmark-outline" size={30} color={colors.gold} />
        <Text style={[styles.summaryTitle, { color: c.foreground, fontFamily: 'Cairo_700Bold' }]}>
          {selectedVisa ? `${selectedVisa.countryAr} — ${selectedVisa.visaType}` : 'طلب تأشيرة'}
        </Text>
        <Text style={[styles.summaryName, { color: c.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
          {`${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'المتقدم'}
        </Text>
        {selectedVisa ? (
          <Text style={[styles.summaryName, { color: colors.gold, fontFamily: 'Cairo_700Bold' }]}>
            {`الرسوم: ${selectedVisa.fee} ${selectedVisa.currency}`}
          </Text>
        ) : null}
        <View style={[styles.divider, { backgroundColor: colors.gold + '40' }]} />
        <Text style={[styles.summaryNote, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
          سيتم مراجعة طلبك وستتلقى إشعاراً بأي تحديث على حالته.
        </Text>
      </View>

      {submitError && (
        <View style={[styles.errorBox, { backgroundColor: c.destructive + '14', borderColor: c.destructive + '66' }]}>
          <View style={styles.errorHead}>
            <Ionicons name="alert-circle" size={20} color={c.destructive} />
            <Text style={[styles.errorTitle, { color: c.destructive, fontFamily: 'Cairo_700Bold' }]}>
              {submitError.profileIncomplete ? 'ملفك الشخصي غير مكتمل' : 'تعذّر تقديم الطلب'}
            </Text>
          </View>
          <Text style={[styles.errorMsg, { color: c.foreground, fontFamily: 'Cairo_400Regular' }]}>{submitError.message}</Text>
          {submitError.profileIncomplete && (
            <Pressable
              style={({ pressed }) => [styles.errorCta, { backgroundColor: colors.umrahGreen, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push('/profile-edit' as never)}
            >
              <Ionicons name="person-outline" size={16} color="#FFFFFF" />
              <Text style={[styles.errorCtaText, { fontFamily: 'Cairo_700Bold' }]}>إكمال الملف الشخصي</Text>
            </Pressable>
          )}
        </View>
      )}

      <NextButton label="تأكيد وإرسال الطلب" onPress={handleConfirm} loading={createAppMutation.isPending} />
      <Pressable style={styles.secondaryBtn} onPress={back}>
        <Text style={[styles.secondaryBtnText, { color: c.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>العودة</Text>
      </Pressable>
    </View>
  );

  const renderStep = () => {
    switch (logical) {
      case 0: return renderVisaSelect();
      case 1: return renderDataStep();
      case 2: return renderSubmit();
      default: return null;
    }
  };

  // ── Guests must log in ──────────────────────────────────────────────────────
  if (!authUser) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <LinearGradient colors={['#042D1C', colors.umrahGreen]} style={[styles.header, { paddingTop: topInset + 8, paddingBottom: 16 }]}>
          <View style={styles.headerTop}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}><Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.85)" /></Pressable>
            <View style={styles.headerCenter}><Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>طلب تأشيرة</Text></View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.guestWrap}>
          <View style={[styles.guestIcon, { backgroundColor: c.goldTint }]}><Ionicons name="lock-closed-outline" size={44} color={colors.gold} /></View>
          <Text style={[styles.guestTitle, { color: c.foreground, fontFamily: 'Cairo_700Bold' }]}>تسجيل الدخول مطلوب</Text>
          <Text style={[styles.guestSub, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            يجب تسجيل الدخول لإكمال طلب التأشيرة ومتابعة حالته لاحقاً.
          </Text>
          <Pressable style={({ pressed }) => [styles.nextBtn, { width: '100%', opacity: pressed ? 0.85 : 1 }]} onPress={() => router.push('/auth/login' as never)}>
            <Text style={[styles.nextBtnText, { fontFamily: 'Cairo_700Bold' }]}>تسجيل الدخول</Text>
            <Ionicons name="log-in-outline" size={20} color={colors.umrahGreen} />
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Success screen — renders ONLY from the API response ─────────────────────
  if (result) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <LinearGradient colors={['#042D1C', colors.umrahGreen]} style={[styles.header, { paddingTop: topInset + 8, paddingBottom: 16 }]}>
          <View style={styles.headerTop}>
            <View style={{ width: 40 }} />
            <View style={styles.headerCenter}><Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>تأكيد الطلب</Text></View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: bottomInset + 40, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ transform: [{ scale: successScale }], opacity: successOpacity, alignItems: 'center', width: '100%' }}>
            <View style={[styles.successIcon, { backgroundColor: c.success + '20', borderColor: c.success + '66' }]}>
              <Ionicons name="checkmark-circle" size={72} color={c.success} />
            </View>
            <Text style={[styles.successTitle, { color: c.foreground, fontFamily: 'Cairo_700Bold' }]}>تم تقديم طلبك بنجاح</Text>
            <Text style={[styles.successSub, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
              احتفظ برقم التتبع لمتابعة حالة طلبك في أي وقت
            </Text>

            <View style={[styles.refCard, { backgroundColor: c.card, borderColor: colors.gold + '66' }]}>
              <Text style={[styles.refLabel, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>رقم التتبع</Text>
              <Text style={[styles.refValue, { color: colors.gold, fontFamily: 'Cairo_700Bold' }]}>
                {result.trackingNumber ?? `#${result.id}`}
              </Text>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <View style={styles.refRow}>
                <Text style={[styles.refRowVal, { color: c.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{result.fullName || 'المتقدم'}</Text>
                <Text style={[styles.refRowKey, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>اسم المتقدم</Text>
              </View>
              {selectedVisa ? (
                <View style={styles.refRow}>
                  <Text style={[styles.refRowVal, { color: c.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{`${selectedVisa.countryAr} — ${selectedVisa.visaType}`}</Text>
                  <Text style={[styles.refRowKey, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>التأشيرة</Text>
                </View>
              ) : null}
              {selectedVisa ? (
                <View style={styles.refRow}>
                  <Text style={[styles.refRowVal, { color: colors.gold, fontFamily: 'Cairo_700Bold' }]}>{`${selectedVisa.fee} ${selectedVisa.currency}`}</Text>
                  <Text style={[styles.refRowKey, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>المبلغ</Text>
                </View>
              ) : null}
              <View style={styles.refRow}>
                <View style={[styles.statusBadge, { backgroundColor: colors.gold + '22' }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.gold, fontFamily: 'Cairo_700Bold' }]}>قيد المراجعة</Text>
                </View>
                <Text style={[styles.refRowKey, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>حالة الطلب</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.nextBtn, { width: '100%', opacity: pressed ? 0.85 : 1 }]}
              onPress={() => { exitRef.current = true; disarmWebBackTrap(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.replace(`/visa-tracking/${result.id}` as never); }}
            >
              <Text style={[styles.nextBtnText, { fontFamily: 'Cairo_700Bold' }]}>عرض الطلب</Text>
              <Ionicons name="document-text-outline" size={20} color={colors.umrahGreen} />
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => { exitRef.current = true; disarmWebBackTrap(); router.replace('/(tabs)/' as never); }}>
              <Ionicons name="home-outline" size={18} color={c.mutedForeground} />
              <Text style={[styles.secondaryBtnText, { color: c.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>العودة للرئيسية</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ── Wizard shell ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient colors={['#042D1C', colors.umrahGreen]} style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backBtn} onPress={back}><Ionicons name="arrow-forward" size={22} color="rgba(255,255,255,0.85)" /></Pressable>
          <View style={styles.headerCenter}>
            <Ionicons name="document-text-outline" size={18} color={colors.gold} />
            <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>طلب تأشيرة</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <WizardStepper steps={stepLabels} current={step} />
      </LinearGradient>

      {userLoading && !seededRef.current ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, paddingBottom: bottomInset + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {renderStep()}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <ConfirmDialog
        visible={!!leaveDialog}
        icon="warning-outline"
        confirmStyle="destructive"
        title="لديك بيانات غير محفوظة"
        message="إذا غادرت الآن، قد تفقد البيانات التي أدخلتها."
        cancelLabel="البقاء وإكمال الطلب"
        confirmLabel="مغادرة الصفحة"
        onCancel={() => setLeaveDialog(null)}
        onConfirm={() => {
          const proceed = leaveDialog?.proceed;
          setLeaveDialog(null);
          proceed?.();
        }}
      />

      {/* PROFILE GATE — the customer cannot apply until the profile is complete. */}
      <ConfirmDialog
        visible={gateDialog}
        icon="person-circle-outline"
        confirmStyle="brand"
        title="أكمل ملفك الشخصي أولاً"
        message="لا يمكنك التقديم على تأشيرة قبل استكمال بيانات ملفك الشخصي (البيانات الشخصية، الجواز، والمستندات). أكمل ملفك ثم عد للتقديم."
        cancelLabel="رجوع"
        confirmLabel="إكمال الملف الشخصي"
        onCancel={() => { setGateDialog(false); leaveWizard(); }}
        onConfirm={() => { setGateDialog(false); router.replace('/profile-edit' as never); }}
      />

      {/* DEFERRED-PAYMENT NOTICE — shown when there is no immediate payment flow. */}
      <ConfirmDialog
        visible={payNotice}
        icon="card-outline"
        confirmStyle="brand"
        title="الدفع بعد الموافقة المبدئية"
        message={
          selectedVisa
            ? `ستدفع بعد الموافقة الأولية على التأشيرة.\nقيمة الرسوم: ${selectedVisa.fee} ${selectedVisa.currency}`
            : 'ستدفع بعد الموافقة الأولية على التأشيرة.'
        }
        cancelLabel="إلغاء"
        confirmLabel="موافق"
        onCancel={() => setPayNotice(false)}
        onConfirm={() => { setPayNotice(false); submitApplication(); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 4 },
  headerTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, color: '#FFFFFF' },

  stepWrap: { gap: 18 },
  stepHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  stepHeadIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 20, textAlign: 'right' },
  stepSub: { fontSize: 13, textAlign: 'right', marginTop: 2, lineHeight: 19 },

  fields: { gap: 14 },
  genderRow: { flexDirection: 'row-reverse', gap: 10 },
  genderBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 13, alignItems: 'center' },
  genderText: { fontSize: 15 },

  // Visa selection
  visaCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 14 },
  visaRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  visaTitle: { fontSize: 15, textAlign: 'right' },
  visaMeta: { fontSize: 12.5, textAlign: 'right', marginTop: 2 },
  visaFlag: { fontSize: 26 },

  // Buttons
  nextBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 16, paddingVertical: 16, gap: 10, marginTop: 4 },
  nextBtnText: { fontSize: 16, color: colors.umrahGreen },
  secondaryBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  secondaryBtnText: { fontSize: 14 },

  // OCR scan
  scanCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  ocrBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, borderWidth: 1 },
  ocrText: { fontSize: 13, flex: 1, textAlign: 'right' },

  // Review / data card
  reviewCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 4 },
  reviewHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  reviewHeaderRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  reviewCardTitle: { fontSize: 15 },
  reviewRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  reviewKey: { fontSize: 13 },
  reviewVal: { fontSize: 14, flex: 1, textAlign: 'left', marginLeft: 12 },
  editLink: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  editLinkText: { fontSize: 13, color: colors.gold },
  dataCardHint: { fontSize: 12.5, textAlign: 'right', lineHeight: 19, marginBottom: 6 },
  dataDocsWrap: { borderTopWidth: 1, marginTop: 8, paddingTop: 10, gap: 2 },
  dataDocsTitle: { fontSize: 14, textAlign: 'right', marginBottom: 4 },
  dataDocBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },

  // Visa details card
  visaDetailCard: { borderRadius: 18, borderWidth: 1.5, padding: 18, gap: 14 },
  visaDetailHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  visaDetailIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  visaDetailTitle: { fontSize: 17, textAlign: 'right' },
  visaDetailSub: { fontSize: 12.5, textAlign: 'right', marginTop: 2 },
  visaDetailStats: { flexDirection: 'row-reverse', gap: 10 },
  visaStat: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 4 },
  visaStatLabel: { fontSize: 12 },
  visaStatValue: { fontSize: 15, textAlign: 'center' },

  // Declaration (الإقرار)
  declareRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 16 },
  declareBox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  declareText: { flex: 1, fontSize: 13.5, textAlign: 'right', lineHeight: 21 },

  // Submit summary
  summaryCard: { borderRadius: 18, borderWidth: 1.5, padding: 22, alignItems: 'center', gap: 8 },
  summaryTitle: { fontSize: 18, textAlign: 'center' },
  summaryName: { fontSize: 14, textAlign: 'center' },
  summaryNote: { fontSize: 13, textAlign: 'center', lineHeight: 21 },
  divider: { width: '100%', height: 1, marginVertical: 8 },

  // Error box
  errorBox: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  errorHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  errorTitle: { fontSize: 15, textAlign: 'right' },
  errorMsg: { fontSize: 13.5, textAlign: 'right', lineHeight: 21 },
  errorCta: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12 },
  errorCtaText: { color: '#FFFFFF', fontSize: 14 },

  // Guest
  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  guestIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  guestTitle: { fontSize: 22, textAlign: 'center' },
  guestSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 12 },

  // Success
  successIcon: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 16, marginTop: 8 },
  successTitle: { fontSize: 24, textAlign: 'center' },
  successSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 8 },
  refCard: { width: '100%', borderRadius: 20, borderWidth: 1.5, padding: 22, gap: 12, marginVertical: 16 },
  refLabel: { fontSize: 13, textAlign: 'center' },
  refValue: { fontSize: 26, textAlign: 'center', letterSpacing: 1, writingDirection: 'ltr' },
  refRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  refRowKey: { fontSize: 13 },
  refRowVal: { fontSize: 14 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { fontSize: 13 },
});
