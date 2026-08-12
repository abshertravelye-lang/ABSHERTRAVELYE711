import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import colors from '@/constants/colors';
import { useLanguage } from '@/context/LanguageContext';

const umrahUi = {
  "umrahUi.center": { ar: "مركز تأشيرات العمرة", en: "Umrah Visa Center" },
  "umrahUi.subtitle": { ar: "بوابتك الميسرة لزيارة بيت الله الحرام", en: "Your seamless gateway to the Holy Mosque" },
  "umrahUi.applyBtn": { ar: "التقديم على تأشيرة العمرة", en: "Apply for Umrah Visa" },
  "umrahUi.applyDesc": { ar: "خدمة مستقلة — إجراءات سريعة عبر الإنترنت", en: "A standalone service — fast online process" },
  "umrahUi.myApplications": { ar: "طلبات تأشيرة العمرة", en: "My Umrah Applications" },
  "umrahUi.noApplications": { ar: "لا توجد طلبات عمرة حالية", en: "No active Umrah applications" },
  "umrahUi.docsStatus": { ar: "حالة المستندات", en: "Documents Status" },
} as any;

import { useAuth } from '@/context/AuthContext';
import {
  useListUmrahApplications,
  getListUmrahApplicationsQueryKey,
  useGetCurrentUser,
  getGetCurrentUserQueryKey,
} from '@workspace/api-client-react';
import type { UmrahApplication } from '@workspace/api-client-react';

import { UmrahHero } from '@/components/umrah/UmrahHero';
import { UmrahDocsCard } from '@/components/umrah/UmrahDocsCard';
import { UmrahInstructions } from '@/components/umrah/UmrahInstructions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Lang = 'ar' | 'en';
const trx = (lang: Lang, ar: string, en: string) => (lang === 'en' ? en : ar);

function statusLabel(status: string, lang: Lang): { label: string; color: string } {
  switch (status) {
    case 'awaiting_payment': return { label: trx(lang, 'بانتظار الدفع', 'Awaiting payment'), color: colors.gold };
    case 'submitted': return { label: trx(lang, 'تم التقديم', 'Submitted'), color: colors.gold };
    case 'under_review': return { label: trx(lang, 'قيد المراجعة', 'Under review'), color: colors.cyan };
    case 'processing': return { label: trx(lang, 'قيد المعالجة', 'Processing'), color: colors.cyan };
    case 'approved': return { label: trx(lang, 'تم الاعتماد', 'Approved'), color: '#16A34A' };
    case 'completed': return { label: trx(lang, 'مكتملة', 'Completed'), color: '#16A34A' };
    case 'rejected': return { label: trx(lang, 'مرفوض', 'Rejected'), color: '#EF4444' };
    default: return { label: trx(lang, 'تم التقديم', 'Submitted'), color: colors.gold };
  }
}

function paymentLabel(status: string, lang: Lang): { label: string; color: string } {
  switch (status) {
    case 'paid': return { label: trx(lang, 'مدفوع', 'Paid'), color: '#16A34A' };
    case 'failed': return { label: trx(lang, 'فشل الدفع', 'Failed'), color: '#EF4444' };
    default: return { label: trx(lang, 'غير مدفوع', 'Unpaid'), color: colors.gold };
  }
}

