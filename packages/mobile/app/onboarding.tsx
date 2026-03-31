import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, CATEGORY_COLORS, SPACING, FONT, RADIUS } from '../src/theme';
import { ButterflyIcon } from '../src/components/ButterflyIcon';
import { CATEGORIES } from '@greggie/core';

const { width: SCREEN_W } = Dimensions.get('window');
const STORAGE_KEY = 'greggie_onboarding_done';

const CATEGORY_ITEMS = CATEGORIES.map((key) => ({
  key,
  icon: {
    Tech: '💻', Fashion: '👗', Collectibles: '🃏', Beauty: '💄',
    Food: '🍜', Art: '🎨', Fitness: '💪', Automotive: '🏎️',
    Home: '🏡', Luxury: '💎', Pets: '🐾', Travel: '✈️',
  }[key] ?? '🏷️',
  color: CATEGORY_COLORS[key] ?? COLORS.accent,
}));

type Step = 'welcome' | 'pick' | 'building';

export async function shouldSkipOnboarding(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [buildProgress, setBuildProgress] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Welcome sonic boom
  const boomScale = useSharedValue(0.3);
  const boomOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(30);
  const btnOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo entrance
    logoScale.value = withDelay(300, withSpring(1, { damping: 8, stiffness: 120 }));
    // Sonic boom ring
    setTimeout(() => {
      boomScale.value = withTiming(5, { duration: 600 });
      boomOpacity.value = withTiming(0, { duration: 600 });
    }, 600);
    // Text
    contentOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    contentY.value = withDelay(800, withSpring(0, { damping: 14, stiffness: 160 }));
    // Button
    btnOpacity.value = withDelay(1200, withTiming(1, { duration: 400 }));
  }, []);

  const boomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boomScale.value }],
    opacity: boomOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
  }));

  const transitionTo = (next: Step) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 250);
  };

  const handleToggle = (key: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    router.replace('/mall');
  };

  const handleBuild = () => {
    transitionTo('building');
    let progress = 0;
    const timer = setInterval(() => {
      progress += 0.12;
      if (progress >= 1) {
        progress = 1;
        clearInterval(timer);
        setTimeout(() => finishOnboarding(), 500);
      }
      setBuildProgress(progress);
    }, 250);
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.inner, { opacity: transitioning ? 0.3 : 1 }]}
      >
        {/* ─── Step 1: Welcome ─── */}
        {step === 'welcome' && (
          <View style={styles.welcomeContainer}>
            <View style={styles.logoArea}>
              {/* Sonic boom ring */}
              <Animated.View style={[styles.boomRing, boomStyle]} />
              <Animated.View style={logoStyle}>
                <ButterflyIcon size={80} />
              </Animated.View>
            </View>

            <Animated.View style={[styles.textArea, contentStyle]}>
              <Text style={styles.welcomeTitle}>Welcome to Greggie</Text>
              <Text style={styles.welcomeSubtitle}>Live commerce, reimagined</Text>
            </Animated.View>

            <Animated.View style={btnStyle}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  transitionTo('pick');
                }}
                style={styles.getStartedButton}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </Pressable>
            </Animated.View>
          </View>
        )}

        {/* ─── Step 2: Category Picker ─── */}
        {step === 'pick' && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.pickContainer}
          >
            <Text style={styles.pickTitle}>What interests you?</Text>
            <Text style={styles.pickSubtitle}>
              Pick categories to personalize your mall
            </Text>

            <View style={styles.categoryGrid}>
              {CATEGORY_ITEMS.map(({ key, icon, color }) => {
                const active = selected.has(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => handleToggle(key)}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: active ? `${color}25` : 'rgba(255,255,255,0.04)',
                        borderColor: active ? color : 'rgba(255,255,255,0.08)',
                      },
                    ]}
                  >
                    <Text style={styles.categoryIcon}>{icon}</Text>
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: active ? color : '#94A3B8' },
                      ]}
                    >
                      {key}
                    </Text>
                    {active && (
                      <View style={[styles.checkBadge, { backgroundColor: color }]}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleBuild();
              }}
              disabled={selected.size === 0}
              style={[
                styles.buildButton,
                selected.size === 0 && styles.buildButtonDisabled,
              ]}
            >
              <Text style={styles.buildButtonText}>
                Build My Mall ({selected.size})
              </Text>
            </Pressable>

            <Pressable onPress={finishOnboarding}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ─── Step 3: Building ─── */}
        {step === 'building' && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.buildingContainer}
          >
            <ButterflyIcon size={50} />
            <Text style={styles.buildingTitle}>Building your mall...</Text>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(buildProgress * 100)}%` },
                ]}
              />
            </View>

            <Text style={styles.buildingStatus}>
              {buildProgress < 0.3
                ? 'Connecting to stores...'
                : buildProgress < 0.7
                  ? 'Curating the best drops...'
                  : buildProgress < 1
                    ? 'Almost there...'
                    : 'Welcome in! ✨'}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const COL_COUNT = 3;
const GRID_GAP = SPACING.sm;
const CAT_W = (SCREEN_W - SPACING.lg * 2 - GRID_GAP * (COL_COUNT - 1)) / COL_COUNT;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.97)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  // Welcome
  welcomeContainer: {
    alignItems: 'center',
    gap: SPACING.lg,
  },
  logoArea: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  boomRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: COLORS.success,
  },
  textArea: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: FONT.lg,
    color: '#94A3B8',
    marginTop: SPACING.xs,
  },
  getStartedButton: {
    backgroundColor: '#6366F1',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
  },

  // Category Picker
  pickContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    width: '100%',
  },
  pickTitle: {
    fontSize: FONT.xxl,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  pickSubtitle: {
    fontSize: FONT.sm,
    color: '#94A3B8',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: SPACING.lg,
  },
  categoryButton: {
    width: CAT_W,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    position: 'relative',
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryLabel: {
    fontSize: FONT.xs,
    fontWeight: '500',
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  buildButton: {
    backgroundColor: '#6366F1',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  buildButtonDisabled: {
    opacity: 0.4,
  },
  buildButtonText: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
  },
  skipText: {
    color: '#64748B',
    fontSize: FONT.sm,
  },

  // Building
  buildingContainer: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  buildingTitle: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  progressBarBg: {
    width: 256,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1A1A22',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#818CF8',
  },
  buildingStatus: {
    fontSize: FONT.sm,
    color: '#64748B',
  },
});
