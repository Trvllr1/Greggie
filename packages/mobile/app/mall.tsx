import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  Dimensions,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '../src/theme';
import { GlassView } from '../src/components/GlassView';
import { ScalePress } from '../src/components/ScalePress';
import { PulseView } from '../src/components/PulseView';
import { useChannels, getApiClient } from '../src/hooks';
import { DEMO_CHANNELS, DEMO_PRODUCTS } from '../src/demoData';
import { FloatingHearts } from '../src/components/FloatingHearts';
import { GiftMenu, GiftAnimations, GIFTS, type Gift } from '../src/components/GiftSystem';
import { ShareSheet } from '../src/components/ShareSheet';
import { RelayQueryModal } from '../src/components/RelayQueryModal';
import type { Channel, Product } from '@greggie/core';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Feed Type ──
type FeedType = 'FOR_YOU' | 'FOLLOWING';

// ── Product Tray Card ──
function ProductCard({
  product,
  onBuy,
}: {
  product: Product;
  onBuy: (p: Product) => void;
}) {
  return (
    <ScalePress onPress={() => onBuy(product)} style={styles.productCard}>
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <Text style={styles.productImageEmoji}>🛍️</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.productPrice}>
          ${(product.price_cents / 100).toFixed(2)}
        </Text>
      </View>
      {product.sale_type === 'auction' && (
        <View style={styles.auctionBadge}>
          <Text style={styles.auctionText}>BID</Text>
        </View>
      )}
    </ScalePress>
  );
}

// ── Chat Message ──
interface ChatMsg {
  id: string;
  user: string;
  text: string;
  isSystem?: boolean;
  isGift?: boolean;
}

// ── Chat Overlay with input ──
function ChatOverlay({
  messages,
  onSendMessage,
  onOpenGifts,
}: {
  messages: ChatMsg[];
  onSendMessage: (text: string) => void;
  onOpenGifts: () => void;
}) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <View style={styles.chatContainer}>
      {messages.slice(-6).map((msg, index) => (
        <Animated.View
          key={msg.id}
          entering={FadeInDown.delay(index * 60).duration(200).springify()}
          style={[
            styles.chatMessage,
            msg.isSystem && styles.chatSystemMessage,
          ]}
        >
          <Text style={[styles.chatUser, msg.isGift && styles.chatGiftUser]}>
            {msg.user}
          </Text>
          <Text style={styles.chatText}>{msg.text}</Text>
        </Animated.View>
      ))}
      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.chatInput}
          placeholder="Say something..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <ScalePress onPress={onOpenGifts} style={styles.giftToggle}>
          <Text style={{ fontSize: 18 }}>🎁</Text>
        </ScalePress>
      </View>
    </View>
  );
}

// ── Scheduled Stream Overlay ──
function ScheduledOverlay({ channel }: { channel: Channel }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!channel.scheduled_at) return;
    const update = () => {
      const diff = new Date(channel.scheduled_at!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Starting soon...');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h > 0 ? `${h}h ` : ''}${m}m ${s}s`);
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [channel.scheduled_at]);

  if (channel.status !== 'SCHEDULED' || !channel.scheduled_at) return null;

  return (
    <View style={styles.scheduledOverlay}>
      <Text style={styles.scheduledIcon}>⏰</Text>
      <Text style={styles.scheduledTitle}>Coming Soon</Text>
      <Text style={styles.scheduledTimer}>{timeLeft}</Text>
      <Pressable
        style={styles.remindButton}
        onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
      >
        <Text style={styles.remindText}>🔔 Remind Me</Text>
      </Pressable>
    </View>
  );
}

