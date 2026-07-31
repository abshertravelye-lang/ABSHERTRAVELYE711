import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
        <LinearGradient colors={['#071525', '#0A2342', '#1E3A5F']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <View style={styles.headerContent}>
            <Image
              source={require('@/assets/images/absher-travel-logo-nobg.png')}
              style={styles.logo}
              contentFit="cover"
            />
            <Text style={[styles.brandTitle, { fontFamily: 'Cairo_700Bold' }]}>ABSHER TRAVEL</Text>
            <Text style={[styles.brandSubtitle, { fontFamily: 'Cairo_600SemiBold' }]}>أبشر ترافل</Text>
            <Text style={[styles.title, { fontFamily: 'Cairo_700Bold' }]}>تسجيل الدخول</Text>
          </View>
        </LinearGradient>

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
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: '#D4AF37', opacity: pressed || loginMutation.isPending ? 0.85 : 1 }
            ]}
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
              <Text style={[styles.registerLink, { color: '#38BDF8', fontFamily: 'Cairo_600SemiBold' }]}>إنشاء حساب جديد</Text>
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
  header: { paddingHorizontal: 20, paddingBottom: 40 },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 16 },
  headerContent: { alignItems: 'center', gap: 10 },
  logo: { width: 90, height: 90, borderRadius: 18 },
  brandTitle: { fontSize: 20, color: '#D4AF37', letterSpacing: 1, marginTop: 8 },
  brandSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  title: { fontSize: 22, color: '#FFFFFF', marginTop: 12 },
  form: { padding: 20, gap: 18, flex: 1 },
  field: { gap: 8 },
  label: { fontSize: 14, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  input: { flex: 1, fontSize: 15, textAlign: 'right' },
  loginBtn: { borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 12, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  loginBtnText: { color: '#0A2342', fontSize: 17 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  registerHint: { fontSize: 14 },
  registerLink: { fontSize: 14 },
});
