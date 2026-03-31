import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/theme';

const TRANSACTIONS = [
  { id: '1', type: 'gift_sent', label: 'Sent Diamond Gift', amount: -10, date: '2 min ago' },
  { id: '2', type: 'purchase', label: 'Tech Gadget Pro', amount: -49.99, date: '1h ago' },
  { id: '3', type: 'deposit', label: 'Added Funds', amount: 100, date: 'Yesterday' },
  { id: '4', type: 'gift_sent', label: 'Sent Rocket Gift', amount: -50, date: '2 days ago' },
  { id: '5', type: 'refund', label: 'Order Refund', amount: 29.99, date: '3 days ago' },
];

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [balance] = useState(245.5);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>${balance.toFixed(2)}</Text>
          <View style={styles.balanceActions}>
            <Pressable
              style={styles.balanceBtn}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Text style={styles.balanceBtnText}>+ Add Funds</Text>
            </Pressable>
            <Pressable
              style={[styles.balanceBtn, styles.balanceBtnOutline]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Text style={[styles.balanceBtnText, { color: 'rgba(255,255,255,0.7)' }]}>
                Withdraw
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {TRANSACTIONS.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <Text style={styles.txIcon}>
              {tx.amount >= 0 ? '💚' : tx.type === 'gift_sent' ? '🎁' : '🛍️'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.txLabel}>{tx.label}</Text>
              <Text style={styles.txDate}>{tx.date}</Text>
            </View>
            <Text style={[styles.txAmount, tx.amount >= 0 && styles.txPositive]}>
              {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backText: { color: 'rgba(255,255,255,0.6)', fontSize: FONT.md },
  headerTitle: { color: '#FFFFFF', fontSize: FONT.lg, fontWeight: '700' },
  content: { padding: SPACING.md, gap: SPACING.lg, paddingBottom: SPACING.xxl },

  balanceCard: {
    backgroundColor: '#4338CA',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FONT.sm },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
    marginVertical: SPACING.sm,
  },
  balanceActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  balanceBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  balanceBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  balanceBtnText: { color: '#FFFFFF', fontSize: FONT.sm, fontWeight: '700' },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  txIcon: { fontSize: 20 },
  txLabel: { color: '#FFFFFF', fontSize: FONT.md, fontWeight: '500' },
  txDate: { color: 'rgba(255,255,255,0.4)', fontSize: FONT.xs, marginTop: 2 },
  txAmount: { color: '#F87171', fontSize: FONT.md, fontWeight: '700' },
  txPositive: { color: '#34D399' },
});
