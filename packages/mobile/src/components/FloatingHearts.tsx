import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface Heart {
  id: number;
  x: number;
}

interface FloatingHeartsProps {
  hearts: Heart[];
  onComplete: (id: number) => void;
}

function FloatingHeart({ heart, onComplete }: { heart: Heart; onComplete: (id: number) => void }) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    translateY.value = withTiming(-200, { duration: 1500, easing: Easing.out(Easing.ease) });
    scale.value = withTiming(1.5, { duration: 1500, easing: Easing.out(Easing.ease) });
    opacity.value = withDelay(800, withTiming(0, { duration: 700 }, () => {
      runOnJS(onComplete)(heart.id);
    }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: heart.x },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.Text style={[styles.heart, style]}>
      ❤️
    </Animated.Text>
  );
}

export function FloatingHearts({ hearts, onComplete }: FloatingHeartsProps) {
  if (hearts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {hearts.map((h) => (
        <FloatingHeart key={h.id} heart={h} onComplete={onComplete} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 180,
    right: 60,
    width: 60,
    height: 240,
  },
  heart: {
    position: 'absolute',
    bottom: 0,
    fontSize: 28,
  },
});
