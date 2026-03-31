import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface PulseViewProps {
  /** Pulse cycle duration in ms (default 1200) */
  duration?: number;
  /** Min opacity (default 0.6) */
  minOpacity?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Continuously pulsing wrapper — used for LIVE badges, loading dots, etc.
 * Matches web's `animate-pulse` pattern.
 */
export function PulseView({
  duration = 1200,
  minOpacity = 0.6,
  style,
  children,
}: PulseViewProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    const half = duration / 2;
    opacity.value = withRepeat(
      withSequence(
        withTiming(minOpacity, { duration: half, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: half, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [duration, minOpacity, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
