import React, { useRef, useEffect, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, Animated, Easing, Platform } from "react-native";
import { SourceBadge } from "./SourceBadge";
import { FeedItem } from "../services/api";
import { useTheme } from "../theme";

interface GridCardProps {
  item: FeedItem;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  /** Is this card currently playing? */
  isPlaying?: boolean;
  /** Is this card paused (was playing, now interrupted)? */
  isPaused?: boolean;
  /** Called when user requests restart */
  onRestart?: (id: string) => void;
  /** Opens Cinema mode for this card */
  onCinema?: (id: string) => void;
  /** Called when video playback ends */
  onVideoEnded?: (id: string) => void;
  /** Opens AddToCollection sheet */
  onAddToCollection?: (id: string) => void;
}

/**
 * Extract iframe src from embed HTML.
 */
function extractIframeSrc(embedHtml: string): string | null {
  const match = embedHtml.match(/src="([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Grid card with inline video embed support.
 * Shows iframe when playing, thumbnail when not.
 */
export function GridCard({
  item,
  onPress,
  onDelete,
  isPlaying,
  isPaused,
  onRestart,
  onCinema,
  onVideoEnded,
  onAddToCollection,
}: GridCardProps) {
  const theme = useTheme();
  const { source, content } = item;
  const hasImage = !!content.media_url;
  const isVideo = !!content.is_video || !!content.embed_html;
  const isWeb = Platform.OS === "web";
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Hover glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: hovered ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [hovered, glowAnim]);

  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 16],
  });
  const glowShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  // Play/pause YouTube via postMessage
  useEffect(() => {
    if (!isWeb || !iframeRef.current?.contentWindow) return;
    const cmd = isPlaying ? "playVideo" : "pauseVideo";
    try {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: cmd, args: "" }),
        "*"
      );
    } catch (_) {}
  }, [isPlaying, isWeb]);

  // Listen for YouTube video end (state 0) via postMessage
  useEffect(() => {
    if (!isWeb || !isPlaying) return;
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YouTube sends { event: "onStateChange", info: 0 } when video ends
        if (data?.event === "onStateChange" && data?.info === 0) {
          onVideoEnded?.(item.id);
        }
      } catch (_) {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isWeb, isPlaying, item.id, onVideoEnded]);

  const handlePress = () => {
    // Single tap → select for play
    onPress(item.id);
  };

  // Build iframe for playing videos in grid
  const renderEmbed = () => {
    if (!isWeb || !content.embed_html) return null;
    const src = extractIframeSrc(content.embed_html);
    if (!src) return null;

    let enhancedSrc = src;
    if (src.includes("youtube.com")) {
      // Add origin param so YouTube sends postMessage events back to us
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      enhancedSrc = src + (src.includes("?") ? "&" : "?") + "enablejsapi=1&autoplay=1&mute=0&playsinline=1&origin=" + encodeURIComponent(origin);
    } else if (src.includes("tiktok.com")) {
      enhancedSrc = src + (src.includes("?") ? "&" : "?") + "autoplay=1&mute=0";
    } else if (src.includes("instagram.com")) {
      enhancedSrc = src + (src.includes("?") ? "&" : "?") + "autoplay=1";
    }

    const handleIframeLoad = () => {
      // Tell YouTube iframe API to send us state change events
      if (iframeRef.current?.contentWindow && enhancedSrc.includes("youtube.com")) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "listening" }),
            "*"
          );
        } catch (_) {}
      }
    };

    return React.createElement("iframe", {
      ref: (el: HTMLIFrameElement | null) => { iframeRef.current = el; },
      src: enhancedSrc,
      onLoad: handleIframeLoad,
      style: {
        width: "100%",
        height: "100%",
        border: "none",
        borderRadius: 12,
        pointerEvents: isPlaying ? "auto" : "none",
      },
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      allowFullscreen: true,
    });
  };

  const showInlineEmbed = (isPlaying || isPaused) && isVideo && content.embed_html;

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: glowScale }],
          shadowColor: theme.colors.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: glowShadowOpacity as unknown as number,
          shadowRadius: glowShadowRadius as unknown as number,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={() => onAddToCollection?.(item.id)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isPlaying
              ? "#34D399"
              : isPaused
              ? "#F59E0B"
              : theme.colors.borderAccent,
            borderWidth: isPlaying || isPaused ? 2 : 1,
            height: isVideo ? 240 : hasImage ? 200 : 140,
          },
        ]}
      >
        {/* Inline embed when playing/paused */}
        {showInlineEmbed ? (
          <View style={styles.embedWrap}>
            {renderEmbed()}
          </View>
        ) : hasImage ? (
          <Image
            source={{ uri: content.media_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.textFill,
              { backgroundColor: theme.colors.surfaceElevated },
            ]}
          >
            <Text
              style={[styles.textPreview, { color: theme.colors.textSecondary }]}
              numberOfLines={4}
            >
              {content.caption || source.origin_url}
            </Text>
          </View>
        )}

        {/* Platform badge overlay */}
        <View style={styles.badgeOverlay}>
          <SourceBadge platform={source.platform} badgeColor={source.badge_color} />
        </View>

        {/* Status badge: Playing / Paused */}
        {isPlaying && (
          <View style={[styles.statusBadge, { backgroundColor: "rgba(52, 211, 153, 0.9)" }]}>
            <Text style={styles.statusText}>Playing</Text>
          </View>
        )}
        {isPaused && (
          <View style={[styles.statusBadge, { backgroundColor: "rgba(245, 158, 11, 0.9)" }]}>
            <Text style={styles.statusText}>Paused</Text>
          </View>
        )}

        {/* Restart button on paused cards */}
        {isPaused && (
          <Pressable
            onPress={() => onRestart?.(item.id)}
            style={styles.restartBtn}
          >
            <Text style={styles.restartIcon}>↺</Text>
          </Pressable>
        )}

        {/* Add to collection button */}
        <Pressable
          onPress={() => onAddToCollection?.(item.id)}
          style={styles.collectBtn}
        >
          <Text style={styles.collectBtnText}>+</Text>
        </Pressable>

        {/* Cinema button — for video cards */}
        {isVideo && (
          <Pressable
            onPress={() => onCinema?.(item.id)}
            style={styles.cinemaBtn}
          >
            <Text style={styles.cinemaBtnText}>⛶</Text>
          </Pressable>
        )}

        {/* Delete button */}
        <Pressable
          onPress={() => onDelete(item.id)}
          style={[
            styles.deleteBtn,
            { backgroundColor: "rgba(0,0,0,0.5)" },
          ]}
        >
          <Text style={styles.deleteText}>✕</Text>
        </Pressable>

        {/* Bottom gradient with author */}
        <View style={styles.bottomGradient}>
          {content.author_handle && (
            <Text style={styles.author} numberOfLines={1}>
              @{content.author_handle}
            </Text>
          )}
          {isVideo && !isPlaying && !isPaused && <Text style={styles.videoIcon}>▶</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  embedWrap: {
    width: "100%",
    height: "100%",
  },
  textFill: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  textPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
  badgeOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    opacity: 0.9,
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    left: "50%",
    marginLeft: -28,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  restartBtn: {
    position: "absolute",
    bottom: 40,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 158, 11, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  restartIcon: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  cinemaBtn: {
    position: "absolute",
    top: 8,
    right: 36,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  cinemaBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  collectBtn: {
    position: "absolute",
    top: 8,
    right: 64,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  collectBtnText: {
    color: "#6366F1",
    fontSize: 16,
    fontWeight: "800",
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  videoIcon: {
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 4,
  },
});
