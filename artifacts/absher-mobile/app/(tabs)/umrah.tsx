import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

const umrahUi = {
  "umrahUi.center": { ar: "مركز تأشيرات العمرة", en: "Umrah Visa Center" },
  "umrahUi.subtitle": { ar: "بوابتك الميسرة لزيارة بيت الله الحرام", en: "Your seamless gateway to the Holy Mosque" },
  "umrahUi.applyBtn": { ar: "التقديم على التأشيرة", en: "Apply for Visa" },
  "umrahUi.applyDesc": { ar: "إجراءات سريعة وسهلة عبر الإنترنت", en: "Fast and easy online process" },
  "umrahUi.tracking": { ar: "تتبع الطلب", en: "Track Application" },
  "umrahUi.noApplications": { ar: "لا توجد طلبات عمرة حالية", en: "No active Umrah applications" },
  "umrahUi.latestStatus": { ar: "حالة الطلب الأخير:", en: "Latest status:" },
  "umrahUi.download": { ar: "تحميل التأشيرة", en: "Download Visa" },
  "umrahUi.availableWhenIssued": { ar: "متاحة عند الإصدار", en: "Available when issued" },
  "umrahUi.docsStatus": { ar: "حالة المستندات", en: "Documents Status" },
  "umrahUi.docsComplete": { ar: "مكتملة وموثقة", en: "Complete and verified" },
  "umrahUi.docsIncomplete": { ar: "يرجى استكمال المستندات", en: "Please complete documents" },
  "umrahUi.docsDesc": { ar: "جواز السفر والصورة الشخصية", en: "Passport and personal photo" },
  "umrahUi.guidance": { ar: "إرشادات المعتمر", en: "Umrah Guidance" },
  "umrahUi.guide1.title": { ar: "الاستعداد الروحي", en: "Spiritual Preparation" },
  "umrahUi.guide1.desc": { ar: "احرص على الإخلاص والتوبة قبل السفر.", en: "Ensure sincerity and repentance before traveling." },
  "umrahUi.guide2.title": { ar: "الإحرام والميقات", en: "Ihram & Miqat" },
  "umrahUi.guide2.desc": { ar: "تأكد من الإحرام من الميقات المحدد لرحلتك.", en: "Ensure you enter Ihram from the designated Miqat." },
  "umrahUi.guide3.title": { ar: "الأمتعة الضرورية", en: "Essential Luggage" },
  "umrahUi.guide3.desc": { ar: "احمل ما يخف وزنه ويفيد.", en: "Pack light and useful items." },
  "umrahUi.guide4.title": { ar: "التطبيقات الصحية", en: "Health Apps" },
  "umrahUi.guide4.desc": { ar: "حمل تطبيقي نسك وتوكلنا لإصدار التصاريح.", en: "Download Nusuk and Tawakkalna." },
  "status.received": { ar: "تم الاستلام", en: "Received" },
  "status.pending": { ar: "قيد الانتظار", en: "Pending" },
  "status.underReview": { ar: "قيد المراجعة", en: "Under review" },
  "status.processing": { ar: "قيد المعالجة", en: "Processing" },
  "status.awaitingDocuments": { ar: "بانتظار مستندات", en: "Awaiting documents" },
  "status.documentsUploaded": { ar: "تم رفع المستندات", en: "Documents uploaded" },
  "status.sentToEmbassy": { ar: "أُرسل للسفارة", en: "Sent to embassy" },
  "status.issued": { ar: "صدرت التأشيرة", en: "Visa issued" },
  "status.approved": { ar: "مقبول", en: "Approved" },
  "status.confirmed": { ar: "مؤكد", en: "Confirmed" },
  "status.completed": { ar: "مكتمل", en: "Completed" },
  "status.rejected": { ar: "مرفوض", en: "Rejected" },
  "status.cancelled": { ar: "ملغي", en: "Cancelled" },
  "common.readMore": { ar: "المزيد", en: "Read More" },
  "common.edit": { ar: "تعديل", en: "Edit" },
} as any;
import { useAuth } from '@/context/AuthContext';
import { 
  useListVisas, 
  getListVisasQueryKey,
  useListVisaApplications,
  getListVisaApplicationsQueryKey,
  useGetCurrentUser,
  getGetCurrentUserQueryKey
} from '@workspace/api-client-react';

