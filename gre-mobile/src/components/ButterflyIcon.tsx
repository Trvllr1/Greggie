import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";

const DEEP_PURPLE = "#2E1065";
const BODY_PURPLE = "#1E0A4A";
const EMERALD = "#059669";
const EMERALD_GLOW = "#34D399";
const GOLD = "#F59E0B";
const GOLD_LIGHT = "#FBBF24";
const GOLD_DARK = "#D97706";

/**
 * A slim butterfly rendered with pure RN Views.
 * Deep purple body + wing edges, golden wing fills.
 * Glows and flaps on hover. After 5s hover, flies up then returns.
 */
export function ButterflyIcon({ size = 34, hovered = false }: { size?: number; hovered?: boolean }) {
  const scale = size / 34;
  const w = (v: number) => v * scale;

  const flapAnim = useRef(new Animated.Value(0)).current;
  const nodeGlow = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const flyAnim = useRef(new Animated.Value(0)).current;
  const boomScale = useRef(new Animated.Value(0)).current;
  const boomOpacity = useRef(new Animated.Value(0)).current;
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gentle idle flutter — always running
  useEffect(() => {
    const idleFlap = Animated.loop(
      Animated.sequence([
        Animated.timing(flapAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(flapAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    idleFlap.start();
    return () => idleFlap.stop();
  }, [flapAnim]);

  // Antenna tip node glow — always pulsing like beacons
  useEffect(() => {
    const nodePulse = Animated.loop(
      Animated.sequence([
        Animated.timing(nodeGlow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(nodeGlow, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    nodePulse.start();
    return () => nodePulse.stop();
  }, [nodeGlow]);

  // Hover: glow pulse + 5s fly trigger
  useEffect(() => {
    if (hovered) {
      // Start glow
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();

      // After 5s of hover, sonic boom then fly up
      hoverTimer.current = setTimeout(() => {
        // Reset boom values
        boomScale.setValue(0);
        boomOpacity.setValue(1);

        Animated.sequence([
          // Sonic boom: rapid ring expansion + fade
          Animated.parallel([
            Animated.timing(boomScale, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.exp),
              useNativeDriver: false,
            }),
            Animated.timing(boomOpacity, {
              toValue: 0,
              duration: 400,
              easing: Easing.in(Easing.quad),
              useNativeDriver: false,
            }),
          ]),
          // Fly up immediately after boom
          Animated.timing(flyAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          // Hover at top briefly with a gentle bob
          Animated.loop(
            Animated.sequence([
              Animated.timing(flyAnim, {
                toValue: 0.85,
                duration: 600,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: false,
              }),
              Animated.timing(flyAnim, {
                toValue: 1,
                duration: 600,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: false,
              }),
            ]),
            { iterations: 3 }
          ),
          // Float back down
          Animated.timing(flyAnim, {
            toValue: 0,
            duration: 1400,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
        ]).start();
      }, 5000);

      return () => {
        pulse.stop();
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
      };
    } else {
      glowAnim.setValue(0);
      boomScale.setValue(0);
      boomOpacity.setValue(0);
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      // Ease back down if mid-flight
      Animated.timing(flyAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  }, [hovered, glowAnim, flyAnim]);

  // Wing rotations: idle = subtle, hover = dramatic
  const leftUpperRotate = flapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: hovered ? ["5deg", "30deg"] : ["12deg", "18deg"],
  });
  const rightUpperRotate = flapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: hovered ? ["-5deg", "-30deg"] : ["-12deg", "-18deg"],
  });
  const leftLowerRotate = flapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: hovered ? ["15deg", "38deg"] : ["22deg", "28deg"],
  });
  const rightLowerRotate = flapAnim.interpolate({
    inputRange: [0, 1],
    outputRange: hovered ? ["-15deg", "-38deg"] : ["-22deg", "-28deg"],
  });

  // Glow shadow opacity — intensified
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.0],
  });
  const glowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 22],
  });

  // Fly: translateY (negative = up)
  const flyTranslateY = flyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -w(28)],
  });

  // Sonic boom ring
  const boomRingScale = boomScale.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 4],
  });
  const boomRingOpacity = boomOpacity;

  // Antenna node glow interpolations
  const nodeGlowOpacity = nodeGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1.0],
  });
  const nodeGlowRadius = nodeGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 12],
  });
  const nodeScale = nodeGlow.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.25, 1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: w(28),
          height: w(42),
          transform: [{ translateY: flyTranslateY }],
        },
        hovered && {
          shadowColor: "#FBBF24",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: glowOpacity as unknown as number,
          shadowRadius: glowRadius as unknown as number,
          elevation: 8,
        },
      ]}
    >
      {/* Upper wings */}
      <View style={styles.upperRow}>
        {/* Left upper wing */}
        <Animated.View
          style={[
            styles.wing,
            {
              width: w(13),
              height: w(17),
              borderRadius: w(6.5),
              backgroundColor: EMERALD,
              transform: [{ rotate: leftUpperRotate }],
              right: w(1),
            },
          ]}
        >
          <View
            style={[
              styles.wingFill,
              {
                width: w(10),
                height: w(14),
                borderRadius: w(5),
                backgroundColor: GOLD,
                top: w(1.5),
                left: w(1.5),
              },
            ]}
          >
            <View
              style={[
                styles.wingHighlight,
                {
                  width: w(5),
                  height: w(8),
                  borderRadius: w(2.5),
                  backgroundColor: GOLD_LIGHT,
                  top: w(2),
                  left: w(2),
                },
              ]}
            />
          </View>
        </Animated.View>
        {/* Right upper wing */}
        <Animated.View
          style={[
            styles.wing,
            {
              width: w(13),
              height: w(17),
              borderRadius: w(6.5),
              backgroundColor: EMERALD,
              transform: [{ rotate: rightUpperRotate }],
              left: w(1),
            },
          ]}
        >
          <View
            style={[
              styles.wingFill,
              {
                width: w(10),
                height: w(14),
                borderRadius: w(5),
                backgroundColor: GOLD,
                top: w(1.5),
                right: w(1.5),
                alignSelf: "flex-end",
              },
            ]}
          >
            <View
              style={[
                styles.wingHighlight,
                {
                  width: w(5),
                  height: w(8),
                  borderRadius: w(2.5),
                  backgroundColor: GOLD_LIGHT,
                  top: w(2),
                  right: w(2),
                  alignSelf: "flex-end",
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* Lower wings */}
      <View style={[styles.lowerRow, { marginTop: -w(6) }]}>
        {/* Left lower wing */}
        <Animated.View
          style={[
            styles.wing,
            {
              width: w(10),
              height: w(13),
              borderRadius: w(5),
              backgroundColor: EMERALD,
              transform: [{ rotate: leftLowerRotate }],
              right: w(0),
            },
          ]}
        >
          <View
            style={[
              styles.wingFill,
              {
                width: w(7),
                height: w(10),
                borderRadius: w(3.5),
                backgroundColor: GOLD_DARK,
                top: w(1.5),
                left: w(1.5),
              },
            ]}
          />
        </Animated.View>
        {/* Right lower wing */}
        <Animated.View
          style={[
            styles.wing,
            {
              width: w(10),
              height: w(13),
              borderRadius: w(5),
              backgroundColor: EMERALD,
              transform: [{ rotate: rightLowerRotate }],
              left: w(0),
            },
          ]}
        >
          <View
            style={[
              styles.wingFill,
              {
                width: w(7),
                height: w(10),
                borderRadius: w(3.5),
                backgroundColor: GOLD_DARK,
                top: w(1.5),
                right: w(1.5),
                alignSelf: "flex-end",
              },
            ]}
          />
        </Animated.View>
      </View>

      {/* Body — thicker, segmented for depth */}
      <View
        style={[
          styles.body,
          {
            width: w(4),
            height: w(26),
            borderRadius: w(2),
            top: w(3),
            backgroundColor: BODY_PURPLE,
          },
        ]}
      >
        {/* Thorax segment (upper) */}
        <View
          style={{
            position: "absolute",
            top: w(2),
            left: w(0.5),
            width: w(3),
            height: w(5),
            borderRadius: w(1.5),
            backgroundColor: DEEP_PURPLE,
          }}
        />
        {/* Abdomen segment (lower) */}
        <View
          style={{
            position: "absolute",
            bottom: w(2),
            left: w(0.5),
            width: w(3),
            height: w(8),
            borderRadius: w(1.5),
            backgroundColor: DEEP_PURPLE,
          }}
        />
        {/* Head dot */}
        <View
          style={{
            position: "absolute",
            top: -w(1),
            left: w(0.75),
            width: w(2.5),
            height: w(2.5),
            borderRadius: w(1.25),
            backgroundColor: BODY_PURPLE,
          }}
        />
      </View>

      {/* Antennae — dramatically elongated with curled tips */}
      {/* Left antenna stem */}
      <View
        style={[
          styles.antenna,
          {
            width: w(1.2),
            height: w(13),
            borderRadius: w(0.6),
            top: -w(3),
            left: w(7.5),
            transform: [{ rotate: "-30deg" }],
          },
        ]}
      />
      {/* Left antenna tip (glowing node) */}
      <Animated.View
        style={[
          styles.antenna,
          {
            width: w(2.4),
            height: w(2.4),
            borderRadius: w(1.2),
            top: -w(7),
            left: w(4.5),
            backgroundColor: EMERALD_GLOW,
            shadowColor: EMERALD_GLOW,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: nodeGlowOpacity as unknown as number,
            shadowRadius: nodeGlowRadius as unknown as number,
            elevation: 6,
            transform: [{ scale: nodeScale as unknown as number }],
          },
        ]}
      />
      {/* Right antenna stem */}
      <View
        style={[
          styles.antenna,
          {
            width: w(1.2),
            height: w(13),
            borderRadius: w(0.6),
            top: -w(3),
            right: w(7.5),
            transform: [{ rotate: "30deg" }],
          },
        ]}
      />
      {/* Right antenna tip (glowing node) */}
      <Animated.View
        style={[
          styles.antenna,
          {
            width: w(2.4),
            height: w(2.4),
            borderRadius: w(1.2),
            top: -w(7),
            right: w(4.5),
            backgroundColor: EMERALD_GLOW,
            shadowColor: EMERALD_GLOW,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: nodeGlowOpacity as unknown as number,
            shadowRadius: nodeGlowRadius as unknown as number,
            elevation: 6,
            transform: [{ scale: nodeScale as unknown as number }],
          },
        ]}
      />

      {/* Sonic boom shockwave ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: w(20),
          height: w(20),
          borderRadius: w(10),
          borderWidth: w(2),
          borderColor: EMERALD_GLOW,
          alignSelf: "center",
          top: w(12),
          opacity: boomRingOpacity as unknown as number,
          transform: [{ scale: boomRingScale as unknown as number }],
        }}
      />
      {/* Second ring (delayed feel via larger initial) */}
      <Animated.View
        style={{
          position: "absolute",
          width: w(14),
          height: w(14),
          borderRadius: w(7),
          borderWidth: w(1.5),
          borderColor: GOLD_LIGHT,
          alignSelf: "center",
          top: w(15),
          opacity: boomRingOpacity as unknown as number,
          transform: [{ scale: boomRingScale as unknown as number }],
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  upperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  lowerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  wing: {
    position: "relative",
    overflow: "hidden",
  },
  wingFill: {
    position: "absolute",
    overflow: "hidden",
  },
  wingHighlight: {
    position: "absolute",
    opacity: 0.65,
  },
  body: {
    position: "absolute",
    backgroundColor: DEEP_PURPLE,
    alignSelf: "center",
    zIndex: 10,
  },
  antenna: {
    position: "absolute",
    backgroundColor: DEEP_PURPLE,
    zIndex: 11,
  },
});
