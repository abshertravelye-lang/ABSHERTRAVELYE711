import React, { useRef, useState } from 'react';
import { Animated, Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'اكتشف وجهتك المثالية',
    subtitle: 'نوفر لك خيارات متنوعة من الوجهات السياحية العالمية التي تلبي جميع تطلعاتك.',
    icon: 'airplane',
  },
  {
    id: '2',
    title: 'احجز تأشيرتك بسهولة',
    subtitle: 'خدمات متكاملة لاستخراج التأشيرات بسرعة وموثوقية عالية لتستمتع برحلتك.',
    icon: 'card',
  },
  {
    id: '3',
    title: 'رحلات لا تُنسى',
    subtitle: 'برامج سياحية متكاملة مصممة خصيصاً لتمنحك ذكريات تدوم مدى الحياة.',
    icon: 'globe',
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20);

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<Animated.FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleComplete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem('@absher_onboarded', 'true');
    router.replace('/(tabs)/');
  };

  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      handleComplete();
    }
  };

  const scrollToPrev = () => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      slidesRef.current?.scrollToIndex({ index: currentIndex - 1 });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip Button */}
      <Pressable
        style={[styles.skipButton, { top: topInset + 10 }]}
        onPress={handleComplete}
      >
        <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: 'Cairo_600SemiBold' }]}>
          تخطي
        </Text>
      </Pressable>

      <Animated.FlatList
        ref={slidesRef}
        data={SLIDES}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <LinearGradient
              colors={['#0A2342', '#0A2342', '#14345B']}
              style={styles.illustrationArea}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(212, 175, 55, 0.15)' }]}>
                <Ionicons name={item.icon as any} size={80} color="#D4AF37" />
              </View>
            </LinearGradient>
            <View style={styles.contentArea}>
              <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
                {item.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                {item.subtitle}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: bottomInset }]}>
        {/* Indicators */}
        <View style={styles.indicators}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity, backgroundColor: '#D4AF37' },
                ]}
              />
            );
          })}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={[styles.navBtn, { opacity: currentIndex === 0 ? 0 : 1 }]}
            onPress={scrollToPrev}
            disabled={currentIndex === 0}
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: '#0A2342', opacity: pressed ? 0.8 : 1 },
              currentIndex === SLIDES.length - 1 && styles.primaryBtnExpanded
            ]}
            onPress={scrollToNext}
          >
            {currentIndex === SLIDES.length - 1 ? (
              <Text style={[styles.primaryBtnText, { fontFamily: 'Cairo_700Bold' }]}>ابدأ الآن</Text>
            ) : (
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipButton: { position: 'absolute', right: 20, zIndex: 10, padding: 8 },
  skipText: { fontSize: 16 },
  slide: { flex: 1, alignItems: 'center' },
  illustrationArea: {
    width: '100%',
    height: height * 0.55,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  contentArea: { flex: 1, paddingHorizontal: 32, paddingTop: 40, alignItems: 'center' },
  title: { fontSize: 26, textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 26 },
  footer: { paddingHorizontal: 32, paddingBottom: 20 },
  indicators: { flexDirection: 'row', justifyContent: 'center', marginBottom: 32 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(100,116,139,0.1)' },
  primaryBtn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#0A2342', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryBtnExpanded: { width: '100%' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 18 },
});