import { UmrahHero } from '@/components/umrah/UmrahHero';
import { UmrahTrackingCard } from '@/components/umrah/UmrahTrackingCard';
import { UmrahDocsCard } from '@/components/umrah/UmrahDocsCard';
import { UmrahInstructions } from '@/components/umrah/UmrahInstructions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function UmrahTab() {
  const c = useColors();
  const { lang, t: globalT } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 16);

  // Local translator wrapper
  const t = (key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const local = (umrahUi as any)[key]?.[lang];
    return local || globalT(key as any);
  };

  // Queries
  const { data: currentUser } = useGetCurrentUser({
    query: { enabled: !!authUser, queryKey: getGetCurrentUserQueryKey() },
  });

  const { data: visas } = useListVisas(undefined, {
    query: { enabled: !!authUser, queryKey: getListVisasQueryKey(undefined) },
  });

  const { data: applications } = useListVisaApplications(undefined, {
    query: { enabled: !!authUser, queryKey: getListVisaApplicationsQueryKey(undefined) },
  });

  // Find umrah visa logic
  const umrahVisa = useMemo(() => {
    return (visas || []).find((v) => v.category === 'umrah');
  }, [visas]);

  // Find latest umrah application
  const latestUmrahApp = useMemo(() => {
    if (!applications || !visas) return undefined;
    const umrahVisaIds = visas.filter(v => v.category === 'umrah').map(v => v.id);
    // If no specific umrah visa found, fallback to visa id 15 as requested
    if (umrahVisaIds.length === 0) umrahVisaIds.push(15);
    
    const umrahApps = applications.filter(app => umrahVisaIds.includes(app.visaId));
    // Sort by created at descending
    umrahApps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return umrahApps[0];
  }, [applications, visas]);

  const handleApply = () => {
    const visaId = umrahVisa?.id || 15;
    router.push(`/umrah-visa?visaId=${visaId}` as never);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <UmrahHero 
        title={t('umrahUi.center')} 
        subtitle={t('umrahUi.subtitle')} 
      />

      <View style={styles.content}>
        {/* Main Apply CTA */}
        <Card style={[styles.applyCard, { borderColor: c.umrahGreen, borderWidth: 1.5 }]}>
          <View style={styles.applyCardContent}>
            <View style={styles.applyTextWrap}>
              <Text style={[styles.applyTitle, { color: c.foreground }]}>{t('umrahUi.applyBtn')}</Text>
              <Text style={[styles.applyDesc, { color: c.mutedForeground }]}>{t('umrahUi.applyDesc')}</Text>
            </View>
            <View style={[styles.applyPriceBox, { backgroundColor: c.umrahGreen + '15' }]}>
              {umrahVisa ? (
                <>
                  <Text style={[styles.applyPrice, { color: c.umrahGreen }]}>{umrahVisa.fee}</Text>
                  <Text style={[styles.applyCurrency, { color: c.umrahGreen }]}>{umrahVisa.currency}</Text>
                </>
              ) : (
                <Text style={[styles.applyPrice, { color: c.umrahGreen, fontSize: 16 }]}>---</Text>
              )}
            </View>
          </View>
          <Button 
            label={t('umrahUi.applyBtn')} 
            onPress={handleApply}
            style={{ backgroundColor: c.umrahGreen }}
          />
        </Card>

        {/* Tracking & Docs */}
        <UmrahTrackingCard application={latestUmrahApp} t={t} />
        <UmrahDocsCard user={currentUser || authUser || undefined} t={t} />

        {/* Guidelines */}
        <UmrahInstructions t={t} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    marginTop: -24, // Pull up over the hero gradient
  },
  applyCard: {
    padding: 24,
    marginBottom: 24,
    boxShadow: '0px 8px 16px rgba(11, 94, 59, 0.1)',
    elevation: 8,
  },
  applyCardContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  applyTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  applyTitle: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 22,
    marginBottom: 4,
  },
  applyDesc: {
    fontFamily: 'Cairo_400Regular',
    fontSize: 14,
  },
  applyPriceBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyPrice: {
    fontFamily: 'Cairo_700Bold',
    fontSize: 24,
    lineHeight: 28,
  },
  applyCurrency: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 12,
  },
});
