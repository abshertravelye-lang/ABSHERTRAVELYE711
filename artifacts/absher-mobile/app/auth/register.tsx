import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useRegisterUser } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuth();
  const registerMutation = useRegisterUser();

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = () => {
    if (!form.email && !form.phone) { Alert.alert('بيانات ناقصة', 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف'); return; }
    if (!form.password) { Alert.alert('بيانات ناقصة', 'يرجى إدخال كلمة المرور'); return; }
    if (form.password !== form.confirmPassword) { Alert.alert('خطأ', 'كلمة المرور غير متطابقة'); return; }
    if (form.password.length < 8) { Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }

    registerMutation.mutate(
      { data: { email: form.email || undefined, phone: form.phone || undefined, password: form.password, firstName: form.firstName || undefined, lastName: form.lastName || undefined } },
      {
        onSuccess: async (res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await setAuth(res);
          router.back();
        },
        onError: () => Alert.alert('خطأ', 'فشل إنشاء الحساب، ربما البريد الإلكتروني مسجل مسبقاً'),
      }
    );
  };

  const Field = ({ label, fkey, placeholder, keyboardType, secure }: { label: string; fkey: keyof typeof form; placeholder: string; keyboardType?: any; secure?: boolean }) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <TextInput
          value={form[fkey]}
          onChangeText={(v) => set(fkey, v)}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType || 'default'}
          autoCapitalize="none"
          secureTextEntry={secure && !showPass}
          style={[styles.input, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
        />
        {secure && (
          <Pressable onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#071525', '#0A2342', '#1E3A5F']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <View style={styles.headerContent}>
            <Image
              source={require('@/assets/images/absher-logo-transparent.png')}
              style={styles.logo}
              contentFit="cover"
            />
            <Text style={[styles.brandTitle, { fontFamily: 'Cairo_700Bold' }]}>ABSHER TRAVEL</Text>
            <Text style={[styles.title, { fontFamily: 'Cairo_700Bold' }]}>إنشاء حساب جديد</Text>
          </View>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Field label="الاسم الأخير" fkey="lastName" placeholder="السعيد" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="الاسم الأول" fkey="firstName" placeholder="محمد" />
            </View>
          </View>
          <Field label="البريد الإلكتروني" fkey="email" placeholder="example@email.com" keyboardType="email-address" />
          <Field label="رقم الهاتف" fkey="phone" placeholder="0500000000" keyboardType="phone-pad" />
          <Field label="كلمة المرور" fkey="password" placeholder="8 أحرف على الأقل" secure />
          <Field label="تأكيد كلمة المرور" fkey="confirmPassword" placeholder="أعد إدخال كلمة المرور" secure />

          <Pressable
            style={({ pressed }) => [
              styles.registerBtn,
              { backgroundColor: '#D4AF37', opacity: pressed || registerMutation.isPending ? 0.85 : 1 }
            ]}
            onPress={handleRegister}
            disabled={registerMutation.isPending}
          >
            <Text style={[styles.registerBtnText, { fontFamily: 'Cairo_700Bold' }]}>
              {registerMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </Text>
          </Pressable>

          <View style={styles.loginRow}>
            <Pressable onPress={() => router.replace('/auth/login')}>
              <Text style={[styles.loginLink, { color: '#38BDF8', fontFamily: 'Cairo_600SemiBold' }]}>تسجيل الدخول</Text>
            </Pressable>
            <Text style={[styles.loginHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>لديك حساب بالفعل؟</Text>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 36 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 14 },
  headerContent: { alignItems: 'center', gap: 8 },
  logo: { width: 80, height: 80, borderRadius: 16 },
  brandTitle: { fontSize: 18, color: '#D4AF37', letterSpacing: 1, marginTop: 6 },
  brandSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  title: { fontSize: 20, color: '#FFFFFF', marginTop: 10 },
  form: { padding: 20, gap: 16 },
  nameRow: { flexDirection: 'row', gap: 12 },
  field: { gap: 7 },
  label: { fontSize: 14, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  input: { flex: 1, fontSize: 15, textAlign: 'right' },
  registerBtn: { borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 14, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  registerBtnText: { color: '#0A2342', fontSize: 17 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 },
  loginHint: { fontSize: 14 },
  loginLink: { fontSize: 14 },
});
