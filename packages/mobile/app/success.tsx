import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS } from '../src/theme';

export default function SuccessScreen() {
  const router = useRouter();
  const checkScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    checkScale.value = withDelay(
      200,
      withSequence(
        withSpring(1.3, { damping: 8, stiffness: 150 }),
        withSpring(1, { damping: 12, stiffness: 100 }),
      ),
    );
    textOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.checkCircle, checkStyle]}>
        <Text style={styles.checkEmoji}>✅</Text>
      </Animated.View>

      <Animated.View style={[styles.textContainer, textStyle]} entering={FadeIn.delay(400)}>
        <Text style={styles.title}>Purchase Complete!</Text>
        <Text style={styles.subtitle}>
          Your order has been confirmed. Check your email for details.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.buttonsContainer, textStyle]} entering={FadeIn.delay(700)}>
        <Pressable
          onPress={() => router.replace('/mall')}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Continue Shopping</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(52,211,153,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  checkEmoji: {
    fontSize: 48,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT.xxl,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT.md,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonsContainer: {
    width: '100%',
    gap: SPACING.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT.md,
    fontWeight: '500',
  },
});