// ── Single Channel View ──
function ChannelSlide({
  channel,
  isActive,
  feedType,
  onChangeFeedType,
  followedChannels,
  onToggleFollow,
  onOpenRail,
  onOpenProfile,
  onBuy,
}: {
  channel: Channel;
  isActive: boolean;
  feedType: FeedType;
  onChangeFeedType: (ft: FeedType) => void;
  followedChannels: Record<string, boolean>;
  onToggleFollow: (channelId: string) => void;
  onOpenRail: () => void;
  onOpenProfile: () => void;
  onBuy: (p: Product) => void;
}) {
  const insets = useSafeAreaInsets();
  const [showChat, setShowChat] = useState(false);
  const [showProducts, setShowProducts] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [likeCount, setLikeCount] = useState(
    Math.floor(Math.random() * 15000) + 1000,
  );
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: '1', user: 'Alex', text: 'This looks amazing!' },
    { id: '2', user: 'Sam', text: 'Is there a warranty?' },
    { id: '3', user: 'Jordan', text: 'Just bought one 🚀' },
  ]);

  // Gift state
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [activeGifts, setActiveGifts] = useState<{ id: number; gift: Gift }[]>([]);

  // Share & Relay
  const [showShare, setShowShare] = useState(false);
  const [showRelay, setShowRelay] = useState(false);

  const isFollowed = !!followedChannels[channel.id];

  useEffect(() => {
    if (!channel.id) return;
    if (channel.id.startsWith('demo-')) {
      setProducts(DEMO_PRODUCTS.filter((p) => p.channel_id === channel.id));
      return;
    }
    getApiClient()
      .getChannelProducts(channel.id)
      .then(setProducts)
      .catch(() => {
        setProducts(DEMO_PRODUCTS.filter((p) => p.channel_id === channel.id));
      });
  }, [channel.id]);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikeCount((c) => c + 1);
    // floating heart
    const newHeart = { id: Date.now(), x: Math.random() * 40 - 20 };
    setHearts((prev) => [...prev, newHeart]);
  };

  const handleHeartComplete = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleSendGift = (gift: Gift) => {
    setShowGiftMenu(false);
    const newGift = { id: Date.now(), gift };
    setActiveGifts((prev) => [...prev, newGift]);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        user: 'You',
        text: `Sent a ${gift.name} ${gift.icon}`,
        isSystem: true,
        isGift: true,
      },
    ]);
    setTimeout(() => {
      setActiveGifts((prev) => prev.filter((g) => g.id !== newGift.id));
    }, 4000);
  };

  const handleGiftAnimComplete = useCallback((id: number) => {
    setActiveGifts((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const handleSendMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), user: 'You', text },
    ]);
  };

  const formatCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${n}`;

  const imageUri = channel.stream_url || channel.thumbnail_url;

  return (
    <View style={[styles.slide, { width: SCREEN_W, height: SCREEN_H }]}>
      {/* Background */}
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.placeholderBg]} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Following / For You Tabs ── */}
      <View style={[styles.feedTabs, { paddingTop: insets.top + SPACING.xs }]}>
        <Pressable onPress={() => onChangeFeedType('FOLLOWING')}>
          <Text
            style={[
              styles.feedTabText,
              feedType === 'FOLLOWING' && styles.feedTabActive,
            ]}
          >
            Following
          </Text>
          {feedType === 'FOLLOWING' && <Animated.View entering={FadeIn.duration(150)} style={styles.feedTabIndicator} />}
        </Pressable>
        <Pressable onPress={() => onChangeFeedType('FOR_YOU')}>
          <Text
            style={[
              styles.feedTabText,
              feedType === 'FOR_YOU' && styles.feedTabActive,
            ]}
          >
            For You
          </Text>
          {feedType === 'FOR_YOU' && <Animated.View entering={FadeIn.duration(150)} style={styles.feedTabIndicator} />}
        </Pressable>
      </View>

      {/* Top channel info */}
      <View style={[styles.topBar, { paddingTop: insets.top + 44 }]}>
        <View style={styles.channelInfo}>
          {channel.status === 'LIVE' ? (
            <PulseView>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>● LIVE</Text>
              </View>
            </PulseView>
          ) : (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>{channel.status}</Text>
            </View>
          )}
          {/* Sponsored badge */}
          {channel.id === (DEMO_CHANNELS[0]?.id) && (
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>⭐ SPONSORED</Text>
            </View>
          )}
          <Text style={styles.viewerCount}>
            {formatCount(channel.viewer_count)} watching
          </Text>
        </View>
        <View style={styles.channelTitleRow}>
          <Text style={styles.channelTitle} numberOfLines={1}>
            {channel.title}
          </Text>
          <ScalePress
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggleFollow(channel.id);
            }}
            style={[
              styles.followButton,
              isFollowed && styles.followedButton,
            ]}
          >
            <Text
              style={[
                styles.followText,
                isFollowed && styles.followedText,
              ]}
            >
              {isFollowed ? 'Following' : 'Follow'}
            </Text>
          </ScalePress>
        </View>
        <Text style={styles.channelCategory}>{channel.category}</Text>
      </View>

      {/* Scheduled stream overlay */}
      <ScheduledOverlay channel={channel} />

      {/* Right action bar */}
      <View style={[styles.actionBar, { bottom: insets.bottom + 180 }]}>
        <ScalePress onPress={onOpenProfile} style={styles.actionButton}>
          <Text style={styles.actionIcon}>👤</Text>
          <Text style={styles.actionLabel}>Profile</Text>
        </ScalePress>
        <ScalePress onPress={handleLike} style={styles.actionButton}>
          <Text style={styles.actionIcon}>❤️</Text>
          <Text style={styles.actionLabel}>{formatCount(likeCount)}</Text>
        </ScalePress>
        <ScalePress
          onPress={() => setShowChat((c) => !c)}
          style={styles.actionButton}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Chat</Text>
        </ScalePress>
        <ScalePress onPress={() => setShowShare(true)} style={styles.actionButton}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionLabel}>Share</Text>
        </ScalePress>
        <ScalePress
          onPress={() => setShowRelay(true)}
          style={styles.actionButton}
        >
          <Text style={styles.actionIcon}>🤖</Text>
          <Text style={styles.actionLabel}>Relay</Text>
        </ScalePress>
        <ScalePress onPress={onOpenRail} style={styles.actionButton}>
          <Text style={styles.actionIcon}>📺</Text>
          <Text style={styles.actionLabel}>Channels</Text>
        </ScalePress>
      </View>

      {/* Floating hearts */}
      <FloatingHearts hearts={hearts} onComplete={handleHeartComplete} />

      {/* Gift animations */}
      <GiftAnimations activeGifts={activeGifts} onComplete={handleGiftAnimComplete} />

      {/* Chat overlay */}
      {showChat && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.chatWrapper, { bottom: insets.bottom + 180 }]}
        >
          <ChatOverlay
            messages={messages}
            onSendMessage={handleSendMessage}
            onOpenGifts={() => setShowGiftMenu(true)}
          />
        </Animated.View>
      )}

      {/* Gift menu */}
      {showGiftMenu && (
        <GiftMenu
          onSend={handleSendGift}
          onClose={() => setShowGiftMenu(false)}
        />
      )}

      {/* Share sheet */}
      {showShare && (
        <ShareSheet
          title={channel.id}
          channelName={channel.title}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Relay AI */}
      {showRelay && (
        <RelayQueryModal
          channelId={channel.id}
          channelTitle={channel.title}
          onClose={() => setShowRelay(false)}
        />
      )}

      {/* Product tray */}
      {showProducts && (
        <GlassView
          style={[
            styles.productTray,
            { paddingBottom: insets.bottom + SPACING.md },
          ]}
        >
          <ScalePress
            onPress={() => setShowProducts(false)}
            style={styles.productTrayHeader}
          >
            <Text style={styles.productTrayTitle}>🛍️ Products</Text>
            <Text style={styles.productTrayClose}>✕</Text>
          </ScalePress>
          <FlatList
            data={products}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProductCard product={item} onBuy={onBuy} />
            )}
            ListEmptyComponent={
              <Text style={styles.emptyProducts}>No products yet</Text>
            }
          />
        </GlassView>
      )}

      {/* FAB to re-show products */}
      {!showProducts && (
        <ScalePress
          onPress={() => setShowProducts(true)}
          style={[
            styles.showProductsButton,
            { bottom: insets.bottom + SPACING.lg },
          ]}
        >
          <Text style={styles.showProductsText}>🛍️</Text>
        </ScalePress>
      )}
    </View>
  );
}

// ── Main Mall Screen ──
export default function MallScreen() {
  const router = useRouter();
  const { channels, primary, loading, refresh } = useChannels();
  const flatListRef = useRef<FlatList>(null);

  // Feed type state
  const [feedType, setFeedType] = useState<FeedType>('FOR_YOU');

  // Follow state (optimistic)
  const [followedChannels, setFollowedChannels] = useState<
    Record<string, boolean>
  >({});

  const liveChannels =
    channels.length > 0 ? channels : primary ? [primary] : [];
  const allChannels =
    liveChannels.length > 0 ? liveChannels : DEMO_CHANNELS;

  // Filter channels by feed type
  const displayChannels =
    feedType === 'FOLLOWING'
      ? allChannels.filter((ch) => !!followedChannels[ch.id])
      : allChannels;

  const handleToggleFollow = useCallback(
    (channelId: string) => {
      const isFollowed = !!followedChannels[channelId];
      setFollowedChannels((prev) => ({
        ...prev,
        [channelId]: !isFollowed,
      }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // optimistic API call
      const client = getApiClient();
      if (client.getToken()) {
        (isFollowed
          ? client.unfollowChannel(channelId)
          : client.followChannel(channelId)
        ).catch(() => {
          setFollowedChannels((prev) => ({
            ...prev,
            [channelId]: isFollowed,
          }));
        });
      }
    },
    [followedChannels],
  );

  const handleOpenRail = useCallback(() => {
    router.push('/rail');
  }, [router]);

  const handleOpenProfile = useCallback(() => {
    router.push('/profile');
  }, [router]);

  const handleBuy = useCallback(
    (product: Product) => {
      if (product.sale_type === 'auction') {
        router.push({
          pathname: '/bid',
          params: { productId: product.id, channelId: product.channel_id },
        });
      } else {
        router.push({
          pathname: '/checkout',
          params: { productId: product.id, channelId: product.channel_id },
        });
      }
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Channel }) => (
      <ChannelSlide
        channel={item}
        isActive={true}
        feedType={feedType}
        onChangeFeedType={setFeedType}
        followedChannels={followedChannels}
        onToggleFollow={handleToggleFollow}
        onOpenRail={handleOpenRail}
        onOpenProfile={handleOpenProfile}
        onBuy={handleBuy}
      />
    ),
    [
      feedType,
      followedChannels,
      handleToggleFollow,
      handleOpenRail,
      handleOpenProfile,
      handleBuy,
    ],
  );

  if (loading && allChannels.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading channels...</Text>
      </View>
    );
  }

  // Following tab empty state
  if (feedType === 'FOLLOWING' && displayChannels.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.feedTabsStandalone}>
          <Pressable onPress={() => setFeedType('FOLLOWING')}>
            <Text style={[styles.feedTabText, styles.feedTabActive]}>Following</Text>
            <View style={styles.feedTabIndicator} />
          </Pressable>
          <Pressable onPress={() => setFeedType('FOR_YOU')}>
            <Text style={styles.feedTabText}>For You</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 48, marginBottom: SPACING.md }}>📺</Text>
        <Text style={styles.loadingText}>No followed channels yet</Text>
        <Text
          style={[styles.loadingText, { fontSize: FONT.sm, marginTop: SPACING.xs }]}
        >
          Follow channels to see them here
        </Text>
        <Pressable
          onPress={() => setFeedType('FOR_YOU')}
          style={styles.exploreButton}
        >
          <Text style={styles.exploreButtonText}>Explore For You</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={displayChannels}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={SCREEN_H}
      decelerationRate="fast"
      onRefresh={refresh}
      refreshing={loading}
      getItemLayout={(_, index) => ({
        length: SCREEN_H,
        offset: SCREEN_H * index,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  slide: {
    backgroundColor: COLORS.base,
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT.lg,
  },

  // Feed tabs (Following / For You)
  feedTabs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    zIndex: 20,
  },
  feedTabsStandalone: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  feedTabText: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  feedTabActive: {
    color: '#FFFFFF',
  },
  feedTabIndicator: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    marginTop: 4,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.md,
    zIndex: 10,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  liveBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: FONT.xs,
    fontWeight: '700',
  },
  sponsoredBadge: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  sponsoredText: {
    color: '#FBBF24',
    fontSize: FONT.xs,
    fontWeight: '700',
  },
  viewerCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT.sm,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
  },
  channelTitle: {
    color: '#FFFFFF',
    fontSize: FONT.xl,
    fontWeight: '700',
    flex: 1,
  },
  followButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  followedButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  followText: {
    color: '#000000',
    fontSize: FONT.xs,
    fontWeight: '700',
  },
  followedText: {
    color: '#FFFFFF',
  },
  channelCategory: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.sm,
  },

  // Scheduled overlay
  scheduledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    gap: SPACING.sm,
  },
  scheduledIcon: {
    fontSize: 48,
  },
  scheduledTitle: {
    color: '#FFFFFF',
    fontSize: FONT.xxl,
    fontWeight: '800',
  },
  scheduledTimer: {
    color: COLORS.accent,
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  remindButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
  },
  remindText: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '700',
  },

  // Right action bar
  actionBar: {
    position: 'absolute',
    right: SPACING.md,
    alignItems: 'center',
    gap: SPACING.lg,
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    gap: 2,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: FONT.xs,
    fontWeight: '600',
  },

  // Chat
  chatWrapper: {
    position: 'absolute',
    left: SPACING.md,
    right: 80,
    zIndex: 10,
  },
  chatContainer: {
    gap: SPACING.xs,
  },
  chatMessage: {
    flexDirection: 'row',
    gap: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  chatSystemMessage: {
    backgroundColor: 'rgba(99,102,241,0.2)',
  },
  chatUser: {
    color: COLORS.accent,
    fontSize: FONT.sm,
    fontWeight: '600',
  },
  chatGiftUser: {
    color: COLORS.warning,
  },
  chatText: {
    color: '#FFFFFF',
    fontSize: FONT.sm,
    flex: 1,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    color: '#FFFFFF',
    fontSize: FONT.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  giftToggle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Product tray
  productTray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingTop: SPACING.sm,
    zIndex: 10,
  },
  productTrayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  productTrayTitle: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '600',
  },
  productTrayClose: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.lg,
  },
  productList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  emptyProducts: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT.sm,
    paddingVertical: SPACING.md,
    textAlign: 'center',
    width: SCREEN_W - SPACING.md * 2,
  },

  // Product card
  productCard: {
    width: 120,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  productImage: {
    width: 120,
    height: 90,
  },
  productInfo: {
    padding: SPACING.xs,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: FONT.xs,
    fontWeight: '600',
  },
  productPrice: {
    color: COLORS.accent,
    fontSize: FONT.sm,
    fontWeight: '700',
    marginTop: 2,
  },
  auctionBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: '#EF4444',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  auctionText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },

  // Show products FAB
  showProductsButton: {
    position: 'absolute',
    left: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  showProductsText: {
    fontSize: 20,
  },
  placeholderBg: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImagePlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImageEmoji: {
    fontSize: 28,
  },

  // Following empty state
  exploreButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '700',
  },
});
