/**
 * notifications.tsx — شاشة الإشعارات
 */
import React from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import palette from '@/constants/colors';
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@workspace/api-client-react';
import type { Notification } from '@workspace/api-client-react';
import { EmptyState } from '@/components/EmptyState';

// ── Icon by type ──────────────────────────────────────────────────────────────
function getNotifIcon(type?: string | null): keyof typeof Ionicons.glyphMap {
  if (!type) return 'notifications-outline';
  if (type.includes('flight') || type.includes('booking')) return 'airplane-outline';
  if (type.includes('visa') || type.includes('application')) return 'card-outline';
  if (type.includes('program')) return 'globe-outline';
  if (type.includes('promo') || type.includes('offer')) return 'pricetag-outline';
  return 'information-circle-outline';
}

function getNotifColor(type?: string | null): string {
  if (!type) return '#052B5B';
  if (type.includes('flight') || type.includes('booking')) return '#052B5B';
  if (type.includes('visa') || type.includes('application')) return '#D97706';
  if (type.includes('program')) return '#0891B2';
  if (type.includes('promo') || type.includes('offer')) return '#7C3AED';
  return '#6B7280';
}

function formatNotifDate(iso: string, t: (key: string, params?: any) => string, lang: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return t('notifications.now');
  if (diffMin < 60) return t('notifications.minutesAgo', { count: diffMin });
  if (diffH < 24) return t('notifications.hoursAgo', { count: diffH });
  if (diffD < 7) return t('notifications.daysAgo', { count: diffD });
  return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'long' });
}

// ── NotifItem ─────────────────────────────────────────────────────────────────
function NotifItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const colors = useColors();
  const { t, lang } = useLanguage();
  const icon = getNotifIcon(notification.relatedEntityType);
  const iconColor = getNotifColor(notification.relatedEntityType);
  const isUnread = !notification.isRead;
  const title = lang === 'ar' ? notification.titleAr : (notification.titleEn || notification.titleAr);
  const message = lang === 'ar' ? notification.messageAr : (notification.messageEn || notification.messageAr);

  return (
    <Pressable
      style={({ pressed }) => [
        ni.wrap,
        {
          backgroundColor: isUnread ? `${iconColor}08` : colors.card,
          borderLeftColor: isUnread ? iconColor : 'transparent',
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#052B5B',
        },
      ]}
      onPress={() => {
        if (isUnread) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onMarkRead(notification.id);
        }
      }}
    >
      {/* Unread dot */}
      {isUnread && <View style={[ni.unreadDot, { backgroundColor: iconColor }]} />}

      {/* Icon */}
      <View style={[ni.iconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      {/* Content */}
      <View style={ni.content}>
        <View style={ni.topRow}>
          <Text style={[ni.date, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
            {formatNotifDate(notification.createdAt, t, lang)}
          </Text>
          <Text style={[ni.title, { color: isUnread ? colors.foreground : colors.foreground, fontFamily: isUnread ? 'Cairo_700Bold' : 'Cairo_600SemiBold' }]}>
            {title}
          </Text>
        </View>
        <Text style={[ni.message, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Pressable>
  );
}

const ni = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, marginBottom: 10, borderLeftWidth: 3, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, position: 'relative' },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
  iconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content: { flex: 1, gap: 4 },
  topRow: { gap: 2 },
  title: { fontSize: 14, textAlign: 'right' },
  message: { fontSize: 13, textAlign: 'right', lineHeight: 20 },
  date: { fontSize: 11, textAlign: 'right' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : 0;

  const { data, isLoading, error, refetch, isRefetching } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications: Notification[] = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllRead.mutate(undefined, { onSuccess: () => refetch() });
  };

  const handleMarkRead = (id: string) => {
    markRead.mutate({ id }, { onSuccess: () => refetch() });
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topInset + 12, backgroundColor: palette.navy }]}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={s.titleWrap}>
            <Text style={[s.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>{t('notifications.title')}</Text>
            {unreadCount > 0 && (
              <View style={s.countBadge}>
                <Text style={[s.countText, { fontFamily: 'Cairo_700Bold' }]}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAllRead}
              disabled={markAllRead.isPending}
              hitSlop={10}
            >
              <Text style={[s.markAllBtn, { fontFamily: 'Cairo_600SemiBold' }]}>
                {markAllRead.isPending ? '...' : t('notifications.markAllRead')}
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>
      </View>

      {error ? (
        <EmptyState
          icon="notifications-outline"
          title={t('notifications.errorTitle')}
          description={t('notifications.errorDesc')}
          actionLabel={t('common.retry')}
          onAction={() => refetch()}
        />
      ) : isLoading ? (
        <EmptyState loading title={t('notifications.loading')} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title={t('notifications.empty')}
          description={t('notifications.emptyDesc')}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotifItem notification={item} onMarkRead={handleMarkRead} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 30 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor="#D4AF37"
              colors={['#D4AF37']}
            />
          }
          ListHeaderComponent={
            unreadCount > 0 ? (
              <View style={[s.unreadHeader, { backgroundColor: '#FEF9C3', borderColor: '#D4AF37' }]}>
                <Ionicons name="mail-unread-outline" size={16} color="#854D0E" />
                <Text style={[s.unreadHeaderText, { color: '#854D0E', fontFamily: 'Cairo_600SemiBold' }]}>
                  {t('notifications.unreadHeader').replace('{count}', String(unreadCount))}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#FFFFFF', fontSize: 20 },
  countBadge: { backgroundColor: '#D4AF37', borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { color: '#052B5B', fontSize: 12 },
  markAllBtn: { color: '#D4AF37', fontSize: 13 },
  unreadHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 12 },
  unreadHeaderText: { fontSize: 12, flex: 1, textAlign: 'right' },
});
