import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useLoginUser } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuth();
  const loginMutation = useLoginUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('بيانات ناقصة', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: async (res) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await setAuth(res);
          router.back();
        },
        onError: () => {
          Alert.alert('خطأ في الدخول', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: '#0A2342' }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerContent}>
            <View style={[styles.iconCircle, { backgroundColor: '#D4AF37' }]}>
              <Ionicons name="person" size={36} color="#0A2342" />
            </View>
            <Text style={[styles.title, { fontFamily: 'Cairo_700Bold' }]}>تسجيل الدخول</Text>
            <Text style={[styles.subtitle, { fontFamily: 'Cairo_400Regular' }]}>أبشر أعمال للسفريات والسياحة</Text>
          </View>
        </View>

        <View style={styles.form}>
          {/* Email */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>البريد الإلكتروني</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
              />
              <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>كلمة المرور</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPass}
                style={[styles.input, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
              />
              <Pressable onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* Login Button */}
          <Pressable
            style={({ pressed }) => [styles.loginBtn, { backgroundColor: '#0A2342', opacity: pressed || loginMutation.isPending ? 0.8 : 1 }]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            <Text style={[styles.loginBtnText, { fontFamily: 'Cairo_700Bold' }]}>
              {loginMutation.isPending ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </Text>
          </Pressable>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Pressable onPress={() => router.replace('/auth/register')}>
              <Text style={[styles.registerLink, { color: '#2563EB', fontFamily: 'Cairo_600SemiBold' }]}>إنشاء حساب جديد</Text>
            </Pressable>
            <Text style={[styles.registerHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>ليس لديك حساب؟</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 32 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  headerContent: { alignItems: 'center', gap: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 24, color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  form: { padding: 20, gap: 16, flex: 1 },
  field: { gap: 8 },
  label: { fontSize: 14, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  input: { flex: 1, fontSize: 15, textAlign: 'right' },
  loginBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#FFFFFF', fontSize: 16 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 },
  registerHint: { fontSize: 14 },
  registerLink: { fontSize: 14 },
});
