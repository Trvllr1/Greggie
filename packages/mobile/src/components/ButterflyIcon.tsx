import React, { useEffect } from 'react';
import Svg, { Ellipse, Rect, Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const EMERALD = '#059669';
const GOLD = '#F59E0B';
const GOLD_LIGHT = '#FBBF24';
const GOLD_DARK = '#D97706';
const BODY_PURPLE = '#1E0A4A';

interface ButterflyIconProps {
  size?: number;
}

export function ButterflyIcon({ size = 34 }: ButterflyIconProps) {
  const s = size / 34;

  // Pre-compute all scaled values (worklets can only capture primitives)
  const luoA = 8.5 * s, luoB = 6.5 * s;
  const lumA = 7 * s, lumB = 5.5 * s;
  const luiA = 4 * s, luiB = 3 * s;
  const ruoA = 6.5 * s, ruoB = 8.5 * s;
  const rumA = 5.5 * s, rumB = 7 * s;
  const ruiA = 3 * s, ruiB = 4 * s;
  const lloA = 6.5 * s, lloB = 5 * s;
  const lliA = 5 * s, lliB = 3.8 * s;
  const rloA = 5 * s, rloB = 6.5 * s;
  const rliA = 3.8 * s, rliB = 5 * s;

  const flutter = useSharedValue(0);

  useEffect(() => {
    flutter.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  // Worklets only reference primitive locals — no closures over functions
  const leftUpperOuterProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [luoA, luoB]),
  }));
  const leftUpperMiddleProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [lumA, lumB]),
  }));
  const leftUpperInnerProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [luiA, luiB]),
  }));

  const rightUpperOuterProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [ruoA, ruoB]),
  }));
  const rightUpperMiddleProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [rumA, rumB]),
  }));
  const rightUpperInnerProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [ruiA, ruiB]),
  }));

  const leftLowerOuterProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [lloA, lloB]),
  }));
  const leftLowerInnerProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [lliA, lliB]),
  }));
  const rightLowerOuterProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [rloA, rloB]),
  }));
  const rightLowerInnerProps = useAnimatedProps(() => ({
    ry: interpolate(flutter.value, [0, 1], [rliA, rliB]),
  }));

  // Static layout values
  const cx7 = 7 * s, cx21 = 21 * s, cx6 = 6 * s, cx22 = 22 * s;
  const cx9 = 9 * s, cx19 = 19 * s, cy11 = 11 * s, cy10 = 10 * s, cy22 = 22 * s;
  const rx65 = 6.5 * s, rx5 = 5 * s, rx25 = 2.5 * s, rx35 = 3.5 * s;
  const svgWidth = 28 * s;
  const svgHeight = 42 * s;
  const vbNeg = 6 * s;
  const vbH = 48 * s;

  return (
    <Svg width={svgWidth} height={svgHeight} viewBox={`0 -${vbNeg} ${svgWidth} ${vbH}`} fill="none">
      {/* Upper wings — left */}
      <AnimatedEllipse cx={cx7} cy={cy11} rx={rx65} fill={EMERALD} animatedProps={leftUpperOuterProps} />
      <AnimatedEllipse cx={cx7} cy={cy11} rx={rx5} fill={GOLD} animatedProps={leftUpperMiddleProps} />
      <AnimatedEllipse cx={cx6} cy={cy10} rx={rx25} fill={GOLD_LIGHT} animatedProps={leftUpperInnerProps} />

      {/* Upper wings — right */}
      <AnimatedEllipse cx={cx21} cy={cy11} rx={rx65} fill={EMERALD} animatedProps={rightUpperOuterProps} />
      <AnimatedEllipse cx={cx21} cy={cy11} rx={rx5} fill={GOLD} animatedProps={rightUpperMiddleProps} />
      <AnimatedEllipse cx={cx22} cy={cy10} rx={rx25} fill={GOLD_LIGHT} animatedProps={rightUpperInnerProps} />

      {/* Lower wings — left */}
      <AnimatedEllipse cx={cx9} cy={cy22} rx={rx5} fill={EMERALD} animatedProps={leftLowerOuterProps} />
      <AnimatedEllipse cx={cx9} cy={cy22} rx={rx35} fill={GOLD_DARK} animatedProps={leftLowerInnerProps} />

      {/* Lower wings — right */}
      <AnimatedEllipse cx={cx19} cy={cy22} rx={rx5} fill={EMERALD} animatedProps={rightLowerOuterProps} />
      <AnimatedEllipse cx={cx19} cy={cy22} rx={rx35} fill={GOLD_DARK} animatedProps={rightLowerInnerProps} />

      {/* Body */}
      <Rect x={12 * s} y={5 * s} width={4 * s} height={26 * s} rx={2 * s} fill={BODY_PURPLE} />
      <Rect x={12.5 * s} y={7 * s} width={3 * s} height={5 * s} rx={1.5 * s} fill="#2E1065" />

      {/* Antennae */}
      <Line x1={13 * s} y1={5 * s} x2={cx9} y2={-4 * s} stroke={BODY_PURPLE} strokeWidth={0.8 * s} />
      <Line x1={15 * s} y1={5 * s} x2={cx19} y2={-4 * s} stroke={BODY_PURPLE} strokeWidth={0.8 * s} />

      {/* Antenna tips */}
      <Circle cx={cx9} cy={-4 * s} r={1.2 * s} fill={GOLD_LIGHT} />
      <Circle cx={cx19} cy={-4 * s} r={1.2 * s} fill={GOLD_LIGHT} />
    </Svg>
  );
}
