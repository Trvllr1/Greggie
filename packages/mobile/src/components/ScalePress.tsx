import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CFG = { damping: 15, stiffness: 300 };

interface ScalePressProps extends Omit<PressableProps, 'style'> {
  /** Scale factor when pressed. Default 0.97 */
  activeScale?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Drop-in Pressable replacement with spring scale feedback.
 * Matches web's `whileHover: scale 1.02, whileTap: scale 0.98`.
 */
export function ScalePress({
  activeScale = 0.97,
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: ScalePressProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(activeScale, SPRING_CFG);
      onPressIn?.(e);
    },
    [activeScale, onPressIn, scale],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, SPRING_CFG);
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
