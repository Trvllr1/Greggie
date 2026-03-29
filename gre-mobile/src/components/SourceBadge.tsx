import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";

const PLATFORM_ICONS: Record<string, { icon: string; label: string }> = {
  instagram: { icon: "📸", label: "Instagram" },
  tiktok: { icon: "🎵", label: "TikTok" },
  youtube: { icon: "▶️", label: "YouTube" },
  facebook: { icon: "👥", label: "Facebook" },
  reddit: { icon: "🔺", label: "Reddit" },
  "open-web": { icon: "🌐", label: "Web" },
};

interface SourceBadgeProps {
  platform: string;
  badgeColor?: string;
}

export function SourceBadge({ platform, badgeColor }: SourceBadgeProps) {
  const theme = useTheme();
  const platformInfo = PLATFORM_ICONS[platform] || { icon: "📌", label: platform };
  const badgeTheme = theme.colors.badges[platform] || theme.colors.badges.default;

  // In light mode, allow API-provided badgeColor to override
  const bg = (!theme.dark && badgeColor) ? badgeColor : badgeTheme.bg;
  const textColor = (!theme.dark && badgeColor) ? "#FFFFFF" : badgeTheme.text;

  return (
    <View style={[
      styles.badge,
      { backgroundColor: bg },
      !theme.dark && styles.badgeShadow,
    ]}>
      <Text style={styles.icon}>{platformInfo.icon}</Text>
      <Text style={[styles.label, { color: textColor }]}>{platformInfo.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    fontSize: 13,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
