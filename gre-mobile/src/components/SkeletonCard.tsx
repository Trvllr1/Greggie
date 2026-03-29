import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "../theme";

export function SkeletonCard() {
  const theme = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, [shimmer]);

  const boneColor = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      theme.colors.skeletonBase,
      theme.colors.skeletonHighlight,
      theme.colors.skeletonBase,
    ],
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Animated.View style={[styles.badge, { backgroundColor: boneColor }]} />
        <Animated.View style={[styles.deleteBtn, { backgroundColor: boneColor }]} />
      </View>
      <Animated.View style={[styles.line, styles.lineShort, { backgroundColor: boneColor }]} />
      <Animated.View style={[styles.line, styles.lineMedium, { backgroundColor: boneColor }]} />
      <Animated.View style={[styles.embed, { backgroundColor: boneColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    width: 100,
    height: 24,
    borderRadius: 12,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  line: {
    height: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  lineShort: {
    width: "40%",
  },
  lineMedium: {
    width: "75%",
    marginBottom: 12,
  },
  embed: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
});
