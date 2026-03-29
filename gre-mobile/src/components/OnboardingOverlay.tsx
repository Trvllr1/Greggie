import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { ButterflyIcon } from "./ButterflyIcon";
import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";

const PLATFORMS = [
  { key: "youtube", icon: "▶️", label: "YouTube", color: "#FF0000" },
  { key: "tiktok", icon: "🎵", label: "TikTok", color: "#25F4EE" },
  { key: "instagram", icon: "📸", label: "Instagram", color: "#E1306C" },
  { key: "facebook", icon: "👥", label: "Facebook", color: "#1877F2" },
  { key: "reddit", icon: "🔺", label: "Reddit", color: "#FF4500" },
  { key: "open-web", icon: "🌐", label: "Web", color: "#6366F1" },
];

interface OnboardingOverlayProps {
  onComplete: (selectedPlatforms: string[]) => void;
}

type Step = "welcome" | "pick" | "building";

const STORAGE_KEY = "greggie_onboarding_done";

/**
 * Check if onboarding has been completed.
 * Uses localStorage on web, skips on native (no AsyncStorage dep needed).
 */
export function hasCompletedOnboarding(): boolean {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }
  // For native, would use AsyncStorage — for now always show
  return false;
}

export function markOnboardingDone(): void {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  }
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [buildProgress, setBuildProgress] = useState(0);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const butterflyScale = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const boomRing = useRef(new Animated.Value(0)).current;
  const boomOpacity = useRef(new Animated.Value(0)).current;
  const stepFade = useRef(new Animated.Value(1)).current;

  // Step 1: Welcome — butterfly sonic boom + title reveal
  useEffect(() => {
    Animated.sequence([
      // Fade in backdrop
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      // Butterfly scales up
      Animated.spring(butterflyScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: false,
      }),
      // Sonic boom
      Animated.parallel([
        Animated.timing(boomRing, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(boomOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(boomOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ]),
      ]),
      // Title slides in
      Animated.parallel([
        Animated.spring(titleSlide, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, []);

  const transitionToStep = (next: Step) => {
    Animated.timing(stepFade, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setStep(next);
      Animated.timing(stepFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleTogglePlatform = async (key: string) => {
    await triggerHaptic();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStartBuilding = async () => {
    await triggerHaptic();
    transitionToStep("building");

    // Simulate feed building progress
    let progress = 0;
    const timer = setInterval(() => {
      progress += 0.15;
      if (progress >= 1) {
        progress = 1;
        clearInterval(timer);
        setTimeout(() => {
          markOnboardingDone();
          onComplete(Array.from(selected));
        }, 600);
      }
      setBuildProgress(progress);
    }, 300);
  };

  const boomScale = boomRing.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 5],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeIn }]}>
      <Animated.View style={{ opacity: stepFade, flex: 1, justifyContent: "center", alignItems: "center" }}>
        {step === "welcome" && (
          <View style={styles.welcomeWrap}>
            {/* Sonic boom ring */}
            <Animated.View
              style={[
                styles.boomRing,
                {
                  opacity: boomOpacity,
                  transform: [{ scale: boomScale }],
                },
              ]}
            />

            {/* Butterfly */}
            <Animated.View style={{ transform: [{ scale: butterflyScale }] }}>
              <ButterflyIcon size={80} hovered />
            </Animated.View>

            {/* Title */}
            <Animated.View style={{ transform: [{ translateY: titleSlide }] }}>
              <Text style={[styles.welcomeTitle, { color: "#F1F5F9" }]}>
                Welcome to Greggie
              </Text>
              <Text style={[styles.welcomeSub, { color: "#94A3B8" }]}>
                Your entire internet, unified
              </Text>
            </Animated.View>

            <Pressable
              onPress={() => transitionToStep("pick")}
              style={[styles.ctaBtn, { backgroundColor: theme.colors.accentMuted }]}
            >
              <Text style={styles.ctaText}>Get Started</Text>
            </Pressable>
          </View>
        )}

        {step === "pick" && (
          <View style={styles.pickWrap}>
            <Text style={[styles.pickTitle, { color: "#F1F5F9" }]}>
              Pick your platforms
            </Text>
            <Text style={[styles.pickSub, { color: "#94A3B8" }]}>
              Choose what you love. We'll build your feed.
            </Text>

            <View style={styles.platformGrid}>
              {PLATFORMS.map(({ key, icon, label, color }) => {
                const isActive = selected.has(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => handleTogglePlatform(key)}
                    style={[
                      styles.platformCard,
                      {
                        backgroundColor: isActive
                          ? color + "25"
                          : "rgba(255,255,255,0.05)",
                        borderColor: isActive ? color : "rgba(255,255,255,0.1)",
                        transform: [{ scale: isActive ? 1.05 : 1 }],
                      },
                    ]}
                  >
                    <Text style={styles.platformIcon}>{icon}</Text>
                    <Text
                      style={[
                        styles.platformLabel,
                        { color: isActive ? color : "#94A3B8" },
                      ]}
                    >
                      {label}
                    </Text>
                    {isActive && (
                      <View style={[styles.checkMark, { backgroundColor: color }]}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleStartBuilding}
              style={[
                styles.ctaBtn,
                { backgroundColor: theme.colors.accentMuted },
                selected.size === 0 && { opacity: 0.5 },
              ]}
              disabled={selected.size === 0}
            >
              <Text style={styles.ctaText}>
                Build My Feed ({selected.size})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                markOnboardingDone();
                onComplete([]);
              }}
              style={styles.skipBtn}
            >
              <Text style={[styles.skipText, { color: "#64748B" }]}>Skip for now</Text>
            </Pressable>
          </View>
        )}

        {step === "building" && (
          <View style={styles.buildingWrap}>
            <ButterflyIcon size={50} hovered />
            <Text style={[styles.buildingTitle, { color: "#F1F5F9" }]}>
              Building your feed...
            </Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.accent,
                    width: `${Math.round(buildProgress * 100)}%`,
                  },
                ]}
              />
            </View>

            <Text style={[styles.buildingSub, { color: "#64748B" }]}>
              {buildProgress < 0.3
                ? "Connecting to platforms..."
                : buildProgress < 0.7
                ? "Curating the best content..."
                : buildProgress < 1
                ? "Almost there..."
                : "Ready!"}
            </Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 10, 15, 0.97)",
    zIndex: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeWrap: {
    alignItems: "center",
    gap: 20,
  },
  boomRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#34D399",
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
    marginTop: 16,
  },
  welcomeSub: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 4,
  },
  ctaBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  pickWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    width: "100%",
    maxWidth: 400,
  },
  pickTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  pickSub: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  platformGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 8,
  },
  platformCard: {
    width: 110,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  platformIcon: {
    fontSize: 28,
  },
  platformLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  checkMark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  checkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  skipBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  buildingWrap: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 40,
    width: "100%",
  },
  buildingTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  progressTrack: {
    width: "100%",
    maxWidth: 280,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  buildingSub: {
    fontSize: 14,
  },
});
