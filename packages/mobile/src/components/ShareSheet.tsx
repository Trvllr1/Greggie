import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Share,
  Platform,
  Linking,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

const SOCIALS = [
  { name: 'X', icon: '𝕏', color: '#000000' },
  { name: 'Instagram', icon: '📷', color: '#E4405F' },
  { name: 'Facebook', icon: '📘', color: '#1877F2' },
  { name: 'WhatsApp', icon: '💬', color: '#25D366' },
  { name: 'Telegram', icon: '✈️', color: '#0088CC' },
  { name: 'Reddit', icon: '🔴', color: '#FF4500' },
  { name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
];

interface ShareSheetProps {
  title: string;
  channelName: string;
  onClose: () => void;
}

export function ShareSheet({ title, channelName, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const shareText = `Check out "${channelName}" on Greggie — live commerce, reimagined!`;
  const shareUrl = `https://greggie.live/c/${encodeURIComponent(title)}`;

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `${shareText}\n${shareUrl}`,
        title: `Greggie | ${channelName}`,
      });
      onClose();
    } catch {}
  };

  const handleSocialTap = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // use native share as a catch-all on mobile
    handleNativeShare();
  };

  const handleCopy = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // on mobile, trigger native share which includes copy
    handleNativeShare();
  };

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify().damping(20)}
      exiting={SlideOutDown.duration(200)}
      style={styles.container}
    >
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.handleBar} />
        <Text style={styles.sheetTitle}>Share to</Text>

        <View style={styles.grid}>
          {SOCIALS.map((social) => (
            <Pressable
              key={social.name}
              onPress={() => handleSocialTap(social.name)}
              style={styles.socialButton}
            >
              <View style={[styles.socialCircle, { backgroundColor: social.color }]}>
                <Text style={styles.socialIcon}>{social.icon}</Text>
              </View>
              <Text style={styles.socialName}>{social.name}</Text>
            </Pressable>
          ))}

          <Pressable onPress={handleCopy} style={styles.socialButton}>
            <View style={[styles.socialCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.socialIcon}>{copied ? '✓' : '🔗'}</Text>
            </View>
            <Text style={styles.socialName}>{copied ? 'Copied!' : 'Copy'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={onClose} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'flex-start',
  },
  socialButton: {
    alignItems: 'center',
    gap: SPACING.xs,
    width: (SCREEN_W - SPACING.md * 2 - SPACING.md * 3) / 4,
  },
  socialCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  socialName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT.xs,
  },
  cancelButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.md,
    fontWeight: '500',
  },
});
