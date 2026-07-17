import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: '#0A2342' }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.title, { fontFamily: 'Cairo_700Bold' }]}>إنشاء حساب جديد</Text>
          <Text style={[styles.subtitle, { fontFamily: 'Cairo_400Regular' }]}>انضم إلى أبشر أعمال</Text>
        </View>

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
            style={({ pressed }) => [styles.registerBtn, { backgroundColor: '#0A2342', opacity: pressed || registerMutation.isPending ? 0.8 : 1 }]}
            onPress={handleRegister}
            disabled={registerMutation.isPending}
          >
            <Text style={[styles.registerBtnText, { fontFamily: 'Cairo_700Bold' }]}>
              {registerMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </Text>
          </Pressable>

          <View style={styles.loginRow}>
            <Pressable onPress={() => router.replace('/auth/login')}>
              <Text style={[styles.loginLink, { color: '#2563EB', fontFamily: 'Cairo_600SemiBold' }]}>تسجيل الدخول</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 28, gap: 6 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 12 },
  title: { fontSize: 24, color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  form: { padding: 20, gap: 14 },
  nameRow: { flexDirection: 'row', gap: 10 },
  field: { gap: 6 },
  label: { fontSize: 14, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  input: { flex: 1, fontSize: 15, textAlign: 'right' },
  registerBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  registerBtnText: { color: '#FFFFFF', fontSize: 16 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  loginHint: { fontSize: 14 },
  loginLink: { fontSize: 14 },
});
