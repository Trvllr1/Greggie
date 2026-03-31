import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '../src/theme';
import { useProduct, getApiClient } from '../src/hooks';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { productId, channelId } = useLocalSearchParams<{ productId: string; channelId: string }>();
  const { product, loading: productLoading } = useProduct(productId);
  const [step, setStep] = useState<'DETAILS' | 'PAYMENT'>('DETAILS');
  const [isProcessing, setIsProcessing] = useState(false);

  const displayName = product?.name ?? 'Product';
  const price = product ? product.price_cents / 100 : 0;
  const imageUrl = product?.image_url ?? 'https://picsum.photos/400/400';
  const inventory = product?.inventory ?? 0;
  const description = product?.description ?? '';

  const handlePayment = () => {
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (productId && channelId) {
      getApiClient()
        .initCheckout(productId, 1, channelId)
        .then(() => router.replace('/success'))
        .catch(() => router.replace('/success'))
        .finally(() => setIsProcessing(false));
    } else {
      setTimeout(() => {
        setIsProcessing(false);
        router.replace('/success');
      }, 1500);
    }
  };

  if (productLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>
          {step === 'DETAILS' ? 'Product Details' : 'Checkout'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={step} entering={FadeIn.duration(250)}>
        {step === 'DETAILS' ? (
          <>
            {/* Product image */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.stockBadge}>
                <Text style={styles.stockText}>{inventory} left in stock</Text>
              </View>
            </View>

            {/* Product info */}
            <View style={styles.productInfo}>
              <View style={styles.priceRow}>
                <Text style={styles.productName}>{displayName}</Text>
                <Text style={styles.productPrice}>${price.toFixed(2)}</Text>
              </View>
              <View style={styles.stars}>
                <Text style={styles.starText}>⭐⭐⭐⭐☆ 4.2 (128 reviews)</Text>
              </View>
              <Text style={styles.description}>{description}</Text>
            </View>

            {/* Value props */}
            <View style={styles.valueProps}>
              <View style={styles.valueProp}>
                <Text style={styles.valuePropIcon}>🚚</Text>
                <View>
                  <Text style={styles.valuePropTitle}>Free Shipping</Text>
                  <Text style={styles.valuePropSubtitle}>2-3 business days</Text>
                </View>
              </View>
              <View style={styles.valueProp}>
                <Text style={styles.valuePropIcon}>↩️</Text>
                <View>
                  <Text style={styles.valuePropTitle}>Easy Returns</Text>
                  <Text style={styles.valuePropSubtitle}>30-day policy</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Payment summary */}
            <View style={styles.paymentSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Item</Text>
                <Text style={styles.summaryValue}>{displayName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={styles.summaryValue}>${price.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>Free</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${price.toFixed(2)}</Text>
              </View>
            </View>

            {/* Security note */}
            <View style={styles.securityNote}>
              <Text style={styles.securityIcon}>🔒</Text>
              <Text style={styles.securityText}>
                Your payment is secured with 256-bit encryption
              </Text>
            </View>
          </>
        )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.ctaContainer}>
        {step === 'DETAILS' ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setStep('PAYMENT');
            }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaText}>Continue to Checkout →</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePayment}
            disabled={isProcessing}
            style={[styles.ctaButton, styles.payButton, isProcessing && styles.ctaDisabled]}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>Pay ${price.toFixed(2)}</Text>
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#D1D5DB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#6B7280',
    fontSize: FONT.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },

  // Product image
  imageContainer: {
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  stockBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  stockText: {
    fontSize: FONT.xs,
    fontWeight: '700',
    color: '#111827',
  },

  // Product info
  productInfo: {
    gap: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: FONT.xxl,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  productPrice: {
    fontSize: FONT.xxl,
    fontWeight: '700',
    color: COLORS.accent,
  },
  stars: {
    flexDirection: 'row',
  },
  starText: {
    fontSize: FONT.sm,
    color: '#6B7280',
  },
  description: {
    fontSize: FONT.md,
    color: '#6B7280',
    lineHeight: 22,
  },

  // Value props
  valueProps: {
    flexDirection: 'row',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: SPACING.md,
  },
  valueProp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  valuePropIcon: {
    fontSize: 24,
  },
  valuePropTitle: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: '#111827',
  },
  valuePropSubtitle: {
    fontSize: FONT.xs,
    color: '#9CA3AF',
  },

  // Payment summary
  paymentSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: FONT.md,
  },
  summaryValue: {
    color: '#111827',
    fontSize: FONT.md,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  totalLabel: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.accent,
  },

  // Security
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#F0FDF4',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  securityIcon: {
    fontSize: 16,
  },
  securityText: {
    color: '#15803D',
    fontSize: FONT.sm,
    flex: 1,
  },

  // CTA
  ctaContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  ctaButton: {
    backgroundColor: '#111827',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  payButton: {
    backgroundColor: COLORS.accent,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
  },
});
