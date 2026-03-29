import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Easing } from "react-native";
import { SourceBadge } from "./SourceBadge";
import { ButterflyIcon } from "./ButterflyIcon";
import { useTheme } from "../theme";
import { DetectedPlatform } from "../utils/platformDetect";

interface MaterializingCardProps {
  /** Platform detected client-side before API response */
  detected: DetectedPlatform;
  /** Once the real item arrives, these populate and the card "completes" */
  authorHandle?: string;
  caption?: string;
  mediaUrl?: string;
  /** true while waiting for the API */
  loading: boolean;
  /** Called when the full reveal animation finishes */
  onRevealed?: () => void;
}

/**
 * Magic Drop card — shows a phantom card that sequentially reveals:
 * 1. Platform badge (instant)
 * 2. Spinning butterfly loader
 * 3. Author types letter-by-letter
 * 4. Caption fades in
 * 5. Media slides up
 * 6. Arrival glow pulse
 */
export function MaterializingCard({
  detected,
  authorHandle,
  caption,
  mediaUrl,
  loading,
  onRevealed,
}: MaterializingCardProps) {
  const theme = useTheme();

  // Animation values
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const authorAnim = useRef(new Animated.Value(0)).current;
  const captionAnim = useRef(new Animated.Value(0)).current;
  const mediaAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Typewriter state for author
  const [typedAuthor, setTypedAuthor] = React.useState("");
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phase 1: Badge slides in immediately
  useEffect(() => {
    Animated.spring(badgeAnim, {
      toValue: 1,
      tension: 80,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [badgeAnim]);

  // Shimmer while loading
  useEffect(() => {
    if (loading) {
      const shimmer = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      shimmer.start();

      // Spinning butterfly
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      spin.start();

      return () => {
        shimmer.stop();
        spin.stop();
      };
    }
  }, [loading, shimmerAnim, spinAnim]);

  // Phase 2: When data arrives, run the reveal sequence
  useEffect(() => {
    if (loading || !authorHandle) return;

    // Typewriter effect for author
    let idx = 0;
    const fullAuthor = `@${authorHandle}`;
    setTypedAuthor("");
    typingRef.current = setInterval(() => {
      idx++;
      setTypedAuthor(fullAuthor.slice(0, idx));
      if (idx >= fullAuthor.length) {
        if (typingRef.current) clearInterval(typingRef.current);
      }
    }, 40);

    // Author fade in
    Animated.timing(authorAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Caption fade in (staggered)
    const captionDelay = setTimeout(() => {
      Animated.timing(captionAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }, authorHandle.length * 40 + 200);

    // Media slide up (staggered more)
    const mediaDelay = setTimeout(() => {
      Animated.spring(mediaAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: false,
      }).start();
    }, authorHandle.length * 40 + 600);

    // Arrival glow
    const glowDelay = setTimeout(() => {
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start(() => {
        onRevealed?.();
      });
    }, authorHandle.length * 40 + 1000);

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
      clearTimeout(captionDelay);
      clearTimeout(mediaDelay);
      clearTimeout(glowDelay);
    };
  }, [loading, authorHandle]);

  const badgeScale = badgeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const mediaSlide = mediaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const badgeColors =
    theme.colors.badges[detected.platform] || theme.colors.badges.default;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderAccent,
          ...theme.shadows.card,
          shadowColor: theme.colors.accent,
          shadowRadius: glowShadowRadius as unknown as number,
        },
      ]}
    >
      {/* Badge — springs in */}
      <Animated.View style={{ transform: [{ scale: badgeScale }] }}>
        <SourceBadge platform={detected.platform} />
      </Animated.View>

      {/* Loading state: spinning butterfly + shimmer */}
      {loading && (
        <View style={styles.loadingRow}>
          <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
            <ButterflyIcon size={22} />
          </Animated.View>
          <Animated.View
            style={[
              styles.shimmerBar,
              {
                backgroundColor: theme.colors.skeletonHighlight,
                opacity: shimmerOpacity,
              },
            ]}
          />
        </View>
      )}

      {/* Author — typewriter */}
      {!loading && typedAuthor ? (
        <Animated.Text
          style={[
            styles.author,
            { color: theme.colors.textPrimary, opacity: authorAnim },
          ]}
        >
          {typedAuthor}
          <Text style={{ color: theme.colors.accent }}>|</Text>
        </Animated.Text>
      ) : null}

      {/* Caption — fades in */}
      {!loading && caption ? (
        <Animated.Text
          style={[
            styles.caption,
            { color: theme.colors.textSecondary, opacity: captionAnim },
          ]}
          numberOfLines={3}
        >
          {caption}
        </Animated.Text>
      ) : null}

      {/* Media — slides up */}
      {!loading && mediaUrl ? (
        <Animated.Image
          source={{ uri: mediaUrl }}
          style={[
            styles.media,
            {
              backgroundColor: theme.colors.surfaceElevated,
              transform: [{ translateY: mediaSlide }],
              opacity: mediaAnim,
            },
          ]}
          resizeMode="cover"
        />
      ) : null}

      {/* Shimmer placeholder lines when loading */}
      {loading && (
        <View style={styles.placeholders}>
          <Animated.View
            style={[
              styles.placeholderLine,
              {
                backgroundColor: theme.colors.skeletonHighlight,
                opacity: shimmerOpacity,
                width: "60%",
              },
            ]}
          />
          <Animated.View
            style={[
              styles.placeholderLine,
              {
                backgroundColor: theme.colors.skeletonHighlight,
                opacity: shimmerOpacity,
                width: "90%",
              },
            ]}
          />
          <Animated.View
            style={[
              styles.placeholderBlock,
              {
                backgroundColor: theme.colors.skeletonBase,
                opacity: shimmerOpacity,
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  shimmerBar: {
    height: 14,
    borderRadius: 7,
    flex: 1,
  },
  author: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  caption: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  media: {
    marginTop: 14,
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  placeholders: {
    marginTop: 12,
    gap: 8,
  },
  placeholderLine: {
    height: 12,
    borderRadius: 6,
  },
  placeholderBlock: {
    height: 160,
    borderRadius: 12,
  },
});
