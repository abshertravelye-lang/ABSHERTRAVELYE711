import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

export default function OtpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const chars = text.slice(0, 6).split('');
      const newOtp = [...otp];
      chars.forEach((c, i) => {
        if (index + i < 6) newOtp[index + i] = c;
      });
      setOtp(newOtp);
      const nextEmpty = newOtp.findIndex((v) => v === '');
      if (nextEmpty !== -1) {
        inputRefs.current[nextEmpty]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < 6) return;
    
    setIsVerifying(true);
    // Simulate verification delay
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsVerifying(false);
      router.replace('/(tabs)/');
    }, 1500);
  };

  const handleResend = () => {
    if (timer > 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimer(60);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const recipient = phone || email || 'رقم جوالك';

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
              <Ionicons name="chatbubble-ellipses" size={32} color="#0A2342" />
            </View>
            <Text style={[styles.title, { fontFamily: 'Cairo_700Bold' }]}>رمز التحقق</Text>
            <Text style={[styles.subtitle, { fontFamily: 'Cairo_400Regular' }]}>
              أدخل رمز التحقق المكون من 6 أرقام المرسل إلى{'\n'}
              <Text style={{ fontFamily: 'Cairo_700Bold', color: '#D4AF37' }}>{recipient}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  { 
                    backgroundColor: colors.muted,
                    borderColor: digit ? '#D4AF37' : colors.border,
                    color: colors.foreground,
                    fontFamily: 'Cairo_700Bold'
                  }
                ]}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={6}
                selectTextOnFocus
              />
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.verifyBtn,
              { backgroundColor: '#0A2342', opacity: pressed || isVerifying || otp.join('').length < 6 ? 0.8 : 1 }
            ]}
            onPress={handleVerify}
            disabled={isVerifying || otp.join('').length < 6}
          >
            <Text style={[styles.verifyBtnText, { fontFamily: 'Cairo_700Bold' }]}>
              {isVerifying ? 'جاري التحقق...' : 'تأكيد'}
            </Text>
          </Pressable>

          <View style={styles.resendContainer}>
            <Text style={[styles.resendText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
              لم يصلك الرمز؟
            </Text>
            <Pressable onPress={handleResend} disabled={timer > 0}>
              <Text style={[
                styles.resendBtn,
                { color: timer > 0 ? colors.mutedForeground : '#2563EB', fontFamily: 'Cairo_600SemiBold' }
              ]}>
                {timer > 0 ? `إعادة الإرسال (${timer}ث)` : 'إعادة الإرسال الآن'}
              </Text>
            </Pressable>
          </View>
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
  form: { padding: 24, gap: 32, flex: 1, paddingTop: 40 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', direction: 'ltr' },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    textAlign: 'center',
  },
  verifyBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  verifyBtnText: { color: '#FFFFFF', fontSize: 16 },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  resendText: { fontSize: 14 },
  resendBtn: { fontSize: 14 },
});