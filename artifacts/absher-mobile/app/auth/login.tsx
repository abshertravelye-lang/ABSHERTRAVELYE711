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
import { useLanguage } from '@/context/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuth();
  const { t, writingDirection } = useLanguage();
  const loginMutation = useLoginUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert(t('login.missingTitle'), t('login.missingBody'));
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
          Alert.alert(t('login.errorTitle'), t('login.errorBody'));
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Airy navy travel header */}
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
            <Text style={[styles.title, { fontFamily: 'Cairo_700Bold' }]}>{t('login.title')}</Text>
          </View>
        </LinearGradient>

        <View style={[styles.form, { backgroundColor: colors.card }]}>
          {/* Email */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold', writingDirection }]}>{t('login.email')}</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: colors.foreground, fontFamily: 'Cairo_400Regular', writingDirection }]}
              />
              <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold', writingDirection }]}>{t('login.password')}</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPass}
                style={[styles.input, { color: colors.foreground, fontFamily: 'Cairo_400Regular', writingDirection }]}
              />
              <Pressable onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* Forgot password */}
          <Pressable onPress={() => router.push('/auth/forgot-password')} style={styles.forgotWrap}>
            <Text style={[styles.forgotLink, { color: colors.secondary, fontFamily: 'Cairo_600SemiBold' }]}>
              {t('login.forgot')}
            </Text>
          </Pressable>

          {/* Login Button */}
          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: colors.primary, opacity: pressed || loginMutation.isPending ? 0.85 : 1 }
            ]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            <Text style={[styles.loginBtnText, { fontFamily: 'Cairo_700Bold' }]}>
              {loginMutation.isPending ? t('login.submitting') : t('login.submit')}
            </Text>
          </Pressable>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Pressable onPress={() => router.replace('/auth/register')}>
              <Text style={[styles.registerLink, { color: colors.secondary, fontFamily: 'Cairo_600SemiBold' }]}>{t('login.createAccount')}</Text>
            </Pressable>
            <Text style={[styles.registerHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{t('login.noAccount')}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 40 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  closeBtn: { padding: 2 },
  headerContent: { alignItems: 'center', gap: 8 },
  logoWrap: { width: 190, height: 76, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 190, height: 76 },
  brandTitle: { fontSize: 20, color: '#D4AF37', letterSpacing: 1, marginTop: 8 },
  brandSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  title: { fontSize: 22, color: '#FFFFFF', marginTop: 12 },
  form: { padding: 20, gap: 18, flex: 1, marginTop: -22, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#0A2342', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
  field: { gap: 8 },
  label: { fontSize: 14, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 15, gap: 12 },
  input: { flex: 1, fontSize: 15, textAlign: 'right' },
  forgotWrap: { alignSelf: 'flex-start', marginTop: -6 },
  forgotLink: { fontSize: 13 },
  loginBtn: { borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 12, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  loginBtnText: { color: '#FFFFFF', fontSize: 17 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  registerHint: { fontSize: 14 },
  registerLink: { fontSize: 14 },
});
