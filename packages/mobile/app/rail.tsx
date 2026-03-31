import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS, SHADOW, CATEGORY_COLORS } from '../src/theme';
import { ScalePress } from '../src/components/ScalePress';
import { useChannels } from '../src/hooks';
import { CATEGORIES, type Channel } from '@greggie/core';

function ChannelCard({
  channel,
  onSelect,
}: {
  channel: Channel;
  onSelect: (ch: Channel) => void;
}) {
  return (
    <ScalePress
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(channel);
      }}
      style={styles.card}
    >
      <View style={styles.cardImageContainer}>
        {channel.thumbnail_url || channel.stream_url ? (
          <Image
            source={{ uri: channel.thumbnail_url || channel.stream_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={styles.cardPlaceholderEmoji}>📺</Text>
          </View>
        )}
        <View style={styles.cardGradient} />

        <View style={styles.cardBadges}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  channel.status === 'LIVE'
                    ? '#EF4444'
                    : channel.status === 'RELAY'
                    ? COLORS.accent
                    : 'rgba(255,255,255,0.2)',
              },
            ]}
          >
            <Text style={styles.statusText}>{channel.status}</Text>
          </View>
          <Text style={styles.viewerText}>
            {channel.viewer_count >= 1000
              ? `${(channel.viewer_count / 1000).toFixed(1)}k`
              : channel.viewer_count}{' '}
            watching
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {channel.title}
        </Text>
        <View style={styles.cardMeta}>
          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor:
                  (CATEGORY_COLORS[channel.category] ?? COLORS.accent) + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: CATEGORY_COLORS[channel.category] ?? COLORS.accent },
              ]}
            >
              {channel.category}
            </Text>
          </View>
          <Text style={styles.saleTypeText}>{channel.sale_type?.replace('_', ' ')}</Text>
        </View>
      </View>
    </ScalePress>
  );
}

export default function RailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { channels, loading, refresh } = useChannels();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      selectedCategory
        ? channels.filter((c) => c.category === selectedCategory)
        : channels,
    [channels, selectedCategory],
  );

  const handleSelect = (ch: Channel) => {
    // Navigate back to mall with selected channel
    router.back();
  };

  return (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutRight.duration(300)}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔥 Trending Now</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {/* Category filter */}
      <FlatList
        horizontal
        data={['All', ...CATEGORIES]}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilter}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          const isActive = item === 'All' ? !selectedCategory : selectedCategory === item;
          return (
            <Pressable
              onPress={() => setSelectedCategory(item === 'All' ? null : item)}
              style={[
                styles.categoryPill,
                isActive && styles.categoryPillActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  isActive && styles.categoryPillTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Channel list */}
      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <ChannelCard channel={item} onSelect={handleSelect} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={loading}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No channels found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different category or follow more creators
            </Text>
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },

  // Header
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.lg,
  },

  // Category filter
  categoryFilter: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  categoryPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  categoryPillActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryPillText: {
    color: '#FFFFFF',
    fontSize: FONT.sm,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#000000',
  },

  // Channel list
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },

  // Channel card
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardImageContainer: {
    height: 140,
    overflow: 'hidden',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  cardImagePlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  cardPlaceholderEmoji: {
    fontSize: 36,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardBadges: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: FONT.xs,
    fontWeight: '700',
  },
  viewerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT.xs,
  },

  // Card body
  cardBody: {
    padding: SPACING.sm,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  categoryText: {
    fontSize: FONT.xs,
    fontWeight: '500',
  },
  saleTypeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT.xs,
    textTransform: 'capitalize',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.sm,
    textAlign: 'center',
  },
});
