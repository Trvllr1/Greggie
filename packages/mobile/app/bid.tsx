import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS } from '../src/theme';
import { useProduct, getApiClient } from '../src/hooks';

export default function BidScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { product, loading: productLoading } = useProduct(productId);
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  const currentBid = product ? product.price_cents / 100 : 150;
  const minIncrement = 10;
  const minBid = currentBid + minIncrement;

  const quickBids = [
    minBid,
    minBid + 25,
    minBid + 50,
    minBid + 100,
  ];

  const handlePlaceBid = () => {
    const amount = parseFloat(bidAmount);
    if (!amount || amount < minBid) return;

    setIsPlacing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (productId) {
      getApiClient()
        .placeBid(productId, Math.round(amount * 100))
        .then(() => router.replace('/success'))
        .catch(() => router.replace('/success'))
        .finally(() => setIsPlacing(false));
    } else {
      setTimeout(() => {
        setIsPlacing(false);
        router.replace('/success');
      }, 1200);
    }
  };

  return (
    <Animated.View
      entering={SlideInDown.duration(400).springify().damping(20)}
      style={[styles.container, { paddingBottom: insets.bottom }]}
    >
      {/* Handle bar */}
      <View style={styles.handleBar}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Place a Bid</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current bid display */}
        <View style={styles.currentBidContainer}>
          <Text style={styles.currentBidLabel}>Current Highest Bid</Text>
          <Text style={styles.currentBidAmount}>${currentBid.toFixed(2)}</Text>
          <Text style={styles.minimumBid}>
            Minimum bid: ${minBid.toFixed(2)}
          </Text>
        </View>

        {/* Quick bid buttons */}
        <View style={styles.quickBidsContainer}>
          <Text style={styles.quickBidsLabel}>Quick Bid</Text>
          <View style={styles.quickBidsRow}>
            {quickBids.map((amount) => (
              <Pressable
                key={amount}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBidAmount(amount.toString());
                }}
                style={[
                  styles.quickBidButton,
                  bidAmount === amount.toString() && styles.quickBidActive,
                ]}
              >
                <Text
                  style={[
                    styles.quickBidText,
                    bidAmount === amount.toString() && styles.quickBidTextActive,
                  ]}
                >
                  ${amount}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Custom bid input */}
        <View style={styles.customBidContainer}>
          <Text style={styles.customBidLabel}>Or enter custom amount</Text>
          <View style={styles.inputRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              value={bidAmount}
              onChangeText={setBidAmount}
              placeholder={minBid.toString()}
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              style={styles.bidInput}
            />
          </View>
        </View>

        {/* Bid info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🏆 Highest bidder when the auction ends wins the item. You'll be 
            notified if you're outbid.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.ctaContainer}>
        <Pressable
          onPress={handlePlaceBid}
          disabled={isPlacing || !bidAmount || parseFloat(bidAmount) < minBid}
          style={[
            styles.ctaButton,
            (!bidAmount || parseFloat(bidAmount) < minBid || isPlacing) && styles.ctaDisabled,
          ]}
        >
          {isPlacing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaText}>
              {bidAmount ? `Place Bid — $${parseFloat(bidAmount).toFixed(2)}` : 'Enter a bid amount'}
            </Text>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.xl,
  },

  // Current bid
  currentBidContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  currentBidLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.sm,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  currentBidAmount: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
  },
  minimumBid: {
    color: COLORS.accent,
    fontSize: FONT.sm,
    fontWeight: '500',
    marginTop: SPACING.xs,
  },

  // Quick bids
  quickBidsContainer: {
    gap: SPACING.sm,
  },
  quickBidsLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.sm,
    fontWeight: '500',
  },
  quickBidsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickBidButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  quickBidActive: {
    backgroundColor: COLORS.accent + '20',
    borderColor: COLORS.accent,
  },
  quickBidText: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '600',
  },
  quickBidTextActive: {
    color: COLORS.accent,
  },

  // Custom bid
  customBidContainer: {
    gap: SPACING.sm,
  },
  customBidLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.sm,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
  },
  dollarSign: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT.xl,
    fontWeight: '600',
  },
  bidInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: FONT.xl,
    fontWeight: '600',
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.xs,
  },

  // Info
  infoBox: {
    backgroundColor: 'rgba(129,140,248,0.1)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT.sm,
    lineHeight: 20,
  },

  // CTA
  ctaContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
  },
});
