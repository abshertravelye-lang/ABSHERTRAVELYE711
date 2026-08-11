import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FlightsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <LinearGradient
      colors={['#071525', '#0A2342', '#1E3A5F']}
      style={[styles.container, { paddingTop: topInset }]}
    >
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="airplane" size={64} color="#D4AF37" />
        </View>
        <Text style={styles.title}>ستتوفر هذه الخدمة قريباً</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
        <Text style={styles.desc}>
          نعمل على تقديم خدمة حجز الرحلات الجوية بأفضل الأسعار.{'\n'}
          يرجى المتابعة معنا.
        </Text>
        <View style={styles.badge}>
          <Ionicons name="time-outline" size={16} color="#D4AF37" />
          <Text style={styles.badgeText}>قريباً</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Cairo_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: '#D4AF37',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 2,
  },
  desc: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeText: {
    fontFamily: 'Cairo_600SemiBold',
    color: '#D4AF37',
    fontSize: 14,
  },
});
