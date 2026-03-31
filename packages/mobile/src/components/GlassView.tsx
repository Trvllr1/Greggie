import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassViewProps {
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Glassmorphism wrapper — translucent blur surface.
 * Matches web's `backdrop-blur-md bg-white/10` pattern.
 */
export function GlassView({
  intensity = 40,
  tint = 'dark',
  style,
  children,
}: GlassViewProps) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[styles.glass, style]}
      experimentalBlurMethod="dimezisBlurView"
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: {
    overflow: 'hidden',
  },
});
