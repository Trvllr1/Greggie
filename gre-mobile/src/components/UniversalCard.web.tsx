import React, { useRef, useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, Pressable, Linking, Animated, Easing } from "react-native";
import { SourceBadge } from "./SourceBadge";
import { FeedItem } from "../services/api";
import { useTheme } from "../theme";

interface UniversalCardProps {
  item: FeedItem;
  isVisible: boolean;
  isActive: boolean;
  isPinned?: boolean;
  onDelete: (id: string) => void;
  onPin?: (id: string) => void;
  onContentEnded?: (id: string) => void;
  onDoubleTap?: (id: string) => void;
  /** Opens Cinema mode for this card */
  onCinema?: (id: string) => void;
  /** Opens AddToCollection sheet */
  onAddToCollection?: (id: string) => void;
}

/** Extract the src attribute from an iframe embed string. */
function extractIframeSrc(embedHtml: string): string | null {
  const match = embedHtml.match(/src="([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Renders embed HTML using real DOM elements.
 * YouTube iframes get enablejsapi + IntersectionObserver autoplay/pause.
 * NEVER muted — audio plays from the start.
 */
function EmbedFrame({
  embedHtml,
  autoplayEnabled,
}: {
  embedHtml: string;
  autoplayEnabled: boolean;
}) {
  const ref = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const autoplayRef = useRef(autoplayEnabled);
  autoplayRef.current = autoplayEnabled;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    const cmd = autoplayEnabled ? "playVideo" : "pauseVideo";
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: cmd, args: "" }),
        "*"
      );
    } catch (_e) {
      /* cross-origin — ignore */
    }
  }, [autoplayEnabled]);

  useEffect(() => {
    const el = ref.current as HTMLDivElement | null;
    if (!el) return;

    const src = extractIframeSrc(embedHtml);
    if (src) {
      const iframe = document.createElement("iframe");
      const isYouTube = src.includes("youtube.com");
      const isInstagram = src.includes("instagram.com");
      const isTikTok = src.includes("tiktok.com");
      let enhancedSrc = src;
      if (isYouTube) {
        // NO mute — audio from the start
        enhancedSrc = src +
          (src.includes("?") ? "&" : "?") +
          "enablejsapi=1&autoplay=1&mute=0&playsinline=1";
      } else if (isInstagram) {
        enhancedSrc = src + (src.includes("?") ? "&" : "?") + "autoplay=1";
      } else if (isTikTok) {
        enhancedSrc = src + (src.includes("?") ? "&" : "?") + "autoplay=1&mute=0";
      }
      iframe.src = enhancedSrc;
      iframe.style.cssText =
        "width:100%;height:100%;border:none;border-radius:12px";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      el.innerHTML = "";
      el.appendChild(iframe);
      iframeRef.current = iframe;
    } else {
      el.innerHTML = embedHtml;
      const scripts = el.querySelectorAll("script");
      scripts.forEach((s: HTMLScriptElement) => {
        if (s.src) {
          const ns = document.createElement("script");
          ns.src = s.src;
          ns.async = true;
          document.body.appendChild(ns);
        }
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const iframe = iframeRef.current;
          if (!iframe || !iframe.contentWindow) return;
          const cmd =
            entry.isIntersecting && autoplayRef.current
              ? "playVideo"
              : "pauseVideo";
          try {
            iframe.contentWindow.postMessage(
              JSON.stringify({ event: "command", func: cmd, args: "" }),
              "*"
            );
          } catch (_e) {
            /* cross-origin — ignore */
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (el) el.innerHTML = "";
    };
  }, [embedHtml]);

  return React.createElement("div", {
    ref,
    style: {
      width: "100%",
      height: "100%",
      borderRadius: 12,
      overflow: "hidden",
    },
  });
}

export function UniversalCard({
  item,
  isVisible,
  isActive,
  isPinned,
  onDelete,
  onPin,
  onContentEnded,
  onDoubleTap,
  onCinema,
  onAddToCollection,
}: UniversalCardProps) {
  const theme = useTheme();
  const { source, content } = item;
  const showEmbed = isVisible && !!content.embed_html;

  // ── Hover glow animation ──
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: hovered ? 1 : 0,
      duration: 350,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [hovered, glowAnim]);

  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });
  const glowShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  const hoverScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });
  const glowBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.borderAccent, theme.colors.accent],
  });

  const openLink = () => {
    Linking.openURL(source.origin_url);
  };

  // Single tap on card area (not iframe) → pin for autoscroll
  const handleCardPress = () => {
    if (onPin) onPin(item.id);
  };

  return (
    <Pressable
      onPress={handleCardPress}
      onLongPress={() => onAddToCollection?.(item.id)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
    <Animated.View style={[
      styles.card,
      {
        backgroundColor: theme.colors.surface,
        borderColor: isPinned
          ? "rgba(52, 211, 153, 0.5)"
          : (glowBorderColor as unknown as string),
        ...theme.shadows.card,
        shadowColor: hovered ? theme.colors.accent : theme.shadows.card.shadowColor,
        shadowRadius: hovered ? (glowShadowRadius as unknown as number) : theme.shadows.card.shadowRadius,
        shadowOpacity: hovered ? (glowShadowOpacity as unknown as number) : theme.shadows.card.shadowOpacity,
        transform: [{ scale: hoverScale as unknown as number }],
      },
      isActive && {
        borderColor: "rgba(129, 140, 248, 0.25)",
        ...theme.shadows.cardActive,
      },
      isPinned && {
        borderColor: "rgba(52, 211, 153, 0.5)",
        borderWidth: 2,
      },
    ]}>
      <View style={styles.cardHeader}>
        <SourceBadge
          platform={source.platform}
          badgeColor={source.badge_color}
        />
        <View style={styles.headerRight}>
          {/* Add to Collection */}
          <Pressable
            onPress={() => onAddToCollection?.(item.id)}
            style={[styles.collectBtn, { backgroundColor: theme.colors.surfaceOverlay, borderColor: theme.colors.borderElevated }]}
          >
            <Text style={[styles.collectBtnText, { color: theme.colors.accent }]}>+</Text>
          </Pressable>
          {/* Cinema button — always visible on video cards */}
          {content.embed_html && (
            <Pressable
              onPress={() => onCinema?.(item.id)}
              style={[styles.cinemaBtn, { backgroundColor: theme.colors.accentMuted }]}
            >
              <Text style={styles.cinemaBtnText}>⛶</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onDelete(item.id)}
            style={[styles.deleteBtn, { backgroundColor: theme.colors.surfaceOverlay, borderColor: theme.colors.borderElevated }]}
          >
            <Text style={[styles.deleteText, { color: theme.colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>
      </View>

      {content.author_handle && (
        <Text style={[styles.author, { color: theme.colors.textPrimary }]}>@{content.author_handle}</Text>
      )}

      {content.caption && (
        <Text style={[styles.caption, { color: theme.colors.textSecondary }]}>{content.caption}</Text>
      )}

      {showEmbed ? (
        <View style={[styles.embedContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}>
          <EmbedFrame embedHtml={content.embed_html!} autoplayEnabled={isActive || !!isPinned} />
        </View>
      ) : content.media_url ? (
        <Pressable onPress={openLink}>
          <Image source={{ uri: content.media_url }} style={[styles.media, { backgroundColor: theme.colors.surfaceElevated }]} />
        </Pressable>
      ) : null}

      {isPinned && (
        <View style={styles.pinnedBadge}>
          <Text style={styles.pinnedText}>Playing</Text>
        </View>
      )}
    </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  cinemaBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cinemaBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  collectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  collectBtnText: {
    fontSize: 18,
    fontWeight: "700",
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "600",
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
  embedContainer: {
    marginTop: 14,
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  media: {
    marginTop: 14,
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  pinnedBadge: {
    position: "absolute",
    top: 12,
    right: 84,
    backgroundColor: "rgba(52, 211, 153, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pinnedText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
