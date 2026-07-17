import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

type Props = { title: string; onSeeAll?: () => void };

export function SectionHeader({ title, onSeeAll }: Props) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={[styles.seeAll, { color: colors.secondary, fontFamily: 'Cairo_600SemiBold' }]}>عرض الكل</Text>
        </Pressable>
      )}
      <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  title: { fontSize: 18 },
  seeAll: { fontSize: 13 },
});
