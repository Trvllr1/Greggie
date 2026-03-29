import React, { useEffect, useRef, useState } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Animated, Easing } from "react-native";
import { submitUrl, FeedItem } from "../services/api";
import { triggerHaptic } from "../utils/haptics";
import { useTheme } from "../theme";
import { ButterflyIcon } from "./ButterflyIcon";
import { detectPlatform, DetectedPlatform } from "../utils/platformDetect";

interface UrlInputBarProps {
  onIngested: () => void;
  /** Magic Drop: called immediately with URL + detected platform so App can insert phantom card */
  onMagicDrop?: (url: string, detected: DetectedPlatform) => void;
  /** Magic Drop: called when item arrives from API */
  onMagicDropComplete?: (item: FeedItem) => void;
}

export function UrlInputBar({ onIngested, onMagicDrop, onMagicDropComplete }: UrlInputBarProps) {
  const theme = useTheme();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  // Spinning butterfly animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (loading) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [loading, spinAnim]);

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    await triggerHaptic();

    // Magic Drop: detect platform and notify parent immediately
    const detected = detectPlatform(trimmed);
    onMagicDrop?.(trimmed, detected);

    setLoading(true);
    setError(null);
    setUrl("");
    try {
      const newItem = await submitUrl(trimmed);
      onMagicDropComplete?.(newItem);
      onIngested();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceElevated, borderBottomColor: theme.colors.border }]}>
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.borderElevated,
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
            },
            focused && {
              borderColor: theme.colors.borderFocus,
              backgroundColor: theme.colors.surfaceOverlay,
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
          placeholder="Share a moment..."
          placeholderTextColor={theme.colors.textMuted}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!loading}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.accentMuted, ...theme.shadows.button },
            (!url.trim() || loading) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!url.trim() || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
              <ButterflyIcon size={20} />
            </Animated.View>
          ) : (
            <Text style={styles.buttonText}>↗</Text>
          )}
        </TouchableOpacity>
      </View>
      {error && <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  button: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  error: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
});
