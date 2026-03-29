import React, { useRef, useEffect } from "react";
import { View, Text, Image, StyleSheet, Pressable, Linking } from "react-native";
import { WebView } from "react-native-webview";
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
  onCinema?: (id: string) => void;
  onAddToCollection?: (id: string) => void;
}

/** Wrap embed HTML, adding enablejsapi to YouTube iframes for play/pause control. */
function wrapHtml(embedHtml: string): string {
  const enhanced = embedHtml.replace(
    /src="(https:\/\/www\.youtube\.com\/embed\/[^"]+)"/,
    (_match, url) => {
      const sep = url.includes("?") ? "&" : "?";
      return `src="${url}${sep}enablejsapi=1&autoplay=1&playsinline=1"`;
    }
  );
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{width:100%;height:100%}iframe{width:100%;height:100%;border:none}</style>
</head><body>${enhanced}</body></html>`;
}

export function UniversalCard({ item, isVisible, isActive, isPinned, onDelete, onPin, onAddToCollection }: UniversalCardProps) {
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const { source, content } = item;
  const showEmbed = isVisible && !!content.embed_html;

  // Play/pause YouTube when isActive changes
  useEffect(() => {
    if (!showEmbed || !webViewRef.current) return;
    const cmd = isActive ? "playVideo" : "pauseVideo";
    webViewRef.current.injectJavaScript(`
      try {
        var f = document.querySelector('iframe');
        if (f) f.contentWindow.postMessage(JSON.stringify({event:"command",func:"${cmd}",args:""}), '*');
      } catch(e) {}
      true;
    `);
  }, [isActive, showEmbed]);

  const openLink = () => Linking.openURL(source.origin_url);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderAccent,
        ...theme.shadows.card,
      },
      isActive && {
        borderColor: "rgba(129, 140, 248, 0.25)",
        ...theme.shadows.cardActive,
      },
    ]}>
      <View style={styles.cardHeader}>
        <SourceBadge platform={source.platform} badgeColor={source.badge_color} />
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => onAddToCollection?.(item.id)}
            style={[styles.collectBtn, { backgroundColor: theme.colors.surfaceOverlay, borderColor: theme.colors.borderElevated }]}
          >
            <Text style={[styles.collectBtnText, { color: theme.colors.accent }]}>+</Text>
          </Pressable>
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
        <View style={[styles.embedContainer, { borderColor: theme.colors.border }]}>
          <WebView
            ref={webViewRef}
            source={{ html: wrapHtml(content.embed_html!) }}
            style={styles.webview}
            scrollEnabled={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
          />
        </View>
      ) : content.media_url ? (
        <Pressable onPress={openLink}>
          <Image source={{ uri: content.media_url }} style={[styles.media, { backgroundColor: theme.colors.surfaceElevated }]} />
        </Pressable>
      ) : null}
    </View>
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
  webview: {
    flex: 1,
  },
  media: {
    marginTop: 14,
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
});
