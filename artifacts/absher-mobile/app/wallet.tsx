import React, { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { EmptyState } from '@/components/EmptyState';

// Hardcoded transactions for display
const TRANSACTIONS = [
  { id: '1', title: 'إيداع رصيد', date: '2024-05-15T10:30:00Z', amount: 5000, type: 'credit', status: 'completed' },
  { id: '2', title: 'حجز رحلة طيران (جدة - دبي)', date: '2024-05-12T14:20:00Z', amount: -1250, type: 'debit', status: 'completed' },
  { id: '3', title: 'استرداد حجز فندق', date: '2024-05-10T09:15:00Z', amount: 800, type: 'credit', status: 'completed' },
  { id: '4', title: 'رسوم استخراج تأشيرة شنغن', date: '2024-05-01T11:45:00Z', amount: -450, type: 'debit', status: 'completed' },
  { id: '5', title: 'حوالة بنكية', date: '2024-04-28T16:00:00Z', amount: 2000, type: 'credit', status: 'completed' },
];

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 20);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleAction = (actionName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('قريباً', `ميزة ${actionName} ستكون متاحة قريباً.`);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: '#0A2342' }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: 'Cairo_700Bold' }]}>المحفظة</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: bottomInset + 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#D4AF37" />
        }
      >
        {/* Balance Card */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#1e3c72', '#0A2342']}
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative BG pattern elements */}
            <View style={styles.cardDeco1} />
            <View style={styles.cardDeco2} />
            
            <View style={styles.cardHeader}>
              <View style={[styles.badge, { backgroundColor: 'rgba(212, 175, 55, 0.2)' }]}>
                <Text style={[styles.badgeText, { color: '#D4AF37', fontFamily: 'Cairo_600SemiBold' }]}>نشط</Text>
              </View>
              <Text style={[styles.cardLabel, { fontFamily: 'Cairo_400Regular' }]}>الرصيد المتاح</Text>
            </View>
            
            <View style={styles.balanceRow}>
              <Text style={[styles.currency, { fontFamily: 'Cairo_600SemiBold' }]}>ر.س</Text>
              <Text style={[styles.balanceAmount, { fontFamily: 'Cairo_700Bold' }]}>6,100.00</Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={[styles.accountLabel, { fontFamily: 'Cairo_400Regular' }]}>رقم الحساب</Text>
              <Text style={[styles.accountNumber, { fontFamily: 'Cairo_600SemiBold' }]}>**** **** **** 4921</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => handleAction('السحب')}>
            <View style={[styles.actionIconWrap, { backgroundColor: colors.muted }]}>
              <Ionicons name="arrow-down-outline" size={24} color="#0A2342" />
            </View>
            <Text style={[styles.actionText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>سحب</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => handleAction('التحويل')}>
            <View style={[styles.actionIconWrap, { backgroundColor: colors.muted }]}>
              <Ionicons name="swap-horizontal-outline" size={24} color="#0A2342" />
            </View>
            <Text style={[styles.actionText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>تحويل</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => handleAction('الإيداع')}>
            <View style={[styles.actionIconWrap, { backgroundColor: '#FFF9E6' }]}>
              <Ionicons name="add-outline" size={24} color="#D4AF37" />
            </View>
            <Text style={[styles.actionText, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>إيداع</Text>
          </Pressable>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={[styles.transactionsTitle, { color: colors.foreground, fontFamily: 'Cairo_700Bold' }]}>سجل العمليات</Text>
          </View>

          {TRANSACTIONS.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="لا توجد عمليات"
              description="لم تقم بأي عمليات مالية حتى الآن"
            />
          ) : (
            <View style={[styles.transactionsList, { backgroundColor: colors.card }]}>
              {TRANSACTIONS.map((tx, index) => {
                const isCredit = tx.type === 'credit';
                const txColor = isCredit ? '#16A34A' : colors.foreground;
                return (
                  <View 
                    key={tx.id} 
                    style={[
                      styles.transactionItem, 
                      { borderBottomColor: colors.border },
                      index === TRANSACTIONS.length - 1 && { borderBottomWidth: 0 }
                    ]}
                  >
                    <View style={styles.txLeft}>
                      <Text style={[styles.txAmount, { color: txColor, fontFamily: 'Cairo_700Bold' }]}>
                        {isCredit ? '+' : ''}{tx.amount.toLocaleString('ar-SA')} ر.س
                      </Text>
                      <Text style={[styles.txDate, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                        {formatDate(tx.date)}
                      </Text>
                    </View>

                    <View style={styles.txRight}>
                      <View style={styles.txInfo}>
                        <Text style={[styles.txTitle, { color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]} numberOfLines={1}>
                          {tx.title}
                        </Text>
                        <Text style={[styles.txStatus, { color: colors.mutedForeground, fontFamily: 'Cairo_400Regular' }]}>
                          ناجحة
                        </Text>
                      </View>
                      <View style={[styles.txIconWrap, { backgroundColor: isCredit ? 'rgba(22, 163, 74, 0.1)' : colors.muted }]}>
                        <Ionicons 
                          name={isCredit ? 'arrow-down-outline' : 'arrow-up-outline'} 
                          size={18} 
                          color={isCredit ? '#16A34A' : '#0A2342'} 
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 20 },
  
  cardContainer: { padding: 16, marginTop: 8 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    height: 180,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#0A2342',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardDeco1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', top: -50, right: -50 },
  cardDeco2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(212, 175, 55, 0.08)', bottom: -40, left: -20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, alignSelf: 'flex-end', marginTop: 10 },
  balanceAmount: { color: '#FFFFFF', fontSize: 40, lineHeight: 48 },
  currency: { color: '#D4AF37', fontSize: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  accountLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  accountNumber: { color: 'rgba(255,255,255,0.9)', fontSize: 14, letterSpacing: 2 },

  actionsRow: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center', gap: 8 },
  actionIconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 14 },

  transactionsSection: { padding: 16, marginTop: 8 },
  transactionsHeader: { marginBottom: 12, paddingHorizontal: 4 },
  transactionsTitle: { fontSize: 18, textAlign: 'right' },
  transactionsList: { borderRadius: 16, overflow: 'hidden' },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  txLeft: { alignItems: 'flex-start', gap: 4 },
  txAmount: { fontSize: 16, direction: 'ltr' },
  txDate: { fontSize: 12 },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' },
  txInfo: { alignItems: 'flex-end', gap: 2, flex: 1 },
  txTitle: { fontSize: 15, textAlign: 'right' },
  txStatus: { fontSize: 12 },
  txIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});