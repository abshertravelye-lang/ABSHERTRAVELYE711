/**
 * ImageUploader — single-image picker + upload component for visa documents.
 *
 * Flow:
 *   1. User taps the area → Alert with Camera / Gallery / Cancel
 *   2. expo-image-picker picks the image (requests permissions automatically)
 *   3. Image is uploaded to POST /api/storage/uploads (multipart)
 *   4. On success: shows thumbnail + green badge, calls onUpload(url)
 *   5. User can tap thumbnail to replace, or tap ✕ to remove
 */
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Platform,
  Pressable, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  sublabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  /** Full URL of the already-uploaded image (or empty string). */
  value: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
}

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

/** Upload a local URI to the server; returns the full serving URL. */
async function uploadImage(localUri: string, mimeType?: string, fileName?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    type: mimeType ?? 'image/jpeg',
    name: fileName ?? 'photo.jpg',
  } as any);

  const res = await fetch(`${API_BASE}/api/storage/uploads`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — let the runtime add the boundary automatically
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const { objectPath } = await res.json();
  // objectPath = "/objects/uploads/<uuid>"
  return `${API_BASE}/api/storage${objectPath}`;
}

export default function ImageUploader({
  label, sublabel, icon = 'camera-outline', required = false, value, onUpload, onRemove,
}: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const requestAndPick = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الكاميرا من إعدادات الجهاز.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى معرض الصور من إعدادات الجهاز.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [4, 3] });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLoading(true);
      try {
        const url = await uploadImage(asset.uri, asset.mimeType ?? undefined, asset.fileName ?? undefined);
        onUpload(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert('خطأ في الرفع', 'تعذّر رفع الصورة. يرجى التحقق من الاتصال والمحاولة مجدداً.');
      } finally {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const pick = () => {
    if (loading) return;
    if (Platform.OS === 'web') { requestAndPick('gallery'); return; }
    Alert.alert(
      label,
      'اختر مصدر الصورة',
      [
        { text: '📷  التقاط صورة',    onPress: () => requestAndPick('camera')  },
        { text: '🖼️  من معرض الصور', onPress: () => requestAndPick('gallery') },
        { text: 'إلغاء', style: 'cancel' },
      ],
    );
  };

  const remove = () => {
    Alert.alert('حذف الصورة', 'هل تريد إزالة هذه الصورة؟', [
      { text: 'حذف', style: 'destructive', onPress: () => { onRemove(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } },
      { text: 'إلغاء', style: 'cancel' },
    ]);
  };

  const hasImage = !!value;

  return (
    <View style={s.wrap}>
      {/* Label row */}
      <View style={s.labelRow}>
        <View style={s.labelLeft}>
          {required && <Text style={[s.req, { color: '#EF4444' }]}>*</Text>}
          {sublabel ? (
            <View>
              <Text style={[s.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{label}</Text>
              <Text style={[s.sublabel, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{sublabel}</Text>
            </View>
          ) : (
            <Text style={[s.label, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>{label}</Text>
          )}
        </View>
        {hasImage && (
          <View style={[s.doneBadge, { backgroundColor: '#16A34A18', borderColor: '#16A34A' }]}>
            <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
            <Text style={[s.doneBadgeText, { color: '#16A34A', fontFamily: 'Cairo_600SemiBold' }]}>تم الرفع</Text>
          </View>
        )}
      </View>

      {/* Upload area */}
      <Pressable
        style={({ pressed }) => [
          s.area,
          {
            backgroundColor: hasImage ? colors.muted : colors.muted,
            borderColor: hasImage ? '#16A34A' : required && !hasImage ? '#EF444440' : colors.border,
            borderStyle: hasImage ? 'solid' : 'dashed',
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={pick}
      >
        {loading ? (
          <View style={s.loadingInner}>
            <ActivityIndicator size="large" color="#0A2342" />
            <Text style={[s.uploadingText, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
              جارٍ الرفع...
            </Text>
          </View>
        ) : hasImage ? (
          /* Thumbnail */
          <View style={s.thumbWrap}>
            <Image source={{ uri: value }} style={s.thumb} resizeMode="cover" />
            <View style={s.thumbOverlay}>
              <View style={s.thumbActions}>
                <Pressable style={[s.thumbBtn, { backgroundColor: '#0A2342DD' }]} onPress={pick}>
                  <Ionicons name="pencil" size={15} color="#FFFFFF" />
                  <Text style={[s.thumbBtnText, { fontFamily: 'Cairo_600SemiBold' }]}>تغيير</Text>
                </Pressable>
                <Pressable style={[s.thumbBtn, { backgroundColor: '#EF4444DD' }]} onPress={remove}>
                  <Ionicons name="trash" size={15} color="#FFFFFF" />
                  <Text style={[s.thumbBtnText, { fontFamily: 'Cairo_600SemiBold' }]}>حذف</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          /* Empty state */
          <View style={s.emptyInner}>
            <View style={[s.iconCircle, { backgroundColor: '#0A234215' }]}>
              <Ionicons name={icon} size={28} color="#0A2342" />
            </View>
            <Text style={[s.uploadTitle, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
              اضغط لرفع الصورة
            </Text>
            <Text style={[s.uploadHint, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
              كاميرا · معرض الصور
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const THUMB_H = 160;

const s = StyleSheet.create({
  wrap:         { gap: 8 },
  labelRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelLeft:    { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  req:          { fontSize: 16, lineHeight: 20 },
  label:        { fontSize: 14 },
  sublabel:     { fontSize: 11, marginTop: 1 },
  doneBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  doneBadgeText:{ fontSize: 11 },
  area:         { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', minHeight: THUMB_H },
  loadingInner: { height: THUMB_H, alignItems: 'center', justifyContent: 'center', gap: 10 },
  uploadingText:{ fontSize: 13 },
  thumbWrap:    { height: THUMB_H, position: 'relative' },
  thumb:        { width: '100%', height: THUMB_H },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 10 },
  thumbActions: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  thumbBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  thumbBtnText: { color: '#FFFFFF', fontSize: 13 },
  emptyInner:   { height: THUMB_H, alignItems: 'center', justifyContent: 'center', gap: 8 },
  iconCircle:   { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  uploadTitle:  { fontSize: 14 },
  uploadHint:   { fontSize: 12 },
});
