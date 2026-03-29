/**
 * Haptic feedback utility - gracefully handles haptics availability
 */

async function triggerHaptic() {
  try {
    // Dynamic require to avoid hard dependency
    const Haptics = await import("expo-haptics");
    if (Haptics?.impactAsync) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics not available, silently fail
  }
}

export { triggerHaptic };

