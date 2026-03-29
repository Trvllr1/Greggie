import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  StatusBar,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { FeedItem } from "../services/api";
import { SourceBadge } from "./SourceBadge";
import { ButterflyIcon } from "./ButterflyIcon";
import { useTheme } from "../theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface CinemaModeProps {
  items: FeedItem[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Full-screen immersive cinema mode.
 * No scroll paging — use prev/next buttons to navigate.
 * Embeds get full iframe control (play, unmute, etc).
 * Floating butterfly home button.
 */
export function CinemaMode({ items, initialIndex, onClose }: CinemaModeProps) {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in on mount
  React.useEffect(() => {
    StatusBar.setHidden(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    return () => {
      StatusBar.setHidden(false);
    };
  }, [fadeAnim]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => onClose());
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleNext = () => {
    if (currentIdx < items.length - 1) setCurrentIdx(currentIdx + 1);
  };

  const currentItem = items[currentIdx];
  if (!currentItem) return null;

  const { source, content } = currentItem;
  const hasEmbed = !!content.embed_html;
  const hasImage = !!content.media_url;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Main content area — embed gets full interactive control */}
      <View style={[styles.cinemaCard, { width: SCREEN_W, height: SCREEN_H }]}>
        {hasEmbed ? (
          <View key={`cinema-embed-${currentIdx}`} style={styles.embedWrap}>
            <CinemaEmbed embedHtml={content.embed_html!} />
          </View>
        ) : hasImage ? (
          <Animated.Image
            source={{ uri: content.media_url }}
            style={styles.bgImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.textBg, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.bigCaption, { color: theme.colors.textPrimary }]}>
              {content.caption || source.origin_url}
            </Text>
          </View>
        )}

        {/* Top bar: close + counter */}
        <View style={styles.topBar}>
          <Pressable onPress={handleClose} style={styles.homeBtn}>
            <ButterflyIcon size={24} />
          </Pressable>
          <Text style={styles.counter}>
            {currentIdx + 1} / {items.length}
          </Text>
        </View>

        {/* Bottom info bar — no gradient, pointer-events-none except buttons */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            <SourceBadge platform={source.platform} badgeColor={source.badge_color} />
            {content.author_handle && (
              <Text style={styles.cinemaAuthor}>@{content.author_handle}</Text>
            )}
            {content.caption && (
              <Text style={styles.cinemaCaption} numberOfLines={2}>
                {content.caption}
              </Text>
            )}
          </View>

          {/* Nav buttons */}
          <View style={styles.navButtons}>
            <Pressable
              onPress={handlePrev}
              style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
              disabled={currentIdx === 0}
            >
              <Text style={styles.navBtnText}>▲</Text>
            </Pressable>
            <Pressable
              onPress={handleNext}
              style={[styles.navBtn, currentIdx === items.length - 1 && styles.navBtnDisabled]}
              disabled={currentIdx === items.length - 1}
            >
              <Text style={styles.navBtnText}>▼</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Cinema embed — full interactive iframe.
 * No mute forced, no pointer-events blocking.
 * User has full control of the embedded player.
 */
function CinemaEmbed({ embedHtml }: { embedHtml: string }) {
  if (Platform.OS === "web") {
    const srcMatch = embedHtml.match(/src="([^"]+)"/);
    const src = srcMatch ? srcMatch[1] : null;
    if (src) {
      let enhancedSrc = src;
      if (src.includes("youtube.com")) {
        // autoplay + NOT muted so user can hear + control
        enhancedSrc = src + (src.includes("?") ? "&" : "?") + "enablejsapi=1&autoplay=1&mute=0&playsinline=1&rel=0";
      } else if (src.includes("tiktok.com")) {
        enhancedSrc = src + (src.includes("?") ? "&" : "?") + "autoplay=1&mute=0";
      } else if (src.includes("instagram.com")) {
        enhancedSrc = src + (src.includes("?") ? "&" : "?") + "autoplay=1";
      }
      return React.createElement("iframe", {
        src: enhancedSrc,
        style: {
          width: "100%",
          height: "100%",
          border: "none",
        },
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        allowFullscreen: true,
      });
    }
  }
  return null;
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    zIndex: 100,
  },
  cinemaCard: {
    position: "relative",
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  embedWrap: {
    width: "100%",
    height: "100%",
  },
  bgImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  textBg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    width: "100%",
  },
  bigCaption: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 34,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 32,
    backgroundColor: "transparent",
    zIndex: 110,
    ...(Platform.OS === "web" ? {
      backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
    } as any : {}),
  },
  homeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  counter: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 40,
    backgroundColor: "transparent",
    zIndex: 110,
    ...(Platform.OS === "web" ? {
      backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
    } as any : {}),
  },
  bottomInfo: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  cinemaAuthor: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cinemaCaption: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    lineHeight: 20,
  },
  navButtons: {
    gap: 8,
    alignItems: "center",
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
