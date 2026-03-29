import React, { createContext, useContext } from "react";

// ── Color Token Types ──

export interface BadgeColors {
  bg: string;
  text: string;
}

export interface ThemeColors {
  // Backgrounds (luminance-layered depth)
  base: string;
  surface: string;
  surfaceElevated: string;
  surfaceOverlay: string;

  // Text hierarchy
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textInverse: string;

  // Accent
  accent: string;
  accentMuted: string;
  accentGlow: string;
  accentBorder: string;

  // Borders
  border: string;
  borderElevated: string;
  borderAccent: string;
  borderFocus: string;

  // Semantic
  error: string;
  errorBg: string;
  errorBorder: string;

  // Skeleton
  skeletonBase: string;
  skeletonHighlight: string;

  // Platform badges
  badges: Record<string, BadgeColors>;
}

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  shadows: {
    card: ShadowStyle;
    cardActive: ShadowStyle;
    button: ShadowStyle;
  };
}

// ── Dark Theme (DEFAULT) ──

export const darkTheme: Theme = {
  dark: true,
  colors: {
    // Backgrounds — blue-black layered depth
    base: "#0A0A0F",
    surface: "#141419",
    surfaceElevated: "#1A1A22",
    surfaceOverlay: "#222230",

    // Text
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    textDisabled: "#475569",
    textInverse: "#0F172A",

    // Accent — brighter indigo for dark contrast
    accent: "#818CF8",
    accentMuted: "#6366F1",
    accentGlow: "rgba(129, 140, 248, 0.15)",
    accentBorder: "rgba(129, 140, 248, 0.12)",

    // Borders
    border: "rgba(255, 255, 255, 0.06)",
    borderElevated: "rgba(255, 255, 255, 0.10)",
    borderAccent: "rgba(129, 140, 248, 0.12)",
    borderFocus: "rgba(129, 140, 248, 0.30)",

    // Semantic
    error: "#F87171",
    errorBg: "rgba(248, 113, 113, 0.10)",
    errorBorder: "rgba(248, 113, 113, 0.20)",

    // Skeleton
    skeletonBase: "#1A1A22",
    skeletonHighlight: "#2A2A35",

    // Badges — translucent glass pills
    badges: {
      instagram: { bg: "rgba(225, 48, 108, 0.15)", text: "#F472B6" },
      tiktok: { bg: "rgba(37, 244, 238, 0.15)", text: "#5EEAD4" },
      youtube: { bg: "rgba(255, 0, 0, 0.12)", text: "#FCA5A5" },
      facebook: { bg: "rgba(24, 119, 242, 0.15)", text: "#93C5FD" },
      reddit: { bg: "rgba(255, 69, 0, 0.15)", text: "#FDBA74" },
      "open-web": { bg: "rgba(129, 140, 248, 0.15)", text: "#A5B4FC" },
      default: { bg: "rgba(100, 116, 139, 0.15)", text: "#94A3B8" },
    },
  },
  shadows: {
    card: {
      shadowColor: "rgba(129, 140, 248, 0.08)",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 2,
    },
    cardActive: {
      shadowColor: "rgba(129, 140, 248, 0.20)",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 4,
    },
    button: {
      shadowColor: "rgba(129, 140, 248, 0.25)",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 3,
    },
  },
};

// ── Light Theme (Secondary) ──

export const lightTheme: Theme = {
  dark: false,
  colors: {
    base: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceOverlay: "#F1F5F9",

    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    textDisabled: "#CBD5E1",
    textInverse: "#F1F5F9",

    accent: "#6366F1",
    accentMuted: "#6366F1",
    accentGlow: "rgba(99, 102, 241, 0.12)",
    accentBorder: "rgba(99, 102, 241, 0.08)",

    border: "#E2E8F0",
    borderElevated: "#E2E8F0",
    borderAccent: "#E2E8F0",
    borderFocus: "rgba(99, 102, 241, 0.30)",

    error: "#DC2626",
    errorBg: "#FEE2E2",
    errorBorder: "#FECACA",

    skeletonBase: "#E2E8F0",
    skeletonHighlight: "#F1F5F9",

    // Badges — solid fills
    badges: {
      instagram: { bg: "#E1306C", text: "#FFFFFF" },
      tiktok: { bg: "#010101", text: "#FFFFFF" },
      youtube: { bg: "#FF0000", text: "#FFFFFF" },
      facebook: { bg: "#1877F2", text: "#FFFFFF" },
      reddit: { bg: "#FF4500", text: "#FFFFFF" },
      "open-web": { bg: "#6366F1", text: "#FFFFFF" },
      default: { bg: "#64748B", text: "#FFFFFF" },
    },
  },
  shadows: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    cardActive: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    button: {
      shadowColor: "#6366F1",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
  },
};

// ── React Context ──

const ThemeContext = createContext<Theme>(darkTheme);

export const ThemeProvider = ThemeContext.Provider;
export const useTheme = () => useContext(ThemeContext);
