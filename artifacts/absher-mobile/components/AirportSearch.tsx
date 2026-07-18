import React, { useState, useRef, useCallback } from 'react';
import {
  FlatList, Modal, Pressable, StyleSheet, Text,
  TextInput, View, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Airport, searchAirports } from '@/constants/airports';

interface Props {
  selected: Airport | null;
  onSelect: (airport: Airport) => void;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function AirportSearch({ selected, onSelect, placeholder, icon }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const results = query.length > 0 ? searchAirports(query) : [];
  const inputRef = useRef<TextInput>(null);

  const open = () => {
    setQuery('');
    setVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const close = () => {
    setVisible(false);
    setQuery('');
  };

  const pick = (airport: Airport) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(airport);
    close();
  };

  const renderItem = useCallback(({ item }: { item: Airport }) => (
    <Pressable
      style={({ pressed }) => [
        s.result,
        { backgroundColor: pressed ? colors.muted : colors.card, borderBottomColor: colors.border },
      ]}
      onPress={() => pick(item)}
    >
      <View style={s.resultLeft}>
        <Text style={s.flag}>{item.flag}</Text>
      </View>
      <View style={s.resultBody}>
        <View style={s.resultTop}>
          <View style={[s.iataTag, { backgroundColor: '#0A2342' }]}>
            <Text style={s.iataText}>{item.iata}</Text>
          </View>
          <Text style={[s.nameAr, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]} numberOfLines={1}>
            {item.nameAr}
          </Text>
        </View>
        <Text style={[s.nameEn, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]} numberOfLines={1}>
          {item.nameEn}
        </Text>
        <Text style={[s.city, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
          {item.cityAr} · {item.countryAr}
        </Text>
      </View>
    </Pressable>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [colors, query]);

  return (
    <>
      {/* Trigger */}
      <Pressable
        style={[s.trigger, { backgroundColor: colors.muted, borderColor: colors.border }]}
        onPress={open}
      >
        <View style={s.triggerContent}>
          {selected ? (
            <>
              <View style={s.triggerLeft}>
                <View style={[s.iataTag, { backgroundColor: '#0A2342' }]}>
                  <Text style={s.iataText}>{selected.iata}</Text>
                </View>
              </View>
              <View style={s.triggerCenter}>
                <Text style={[s.triggerCity, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]} numberOfLines={1}>
                  {selected.cityAr}
                </Text>
                <Text style={[s.triggerName, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]} numberOfLines={1}>
                  {selected.nameAr}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[s.placeholder, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
              {placeholder}
            </Text>
          )}
        </View>
        <Ionicons name={icon} size={20} color={colors.mutedForeground} />
      </Pressable>

      {/* Modal */}
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <KeyboardAvoidingView
          style={[s.modal, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal header */}
          <View style={[s.modalHeader, { backgroundColor: '#0A2342', paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 16 }]}>
            <Pressable onPress={close} style={s.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={[s.modalTitle, { fontFamily: 'Cairo_700Bold' }]}>البحث عن مطار</Text>
          </View>

          {/* Search bar */}
          <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="ابحث بالدولة أو المدينة أو المطار أو IATA..."
              placeholderTextColor={colors.mutedForeground}
              style={[s.searchInput, { color: colors.foreground, fontFamily: 'Cairo_400Regular' }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {query.length > 0 && Platform.OS !== 'ios' && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Empty state */}
          {query.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="airplane" size={48} color={colors.border} />
              <Text style={[s.emptyTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
                ابدأ الكتابة للبحث
              </Text>
              <Text style={[s.emptyHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                {'مثال: مصر، الرياض، DXB، Cairo'}
              </Text>
            </View>
          )}

          {/* No results */}
          {query.length > 0 && results.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="search" size={48} color={colors.border} />
              <Text style={[s.emptyTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>
                لا توجد نتائج
              </Text>
              <Text style={[s.emptyHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                جرّب كلمة مختلفة
              </Text>
            </View>
          )}

          {/* Results */}
          {results.length > 0 && (
            <FlatList
              data={results}
              keyExtractor={(a) => a.iata}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.list}
              ItemSeparatorComponent={() => <View style={[s.sep, { backgroundColor: colors.border }]} />}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  triggerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
  triggerLeft: {},
  triggerCenter: { flex: 1, alignItems: 'flex-end' },
  triggerCity: { fontSize: 16 },
  triggerName: { fontSize: 12, marginTop: 1 },
  placeholder: { fontSize: 14 },
  iataTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  iataText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Cairo_700Bold', letterSpacing: 1 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 16, paddingHorizontal: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, flex: 1, textAlign: 'center' },
  closeBtn: { position: 'absolute', right: 16, bottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, textAlign: 'right' },
  list: { paddingBottom: 40 },
  result: { flexDirection: 'row', padding: 16, gap: 12, alignItems: 'center' },
  resultLeft: { width: 36, alignItems: 'center' },
  flag: { fontSize: 28 },
  resultBody: { flex: 1, gap: 2 },
  resultTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  nameAr: { fontSize: 14, flex: 1, textAlign: 'right' },
  nameEn: { fontSize: 12, textAlign: 'right' },
  city: { fontSize: 11, textAlign: 'right' },
  sep: { height: StyleSheet.hairlineWidth },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 },
  emptyTitle: { fontSize: 16 },
  emptyHint: { fontSize: 13, textAlign: 'center' },
});
