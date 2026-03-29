import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";

const PLATFORMS = [
  { key: "all", icon: "🦋", label: "All" },
  { key: "youtube", icon: "▶️", label: "YouTube" },
  { key: "tiktok", icon: "🎵", label: "TikTok" },
  { key: "instagram", icon: "📸", label: "Instagram" },
  { key: "facebook", icon: "👥", label: "Facebook" },
  { key: "reddit", icon: "🔺", label: "Reddit" },
  { key: "open-web", icon: "🌐", label: "Web" },
];

interface PlatformFilterBarProps {
  activePlatforms: Set<string>;
  onToggle: (platform: string) => void;
  counts: Record<string, number>;
}

export function PlatformFilterBar({
  activePlatforms,
  onToggle,
  counts,
}: PlatformFilterBarProps) {
  const theme = useTheme();
  const isAllActive = activePlatforms.size === 0;

  const handlePress = async (key: string) => {
    await triggerHaptic();
    onToggle(key);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {PLATFORMS.map(({ key, icon, label }) => {
          const isActive =
            key === "all" ? isAllActive : activePlatforms.has(key);
          const badgeTheme =
            theme.colors.badges[key] || theme.colors.badges.default;
          const count = key === "all" ? undefined : counts[key];

          return (
            <Pressable
              key={key}
              onPress={() => handlePress(key)}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive
                    ? badgeTheme.bg
                    : theme.colors.surfaceOverlay,
                  borderColor: isActive
                    ? badgeTheme.text + "40"
                    : "transparent",
                  transform: [{ scale: isActive ? 1.05 : 1 }],
                },
              ]}
            >
              <Text style={styles.pillIcon}>{icon}</Text>
              <Text
                style={[
                  styles.pillLabel,
                  {
                    color: isActive
                      ? badgeTheme.text
                      : theme.colors.textMuted,
                  },
                ]}
              >
                {label}
              </Text>
              {count !== undefined && count > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isActive
                        ? badgeTheme.text + "30"
                        : theme.colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      {
                        color: isActive
                          ? badgeTheme.text
                          : theme.colors.textMuted,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 5,
  },
  pillIcon: {
    fontSize: 13,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  countText: {
    fontSize: 10,
    fontWeight: "800",
  },
});
