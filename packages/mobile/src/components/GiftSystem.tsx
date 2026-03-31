import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

export const GIFTS = [
  { id: 'rose', name: 'Rose', icon: '🌹', price: 1 },
  { id: 'coffee', name: 'Coffee', icon: '☕', price: 3 },
  { id: 'diamond', name: 'Diamond', icon: '💎', price: 10 },
  { id: 'rocket', name: 'Rocket', icon: '🚀', price: 50 },
] as const;

export type Gift = (typeof GIFTS)[number];

// ── Gift Menu (bottom row) ──
interface GiftMenuProps {
  onSend: (gift: Gift) => void;
  onClose: () => void;
}

export function GiftMenu({ onSend, onClose }: GiftMenuProps) {
  return (
    <Animated.View
      entering={SlideInDown.duration(250).springify().damping(20)}
      exiting={SlideOutDown.duration(200)}
      style={styles.menuContainer}
    >
      <Pressable onPress={onClose} style={styles.menuBackdrop} />
      <View style={styles.menu}>
        <View style={styles.menuHandle} />
        <Text style={styles.menuTitle}>Send a Gift</Text>
        <View style={styles.giftRow}>
          {GIFTS.map((gift) => (
            <Pressable
              key={gift.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSend(gift);
              }}
              style={styles.giftButton}
            >
              <Text style={styles.giftIcon}>{gift.icon}</Text>
              <Text style={styles.giftName}>{gift.name}</Text>
              <Text style={styles.giftPrice}>${gift.price}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Gift Animation (big emoji rain) ──
interface GiftAnimationProps {
  gift: Gift;
  id: number;
  onComplete: (id: number) => void;
}

export function GiftAnimation({ gift, id, onComplete }: GiftAnimationProps) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.2);
  const translateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(2.5, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
    translateY.value = withTiming(-120, { duration: 3000, easing: Easing.out(Easing.ease) });
    opacity.value = withDelay(2000, withTiming(0, { duration: 1000 }, () => {
      runOnJS(onComplete)(id);
    }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.giftAnimContainer, animStyle]}>
      <Text style={styles.giftAnimEmoji}>{gift.icon}</Text>
    </Animated.View>
  );
}

// ── In-flight Gifts Layer ──
interface ActiveGift {
  id: number;
  gift: Gift;
}

interface GiftAnimationsProps {
  activeGifts: ActiveGift[];
  onComplete: (id: number) => void;
}

export function GiftAnimations({ activeGifts, onComplete }: GiftAnimationsProps) {
  if (activeGifts.length === 0) return null;

  return (
    <View style={styles.animLayer} pointerEvents="none">
      {activeGifts.map((ag) => (
        <GiftAnimation
          key={ag.id}
          id={ag.id}
          gift={ag.gift}
          onComplete={onComplete}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menu: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  menuTitle: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  giftRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  giftButton: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 72,
  },
  giftIcon: {
    fontSize: 32,
  },
  giftName: {
    color: '#FFFFFF',
    fontSize: FONT.xs,
    fontWeight: '600',
  },
  giftPrice: {
    color: COLORS.warning,
    fontSize: FONT.xs,
    fontWeight: '700',
  },

  // Animations
  animLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
  },
  giftAnimContainer: {
    position: 'absolute',
  },
  giftAnimEmoji: {
    fontSize: 48,
  },
});
