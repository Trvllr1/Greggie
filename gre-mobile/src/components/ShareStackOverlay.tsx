import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  StyleSheet,
  Animated,
} from "react-native";
import { useTheme } from "../theme";
import { useShareStack } from "../hooks/useShareStack";
import { StackItem } from "../services/api";
import { SourceBadge } from "./SourceBadge";
import { ButterflyIcon } from "./ButterflyIcon";
import { triggerHaptic } from "../utils/haptics";

interface ShareStackOverlayProps {
  onClose: () => void;
  onCollect: (stackItemId: string) => void;
  onCountChange?: (count: number) => void;
}

export function ShareStackOverlay({ onClose, onCollect, onCountChange }: ShareStackOverlayProps) {
  const theme = useTheme();
  const { items, count, loading, refresh, accept, dismiss } = useShareStack();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    refresh();
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [fadeAnim, refresh]);

  useEffect(() => {
    onCountChange?.(count);
  }, [count, onCountChange]);

  const handleClose = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
  };

  const handleAccept = async (id: string) => {
    await triggerHaptic();
    await accept(id);
  };

  const handleDismiss = async (id: string) => {
    await triggerHaptic();
    await dismiss(id);
  };

  const handleCollect = async (id: string) => {
    await triggerHaptic();
    onCollect(id);
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={[styles.panel, { backgroundColor: theme.colors.base }]}>
        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: theme.colors.borderAccent }]}>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <ButterflyIcon size={22} />
          </Pressable>
          <View style={styles.topCenter}>
            <Text style={[styles.topTitle, { color: theme.colors.textPrimary }]}>Share Stack</Text>
            {count > 0 && (
              <Text style={[styles.topCount, { color: theme.colors.textMuted }]}>
                {count} pending
              </Text>
            )}
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Stack items */}
        <FlatList
          data={items}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ShareStackCard
              item={item}
              onAccept={handleAccept}
              onCollect={handleCollect}
              onDismiss={handleDismiss}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                Stack is empty
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
                Share URLs from other apps to see them here
              </Text>
            </View>
          }
        />
      </View>
    </Animated.View>
  );
}

// ── Share Stack Card ──

interface ShareStackCardProps {
  item: StackItem;
  onAccept: (id: string) => void;
  onCollect: (id: string) => void;
  onDismiss: (id: string) => void;
}

function ShareStackCard({ item, onAccept, onCollect, onDismiss }: ShareStackCardProps) {
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateOut = (callback: () => void) => {
    Animated.timing(slideAnim, { toValue: -400, duration: 250, useNativeDriver: true }).start(callback);
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.borderAccent,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      {/* Card content */}
      <View style={styles.cardContent}>
        <SourceBadge platform={item.source.platform} badgeColor={item.source.badge_color} />

        {item.content.media_url ? (
          <Image source={{ uri: item.content.media_url }} style={styles.cardThumb} resizeMode="cover" />
        ) : null}

        <View style={styles.cardMeta}>
          {item.content.author_handle && (
            <Text style={[styles.cardAuthor, { color: theme.colors.textPrimary }]}>
              @{item.content.author_handle}
            </Text>
          )}
          <Text style={[styles.cardCaption, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.content.caption || item.url}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => animateOut(() => onAccept(item.id))}
          style={[styles.actionBtn, { backgroundColor: "rgba(52,211,153,0.15)" }]}
        >
          <Text style={[styles.actionIcon, { color: "#34D399" }]}>✓</Text>
          <Text style={[styles.actionLabel, { color: "#34D399" }]}>Accept</Text>
        </Pressable>

        <Pressable
          onPress={() => onCollect(item.id)}
          style={[styles.actionBtn, { backgroundColor: "rgba(99,102,241,0.15)" }]}
        >
          <Text style={[styles.actionIcon, { color: theme.colors.accent }]}>📂</Text>
          <Text style={[styles.actionLabel, { color: theme.colors.accent }]}>Collect</Text>
        </Pressable>

        <Pressable
          onPress={() => animateOut(() => onDismiss(item.id))}
          style={[styles.actionBtn, { backgroundColor: "rgba(239,68,68,0.1)" }]}
        >
          <Text style={[styles.actionIcon, { color: "#EF4444" }]}>✕</Text>
          <Text style={[styles.actionLabel, { color: "#EF4444" }]}>Dismiss</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 150,
  },
  panel: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  topCenter: { alignItems: "center" },
  topTitle: { fontSize: 20, fontWeight: "800" },
  topCount: { fontSize: 12, marginTop: 2 },
  listContent: { padding: 16 },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardContent: {
    padding: 14,
    gap: 10,
  },
  cardThumb: {
    width: "100%",
    height: 120,
    borderRadius: 10,
  },
  cardMeta: { gap: 4 },
  cardAuthor: { fontSize: 14, fontWeight: "700" },
  cardCaption: { fontSize: 13, lineHeight: 18 },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  actionIcon: { fontSize: 16 },
  actionLabel: { fontSize: 13, fontWeight: "700" },
});
