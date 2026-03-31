import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/theme';
import { ScalePress } from '../../src/components/ScalePress';
import { ButterflyIcon } from '../../src/components/ButterflyIcon';
import { getApiClient } from '../../src/hooks';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<{
    username: string;
    display_name: string;
    role: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const client = getApiClient();
    if (client.getToken()) {
      client.getMe().then(setUser).catch(() => {});
    }
  }, []);

  const [walletBalance] = useState(245.50);

  const menuItems = [
    { icon: '👤', label: 'Edit Profile', route: '/profile/edit' as const },
    { icon: '💰', label: 'Wallet', route: '/profile/wallet' as const },
    { icon: '📦', label: 'Orders', route: '/profile/orders' as const },
    { icon: '❤️', label: 'Following', route: '/profile/following' as const },
    { icon: '⚙️', label: 'Settings', route: '/profile/settings' as const },
  ];

  return (
    <Animated.View
      entering={SlideInDown.duration(400).springify().damping(20)}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <ButterflyIcon size={48} />
          </View>
          <Text style={styles.displayName}>
            {user?.display_name ?? 'Guest User'}
          </Text>
          <Text style={styles.username}>
            @{user?.username ?? 'guest'}
          </Text>
          {user?.role === 'creator' && (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorBadgeText}>Creator</Text>
            </View>
          )}
        </View>

        {/* Wallet card */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.walletCard}
        >
          <View style={styles.walletHeader}>
            <Text style={styles.walletLabel}>💎 Wallet Balance</Text>
          </View>
          <Text style={styles.walletBalance}>
            ${walletBalance.toFixed(2)}
          </Text>
          <View style={styles.walletActions}>
            <ScalePress
              style={styles.walletButton}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Text style={styles.walletButtonText}>+ Add Funds</Text>
            </ScalePress>
            <ScalePress
              style={[styles.walletButton, styles.walletButtonOutline]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Text style={[styles.walletButtonText, styles.walletButtonOutlineText]}>
                Withdraw
              </Text>
            </ScalePress>
          </View>
        </LinearGradient>

        {/* Menu items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, i) => (
            <ScalePress
              key={i}
              style={styles.menuItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (item.route) router.push(item.route as any);
              }}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </ScalePress>
          ))}
        </View>

        {/* Creator Studio CTA */}
        <ScalePress
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/creator');
          }}
          style={styles.creatorCta}
        >
          <Text style={styles.creatorCtaIcon}>🎬</Text>
          <View style={styles.creatorCtaText}>
            <Text style={styles.creatorCtaTitle}>Creator Studio</Text>
            <Text style={styles.creatorCtaSubtitle}>
              Manage your channels, products, and go live
            </Text>
          </View>
          <Text style={styles.creatorCtaArrow}>→</Text>
        </ScalePress>

        {/* Auth buttons */}
        <View style={styles.authContainer}>
          {!user ? (
            <Pressable style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.logoutButton}
              onPress={() => {
                const client = getApiClient();
                client.clearToken();
                setUser(null);
              }}
            >
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: FONT.xl,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.lg,
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.lg,
   paddingBottom: SPACING.xxl,
  },

  // User card
  userCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  displayName: {
    color: '#FFFFFF',
    fontSize: FONT.xl,
    fontWeight: '700',
  },
  username: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.md,
    marginTop: 2,
  },
  creatorBadge: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  creatorBadgeText: {
    color: COLORS.accent,
    fontSize: FONT.xs,
    fontWeight: '600',
  },

  // Wallet card
  walletCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT.sm,
    fontWeight: '600',
  },
  walletBalance: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  walletActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  walletButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  walletButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  walletButtonText: {
    color: '#FFFFFF',
    fontSize: FONT.sm,
    fontWeight: '700',
  },
  walletButtonOutlineText: {
    color: 'rgba(255,255,255,0.8)',
  },

  // Menu
  menuContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  menuIcon: {
    fontSize: 20,
    width: 32,
  },
  menuLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '500',
  },
  menuArrow: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: FONT.xl,
  },

  // Creator CTA
  creatorCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(129,140,248,0.1)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    gap: SPACING.sm,
  },
  creatorCtaIcon: {
    fontSize: 28,
  },
  creatorCtaText: {
    flex: 1,
  },
  creatorCtaTitle: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '600',
  },
  creatorCtaSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.xs,
    marginTop: 2,
  },
  creatorCtaArrow: {
    color: COLORS.accent,
    fontSize: FONT.xl,
    fontWeight: '600',
  },

  // Auth
  authContainer: {
    gap: SPACING.sm,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#000000',
    fontSize: FONT.md,
    fontWeight: '700',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.md,
    fontWeight: '500',
  },
});
