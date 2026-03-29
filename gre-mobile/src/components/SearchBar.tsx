import React, { useRef, useEffect, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Text,
} from "react-native";
import { useTheme } from "../theme";
import { ButterflyIcon } from "./ButterflyIcon";

interface SearchBarProps {
  visible: boolean;
  query: string;
  onChangeQuery: (q: string) => void;
  onClose: () => void;
  resultCount: number;
}

export function SearchBar({
  visible,
  query,
  onChangeQuery,
  onClose,
  resultCount,
}: SearchBarProps) {
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      if (visible) inputRef.current?.focus();
    });
  }, [visible, slideAnim]);

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  if (!visible && !query) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateX }],
        },
      ]}
    >
      <View style={styles.butterflyWrap}>
        <ButterflyIcon size={20} hovered={focused || query.length > 0} />
      </View>
      <TextInput
        ref={inputRef}
        value={query}
        onChangeText={onChangeQuery}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search feed..."
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          {
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            borderColor: focused
              ? theme.colors.borderFocus
              : theme.colors.border,
          },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {query.length > 0 && (
        <Text style={[styles.count, { color: theme.colors.textMuted }]}>
          {resultCount}
        </Text>
      )}
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <Text style={[styles.closeText, { color: theme.colors.textMuted }]}>
          ✕
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  butterflyWrap: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "500",
    borderWidth: 1,
  },
  count: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
