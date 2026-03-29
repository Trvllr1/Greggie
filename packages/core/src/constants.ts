// ─── Greggie Constants ───

export const APP_NAME = "Greggie™";
export const APP_TAGLINE = "The Live Commerce OS";

// Brand colors (from theme.ts)
export const COLORS = {
  base: "#0A0A0F",
  surface: "#141419",
  surfaceHover: "#1E1E26",
  accent: "#818CF8",
  accentMuted: "#6366F1",
  text: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#F87171",
  glass: "rgba(255, 255, 255, 0.06)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
} as const;

// Category badge colors
export const CATEGORY_COLORS: Record<string, string> = {
  Tech: "#818CF8",
  Fashion: "#F472B6",
  Collectibles: "#FBBF24",
  Beauty: "#FB923C",
  Food: "#34D399",
  Art: "#A78BFA",
  Fitness: "#38BDF8",
  Automotive: "#EF4444",
  Home: "#A3E635",
  Luxury: "#E2B547",
  Pets: "#FB7185",
  Travel: "#2DD4BF",
};

// API config
export const API_VERSION = "v1";
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// WebSocket events
export const WS_EVENTS = {
  CHANNEL_UPDATE: "channel:update",
  RAIL_UPDATE: "rail:update",
  CHECKOUT_STATUS: "checkout:status",
  VIEWER_COUNT: "viewer:count",
  CHAT_MESSAGE: "chat:message",
} as const;