function UmrahAppRow({ app, lang }: { app: UmrahApplication; lang: Lang }) {
  const c = useColors();
  const st = statusLabel(app.status, lang);
  const pay = paymentLabel(app.paymentStatus, lang);
  const date = app.createdAt ? new Date(app.createdAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-SA') : '';
  return (
    <Pressable
      onPress={() => router.push(`/umrah-tracking/${app.id}` as never)}
      style={({ pressed }) => [styles.appRow, { borderColor: c.border, backgroundColor: c.card, opacity: pressed ? 0.9 : 1 }]}
    >
      <Ionicons name="chevron-back" size={18} color={c.mutedForeground} />
      <View style={{ flex: 1, alignItems: 'flex-end', gap: 6 }}>
        <View style={styles.appTopRow}>
          <View style={[styles.chip, { backgroundColor: st.color + '1A', borderColor: st.color }]}>
            <Text style={[styles.chipText, { color: st.color, fontFamily: 'Cairo_700Bold' }]}>{st.label}</Text>
          </View>
          <Text style={[styles.appTracking, { color: c.foreground, fontFamily: 'Cairo_700Bold' }]}>{app.trackingNumber}</Text>
        </View>
        <View style={styles.appBottomRow}>
          {!!date && <Text style={[styles.appMeta, { color: c.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>{date}</Text>}
          <View style={[styles.chip, { backgroundColor: pay.color + '14', borderColor: pay.color }]}>
            <Ionicons name="card-outline" size={12} color={pay.color} />
            <Text style={[styles.chipText, { color: pay.color, fontFamily: 'Cairo_600SemiBold' }]}>{pay.label}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function UmrahTab() {
  const c = useColors();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();

  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 16);

  const t = (key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (umrahUi as any)[key]?.[lang] ?? key;
  };

  const { data: currentUser } = useGetCurrentUser({
    query: { enabled: !!authUser, queryKey: getGetCurrentUserQueryKey() },
  });

  const { data: applications, isLoading: appsLoading } = useListUmrahApplications({
    query: { enabled: !!authUser, queryKey: getListUmrahApplicationsQueryKey() },
  });

  const umrahApps = useMemo(() => {
    const list = applications ?? [];
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [applications]);

  const handleApply = () => {
    router.push('/umrah-visa' as never);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <UmrahHero title={t('umrahUi.center')} subtitle={t('umrahUi.subtitle')} />

      <View style={styles.content}>
        {/* Main Apply CTA — opens the standalone Umrah wizard */}
        <Card style={[styles.applyCard, { borderColor: c.umrahGreen, borderWidth: 1.5 }]}>
          <View style={styles.applyCardContent}>
            <View style={styles.applyTextWrap}>
              <Text style={[styles.applyTitle, { color: c.foreground }]}>{t('umrahUi.applyBtn')}</Text>
              <Text style={[styles.applyDesc, { color: c.mutedForeground }]}>{t('umrahUi.applyDesc')}</Text>
            </View>
            <View style={[styles.applyIconBox, { backgroundColor: c.umrahGreen + '15' }]}>
              <Ionicons name="moon" size={28} color={c.umrahGreen} />
            </View>
          </View>
          <Button label={t('umrahUi.applyBtn')} onPress={handleApply} style={{ backgroundColor: c.umrahGreen }} />
        </Card>

        {/* My Umrah applications */}
        <Card style={styles.listCard}>
          <View style={styles.listHeader}>
            <View style={[styles.listIconBox, { backgroundColor: c.goldTint }]}>
              <Ionicons name="list-outline" size={22} color={colors.gold} />
            </View>
            <Text style={[styles.listTitle, { color: c.foreground }]}>{t('umrahUi.myApplications')}</Text>
          </View>

          {appsLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 20 }} />
          ) : umrahApps.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="document-text-outline" size={28} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>{t('umrahUi.noApplications')}</Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 12 }}>
              {umrahApps.map((app) => (
                <UmrahAppRow key={app.id} app={app} lang={lang as Lang} />
              ))}
            </View>
          )}
        </Card>

        {/* Documents readiness helper */}
        <UmrahDocsCard user={currentUser || authUser || undefined} t={t} />

        {/* Guidelines */}
        <UmrahInstructions t={t} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 20,
    marginTop: -24, // Pull up over the hero gradient
  },
  applyCard: {
    padding: 24,
    marginBottom: 20,
    boxShadow: '0px 8px 16px rgba(11, 94, 59, 0.1)',
    elevation: 8,
  },
  applyCardContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  applyTextWrap: { flex: 1, alignItems: 'flex-end' },
  applyTitle: { fontFamily: 'Cairo_700Bold', fontSize: 22, marginBottom: 4, textAlign: 'right' },
  applyDesc: { fontFamily: 'Cairo_400Regular', fontSize: 14, textAlign: 'right' },
  applyIconBox: {
    width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },

  listCard: { padding: 20, marginBottom: 20 },
  listHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  listIconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, flex: 1, textAlign: 'right' },
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyText: { fontFamily: 'Cairo_400Regular', fontSize: 14 },

  appRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  appTopRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start' },
  appBottomRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  appTracking: { fontSize: 15, writingDirection: 'ltr' },
  appMeta: { fontSize: 12.5 },
  chip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 11.5 },
});
