import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS } from '../src/theme';
import { ButterflyIcon } from '../src/components/ButterflyIcon';
import { useAutoAuth } from '../src/hooks';
import { shouldSkipOnboarding } from './onboarding';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, ready } = useAutoAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [skipOnboarding, setSkipOnboarding] = useState(true);

  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const buttonsY = useSharedValue(20);

  useEffect(() => {
    shouldSkipOnboarding().then((skip) => {
      setSkipOnboarding(skip);
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    logoScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    buttonsOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    buttonsY.value = withDelay(600, withSpring(0, { damping: 15, stiffness: 100 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsY.value }],
  }));

  const handleEnterMall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onboardingChecked && !skipOnboarding) {
      router.push('/onboarding');
    } else {
      router.push('/mall');
    }
  };

  const handleEnterCreator = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/creator');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <ButterflyIcon size={64} />
        <Text style={styles.title}>Greggie™</Text>
        <Text style={styles.tagline}>The Live Commerce OS</Text>
      </Animated.View>

      <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
        <AnimatedPressable
          style={styles.primaryButton}
          onPress={handleEnterMall}
        >
          <Text style={styles.primaryButtonText}>Enter the Mall</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.secondaryButton}
          onPress={handleEnterCreator}
        >
          <Text style={styles.secondaryButtonText}>Enter as Creator</Text>
        </AnimatedPressable>
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
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT.hero,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1.5,
    marginTop: SPACING.lg,
  },
  tagline: {
    fontSize: FONT.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  buttonsContainer: {
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
    paddingHorizontal: SPACING.xxl,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: '#000000',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.full,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: FONT.md,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
});
