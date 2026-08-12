import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { getImageUrl } from '@/hooks/useImageUrl';
import type { Offer } from '@workspace/api-client-react';

type Props = { offer: Offer; onPress?: () => void };

export function OfferCard({ offer, onPress }: Props) {
  const colors = useColors();
  const imageUri = getImageUrl(offer.imageUrl);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, shadowColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
      onPress={onPress}
    >
      <Image
        source={imageUri ? { uri: imageUri } : require('@/assets/images/hero.jpg')}
        style={styles.image}
        contentFit="cover"
      />
      <View style={styles.badge}>
        <Text style={[styles.badgeText, { fontFamily: 'Cairo_600SemiBold' }]}>
          {offer.price.toLocaleString('ar-SA')} {offer.currency || 'ريال'}
        </Text>
      </View>
      <View style={[styles.body, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]} numberOfLines={1}>
          {offer.titleAr}
        </Text>
        <Text style={[styles.duration, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
          {offer.duration}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: { width: '100%', height: 130 },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#D4AF37',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#052B5B', fontSize: 12 },
  body: { padding: 12 },
  title: { fontSize: 14, marginBottom: 2, textAlign: 'right' },
  duration: { fontSize: 12, textAlign: 'right' },
});
