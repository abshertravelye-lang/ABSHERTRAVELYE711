import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getDialCode } from '@workspace/countries';
import { useColors } from '@/hooks/useColors';
import { useRegisterUser } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CountryDialPicker } from '@/components/CountryDialPicker';

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuth();
  const { t, writingDirection } = useLanguage();
  const registerMutation = useRegisterUser();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [dialCountry, setDialCountry] = useState('SA');
  const [showPass, setShowPass] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const buildFullPhone = () => {
    const local = form.phone.replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (!local) return undefined;
    const dial = getDialCode(dialCountry) || '+966';
    return `${dial}${local}`;
  };

  const handleRegister = () => {
    const fullPhone = buildFullPhone();
    if (!form.email && !fullPhone) { Alert.alert(t('register.missingTitle'), t('register.missingContact')); return; }
    if (!form.password) { Alert.alert(t('register.missingTitle'), t('register.missingPassword')); return; }
    if (form.password !== form.confirmPassword) { Alert.alert(t('register.errorTitle'), t('register.passwordMismatch')); return; }
    if (form.password.length < 8) { Alert.alert(t('register.errorTitle'), t('register.passwordShort')); return; }

    registerMutation.mutate(
      { data: { email: form.email || undefined, phone: fullPhone, password: form.password, firstName: form.firstName || undefined, lastName: form.lastName || undefined } },
      {
        onSuccess: async (res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await setAuth(res);
          router.back();
        },
        onError: () => Alert.alert(t('register.errorTitle'), t('register.errorBody')),
      }
    );
  };

  const renderField = (
    label: string,
    fkey: keyof typeof form,
    placeholder: string,
    opts?: { keyboardType?: 'default' | 'email-address' | 'phone-pad'; secure?: boolean },
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold', writingDirection }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <TextInput
          value={form[fkey]}
          onChangeText={(v) => set(fkey, v)}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={opts?.keyboardType || 'default'}
          autoCapitalize="none"
          secureTextEntry={opts?.secure && !showPass}
          style={[styles.input, { color: colors.foreground, fontFamily: 'Cairo_400Regular', writingDirection }]}
        />
        {opts?.secure && (
          <Pressable onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#071525', '#0A2342', '#163354']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.9)" />
            </Pressable>
            <LanguageToggle variant="light" />
          </View>
          <View style={styles.headerContent}>
            <View style={styles.logoWrap}>
              <Image
                source={require('@/assets/images/absher-logo-transparent.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <Text style={[styles.brandTitle, { fontFamily: 'Cairo_700Bold' }]}>{t('auth.brand')}</Text>
            <Text style={[styles.title, { fontFamily: 'Cairo_700Bold' }]}>{t('register.title')}</Text>
          </View>
        </LinearGradient>

        <View style={[styles.form, { backgroundColor: colors.card }]}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              {renderField(t('register.lastName'), 'lastName', t('register.lastNamePlaceholder'))}
            </View>
            <View style={{ flex: 1 }}>
              {renderField(t('register.firstName'), 'firstName', t('register.firstNamePlaceholder'))}
            </View>
          </View>

          {renderField(t('register.email'), 'email', t('register.emailPlaceholder'), { keyboardType: 'email-address' })}

          {/* Phone with international dial code */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold', writingDirection }]}>{t('register.phone')}</Text>
            <View style={[styles.inputRow, styles.phoneRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={form.phone}
                onChangeText={(v) => set('phone', v)}
                placeholder={t('register.phonePlaceholder')}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                style={[styles.input, styles.phoneInput, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
              />
              <CountryDialPicker value={dialCountry} onChange={setDialCountry} />
            </View>
          </View>

          {renderField(t('register.password'), 'password', t('register.passwordPlaceholder'), { secure: true })}
          {renderField(t('register.confirmPassword'), 'confirmPassword', t('register.confirmPasswordPlaceholder'), { secure: true })}

          <Pressable
            style={({ pressed }) => [
              styles.registerBtn,
              { backgroundColor: colors.primary, opacity: pressed || registerMutation.isPending ? 0.85 : 1 }
            ]}
            onPress={handleRegister}
            disabled={registerMutation.isPending}
          >
            <Text style={[styles.registerBtnText, { fontFamily: 'Cairo_700Bold' }]}>
              {registerMutation.isPending ? t('register.submitting') : t('register.submit')}
            </Text>
          </Pressable>

          <View style={styles.loginRow}>
            <Pressable onPress={() => router.replace('/auth/login')}>
              <Text style={[styles.loginLink, { color: colors.secondary, fontFamily: 'Cairo_600SemiBold' }]}>{t('register.login')}</Text>
            </Pressable>
            <Text style={[styles.loginHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{t('register.haveAccount')}</Text>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  closeBtn: { padding: 2 },
  headerContent: { alignItems: 'center', gap: 6 },
  logoWrap: { width: 170, height: 66, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 170, height: 66 },
  brandTitle: { fontSize: 18, color: '#D4AF37', letterSpacing: 1, marginTop: 4 },
  title: { fontSize: 20, color: '#FFFFFF', marginTop: 8 },
  form: { padding: 20, gap: 16, marginTop: -22, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#0A2342', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
  nameRow: { flexDirection: 'row', gap: 12 },
  field: { gap: 7 },
  label: { fontSize: 14, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  phoneRow: { paddingHorizontal: 8, paddingVertical: Platform.OS === 'ios' ? 12 : 4 },
  input: { flex: 1, fontSize: 15, textAlign: 'right' },
  phoneInput: { paddingHorizontal: 8, textAlign: 'left', writingDirection: 'ltr' },
  registerBtn: { borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 14, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  registerBtnText: { color: '#FFFFFF', fontSize: 17 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 },
  loginHint: { fontSize: 14 },
  loginLink: { fontSize: 14 },
});
