import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [contact, setContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendLink = () => {
    if (!contact) return;
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsLoading(false);
      setStep(2);
    }, 1200);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: '#0A2342' }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerContent}>
            <View style={[styles.iconCircle, { backgroundColor: '#D4AF37' }]}>
              <Ionicons name={step === 1 ? 'key' : 'mail-unread'} size={32} color="#0A2342" />
            </View>
            <Text style={[styles.title, { fontFamily: 'Cairo_700Bold' }]}>
              {step === 1 ? 'نسيت كلمة المرور؟' : 'تم إرسال الرابط'}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: 'Cairo_400Regular' }]}>
              {step === 1 
                ? 'أدخل بريدك الإلكتروني أو رقم جوالك المرتبط بحسابك وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.'
                : `لقد أرسلنا تعليمات استعادة كلمة المرور إلى ${contact}. يرجى التحقق من صندوق الوارد.`}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          {step === 1 ? (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
                  البريد الإلكتروني أو رقم الجوال
                </Text>
                <View style={[styles.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <TextInput
                    value={contact}
                    onChangeText={setContact}
                    placeholder="example@email.com"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[styles.input, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
                  />
                  <Ionicons name="person-circle-outline" size={20} color={colors.mutedForeground} />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: '#0A2342', opacity: pressed || isLoading || !contact ? 0.8 : 1 }
                ]}
                onPress={handleSendLink}
                disabled={isLoading || !contact}
              >
                <Text style={[styles.submitBtnText, { fontFamily: 'Cairo_700Bold' }]}>
                  {isLoading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: '#0A2342', opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => router.replace('/auth/login')}
              >
                <Text style={[styles.submitBtnText, { fontFamily: 'Cairo_700Bold' }]}>
                  العودة لتسجيل الدخول
                </Text>
              </Pressable>
              
              <View style={styles.resendContainer}>
                <Text style={[styles.resendText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                  لم يصلك الرابط؟
                </Text>
                <Pressable onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep(1);
                }}>
                  <Text style={[styles.resendBtn, { color: '#2563EB', fontFamily: 'Cairo_600SemiBold' }]}>
                    حاول مرة أخرى
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 32 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 20 },
  headerContent: { alignItems: 'center', gap: 12 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 24, color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24 },
  form: { padding: 24, gap: 24, flex: 1, paddingTop: 32 },
  field: { gap: 8 },
  label: { fontSize: 14, textAlign: 'right' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  input: { flex: 1, fontSize: 15, textAlign: 'right' },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16 },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 },
  resendText: { fontSize: 14 },
  resendBtn: { fontSize: 14 },
});