import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS, SHADOW } from '../src/theme';
import { ScalePress } from '../src/components/ScalePress';
import { getApiClient } from '../src/hooks';
import { DEMO_CREATOR_CHANNEL, DEMO_CREATOR_PRODUCTS } from '../src/demoData';
import type { Channel, Product } from '@greggie/core';

const { width: SCREEN_W } = Dimensions.get('window');

type Tab = 'products' | 'chat' | 'analytics' | 'tools';

// ── Product Row ──
function ProductRow({ product, onPin, onDelete }: {
  product: Product;
  onPin: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.productRow}>
      {product.image_url ? (
        <Image
          source={{ uri: product.image_url }}
          style={styles.productThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.productThumb, styles.thumbPlaceholder]}>
          <Text style={{ fontSize: 20 }}>🛍️</Text>
        </View>
      )}
      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.productPrice}>
          ${(product.price_cents / 100).toFixed(2)}
        </Text>
      </View>
      <View style={styles.productActions}>
        <Pressable onPress={onPin} style={styles.iconButton}>
          <Text>{product.is_pinned ? '📌' : '📎'}</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.iconButton}>
          <Text>🗑️</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Chat Message ──
function ChatRow({ user, text, isQuestion }: {
  user: string;
  text: string;
  isQuestion?: boolean;
}) {
  return (
    <View style={[styles.chatRow, isQuestion && styles.chatQuestion]}>
      <Text style={styles.chatUser}>{user}</Text>
      <Text style={styles.chatText}>{text}</Text>
      {isQuestion && <Text style={styles.questionTag}>❓</Text>}
    </View>
  );
}

// ── Analytics Card ──
function StatCard({ label, value, icon }: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function CreatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [isLive, setIsLive] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // Modal state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Add Product form
  const [apName, setApName] = useState('');
  const [apDescription, setApDescription] = useState('');
  const [apImageUrl, setApImageUrl] = useState('');
  const [apPrice, setApPrice] = useState('');
  const [apInventory, setApInventory] = useState('10');
  const [apSaleType, setApSaleType] = useState<'buy_now' | 'auction'>('buy_now');

  // Settings form
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsCategory, setSettingsCategory] = useState('');

  // Flash Sale timer
  const [flashSaleActive, setFlashSaleActive] = useState(false);
  const [flashSaleSeconds, setFlashSaleSeconds] = useState(300);

  // Pinned question
  const [pinnedQuestionId, setPinnedQuestionId] = useState<string | null>(null);

  // Mock chat messages for now
  const [chatMessages] = useState([
    { id: '1', user: 'Alex', text: 'Love this product!', isQuestion: false },
    { id: '2', user: 'Sam', text: 'What size does it come in?', isQuestion: true },
    { id: '3', user: 'Jordan', text: 'Just ordered! 🚀', isQuestion: false },
    { id: '4', user: 'Riley', text: 'Can you show it closer?', isQuestion: true },
    { id: '5', user: 'Taylor', text: 'Amazing quality', isQuestion: false },
  ]);

  useEffect(() => {
    const client = getApiClient();
    client.getRail().then((chs) => {
      if (chs.length > 0) {
        setChannels(chs);
        setSelectedChannel(chs[0]);
        client.getChannelProducts(chs[0].id).then(setProducts).catch(() => {});
      } else {
        setChannels([DEMO_CREATOR_CHANNEL]);
        setSelectedChannel(DEMO_CREATOR_CHANNEL);
        setProducts(DEMO_CREATOR_PRODUCTS);
      }
    }).catch(() => {
      setChannels([DEMO_CREATOR_CHANNEL]);
      setSelectedChannel(DEMO_CREATOR_CHANNEL);
      setProducts(DEMO_CREATOR_PRODUCTS);
    });
  }, []);

  // Flash Sale countdown
  useEffect(() => {
    if (!flashSaleActive) return;
    if (flashSaleSeconds <= 0) {
      setFlashSaleActive(false);
      setFlashSaleSeconds(300);
      return;
    }
    const t = setTimeout(() => setFlashSaleSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [flashSaleActive, flashSaleSeconds]);

  const flashSaleDisplay = `${Math.floor(flashSaleSeconds / 60)}:${String(flashSaleSeconds % 60).padStart(2, '0')}`;

  const handleAddProduct = () => {
    if (!apName.trim()) return;
    const newProduct: Product = {
      id: `cp-${Date.now()}`,
      channel_id: selectedChannel?.id ?? '',
      name: apName.trim(),
      description: apDescription.trim(),
      price_cents: Math.round(parseFloat(apPrice || '10') * 100),
      original_price_cents: null,
      sale_type: apSaleType,
      image_url: apImageUrl.trim(),
      inventory: parseInt(apInventory, 10) || 10,
      is_pinned: false,
      auction_end_at: null,
      drop_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    setShowAddProduct(false);
    setApName('');
    setApDescription('');
    setApImageUrl('');
    setApPrice('');
    setApInventory('10');
    setApSaleType('buy_now');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveSettings = () => {
    if (selectedChannel) {
      setSelectedChannel({
        ...selectedChannel,
        title: settingsTitle || selectedChannel.title,
        category: settingsCategory || selectedChannel.category,
      });
    }
    setShowSettings(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'products', label: 'Products', icon: '🛍️' },
    { key: 'chat', label: 'Chat', icon: '💬' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
    { key: 'tools', label: 'Tools', icon: '🔧' },
  ];

  const handleGoLive = () => {
    Haptics.notificationAsync(
      isLive
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success,
    );
    setIsLive(!isLive);
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Remove "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setProducts(prev => prev.filter(p => p.id !== product.id));
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {selectedChannel?.title ?? 'Creator Studio'}
          </Text>
          {isLive && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>● LIVE</Text>
            </View>
          )}
        </View>
        <Pressable
          style={styles.settingsButton}
          onPress={() => {
            setSettingsTitle(selectedChannel?.title ?? '');
            setSettingsCategory(selectedChannel?.category ?? '');
            setShowSettings(true);
          }}
        >
          <Text>⚙️</Text>
        </Pressable>
      </View>

      {/* Stream preview + Go Live */}
      <View style={styles.streamPreview}>
        <View style={styles.streamPlaceholder}>
          <Text style={styles.streamPlaceholderText}>
            {isLive ? '📡 Broadcasting...' : '📷 Camera Preview'}
          </Text>
        </View>
        <Pressable
          onPress={handleGoLive}
          style={[styles.goLiveButton, isLive && styles.endStreamButton]}
        >
          <Text style={styles.goLiveText}>
            {isLive ? 'End Stream' : 'Go Live'}
          </Text>
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(tab.key);
            }}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.tabContentInner}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'products' && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Pressable
              style={styles.addButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowAddProduct(true);
              }}
            >
              <Text style={styles.addButtonText}>+ Add Product</Text>
            </Pressable>
            {products.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🛍️</Text>
                <Text style={styles.emptyTitle}>No products yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add products to showcase during your stream
                </Text>
              </View>
            ) : (
              products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onPin={() => {
                    setProducts(prev =>
                      prev.map(pr =>
                        pr.id === p.id ? { ...pr, is_pinned: !pr.is_pinned } : pr,
                      ),
                    );
                  }}
                  onDelete={() => handleDeleteProduct(p)}
                />
              ))
            )}
          </Animated.View>
        )}

        {activeTab === 'chat' && (
          <Animated.View entering={FadeIn.duration(200)}>
            {pinnedQuestionId && (
              <View style={styles.pinnedBanner}>
                <Text style={styles.pinnedBannerIcon}>📌</Text>
                <Text style={styles.pinnedBannerText}>
                  {chatMessages.find((m) => m.id === pinnedQuestionId)?.text ?? ''}
                </Text>
                <Pressable onPress={() => setPinnedQuestionId(null)}>
                  <Text style={styles.pinnedBannerClose}>✕</Text>
                </Pressable>
              </View>
            )}
            {chatMessages.map((msg) => (
              <Pressable
                key={msg.id}
                onLongPress={() => {
                  if (msg.isQuestion) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setPinnedQuestionId(msg.id);
                  }
                }}
              >
                <ChatRow
                  user={msg.user}
                  text={msg.text}
                  isQuestion={msg.isQuestion}
                />
              </Pressable>
            ))}
          </Animated.View>
        )}

        {activeTab === 'analytics' && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.analyticsGrid}>
            <StatCard
              icon="👁️"
              value={isLive ? '1,284' : '0'}
              label="Viewers"
            />
            <StatCard
              icon="💰"
              value={isLive ? '$2,450' : '$0.00'}
              label="Revenue"
            />
            <StatCard
              icon="❤️"
              value={isLive ? '8.3k' : '0'}
              label="Likes"
            />
            <StatCard
              icon="📦"
              value={isLive ? '47' : '0'}
              label="Orders"
            />
            <StatCard icon="⏱️" value={isLive ? '32m' : '--'} label="Stream Time" />
            <StatCard icon="💬" value={isLive ? '312' : '0'} label="Messages" />
          </Animated.View>
        )}

        {activeTab === 'tools' && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.toolsContainer}>
            {/* Flash Sale with real timer */}
            {flashSaleActive ? (
              <View style={[styles.toolButton, styles.flashSaleActiveCard]}>
                <Text style={styles.toolIcon}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toolTitle}>Flash Sale Active</Text>
                  <Text style={styles.flashSaleTimer}>{flashSaleDisplay}</Text>
                </View>
                <Pressable
                  style={styles.flashSaleEndBtn}
                  onPress={() => {
                    setFlashSaleActive(false);
                    setFlashSaleSeconds(300);
                  }}
                >
                  <Text style={styles.flashSaleEndText}>End</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.toolButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setFlashSaleActive(true);
                  setFlashSaleSeconds(300);
                }}
              >
                <Text style={styles.toolIcon}>⚡</Text>
                <View>
                  <Text style={styles.toolTitle}>Flash Sale</Text>
                  <Text style={styles.toolSubtitle}>5 minute limited offer</Text>
                </View>
              </Pressable>
            )}
            <Pressable
              style={styles.toolButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert('Countdown Drop', 'Countdown started!');
              }}
            >
              <Text style={styles.toolIcon}>⏱️</Text>
              <View>
                <Text style={styles.toolTitle}>Countdown Drop</Text>
                <Text style={styles.toolSubtitle}>60-second countdown reveal</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.toolButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert('Live Auction', 'Auction started!');
              }}
            >
              <Text style={styles.toolIcon}>🔨</Text>
              <View>
                <Text style={styles.toolTitle}>Live Auction</Text>
                <Text style={styles.toolSubtitle}>Real-time bidding</Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.toolButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert('Giveaway', 'Giveaway started!');
              }}
            >
              <Text style={styles.toolIcon}>🎁</Text>
              <View>
                <Text style={styles.toolTitle}>Giveaway</Text>
                <Text style={styles.toolSubtitle}>Random viewer raffle</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Add Product Modal ── */}
      {showAddProduct && (
        <Animated.View
          entering={ZoomIn.springify().damping(18)}
          exiting={ZoomOut.duration(150)}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowAddProduct(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <Pressable onPress={() => setShowAddProduct(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Product name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={apName}
                onChangeText={setApName}
              />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldMultiline]}
                placeholder="Optional description"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={apDescription}
                onChangeText={setApDescription}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.fieldLabel}>Image URL</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={apImageUrl}
                onChangeText={setApImageUrl}
                autoCapitalize="none"
              />
              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Price ($)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="10.00"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={apPrice}
                    onChangeText={setApPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Inventory</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="10"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={apInventory}
                    onChangeText={setApInventory}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Sale Type</Text>
              <View style={styles.saleTypeRow}>
                {(['buy_now', 'auction'] as const).map((st) => (
                  <Pressable
                    key={st}
                    style={[
                      styles.saleTypeChip,
                      apSaleType === st && styles.saleTypeChipActive,
                    ]}
                    onPress={() => setApSaleType(st)}
                  >
                    <Text
                      style={[
                        styles.saleTypeText,
                        apSaleType === st && styles.saleTypeTextActive,
                      ]}
                    >
                      {st === 'buy_now' ? 'Buy Now' : 'Auction'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable
              style={[styles.modalSubmit, !apName.trim() && { opacity: 0.4 }]}
              onPress={handleAddProduct}
              disabled={!apName.trim()}
            >
              <Text style={styles.modalSubmitText}>Add Product</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <Animated.View
          entering={ZoomIn.springify().damping(18)}
          exiting={ZoomOut.duration(150)}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowSettings(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Channel Settings</Text>
              <Pressable onPress={() => setShowSettings(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Channel Title</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Channel title"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={settingsTitle}
                onChangeText={setSettingsTitle}
              />
              <Text style={styles.fieldLabel}>Category</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Tech, Fashion, Art"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={settingsCategory}
                onChangeText={setSettingsCategory}
              />
            </View>
            <Pressable style={styles.modalSubmit} onPress={handleSaveSettings}>
              <Text style={styles.modalSubmitText}>Save Changes</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
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
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    paddingRight: SPACING.sm,
  },
  backText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.md,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
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
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stream preview
  streamPreview: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  streamPlaceholder: {
    height: 180,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streamPlaceholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT.md,
  },
  goLiveButton: {
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  endStreamButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  goLiveText: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '700',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: 2,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT.xs,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.accent,
  },

  // Tab content
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },

  // Products
  addButton: {
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  addButtonText: {
    color: COLORS.accent,
    fontSize: FONT.md,
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '500',
  },
  productPrice: {
    color: COLORS.accent,
    fontSize: FONT.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  chatQuestion: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  chatUser: {
    color: COLORS.accent,
    fontSize: FONT.sm,
    fontWeight: '600',
    width: 60,
  },
  chatText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: FONT.sm,
  },
  questionTag: {
    fontSize: 14,
  },

  // Analytics
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    width: (SCREEN_W - SPACING.md * 2 - SPACING.sm) / 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: FONT.xxl,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.xs,
  },

  // Tools
  toolsContainer: {
    gap: SPACING.sm,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: SPACING.md,
  },
  toolIcon: {
    fontSize: 28,
  },
  toolTitle: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '600',
  },
  toolSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT.xs,
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT.sm,
    textAlign: 'center',
  },

  // Flash sale active
  flashSaleActiveCard: {
    borderColor: COLORS.warning + '60',
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  flashSaleTimer: {
    color: COLORS.warning,
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  flashSaleEndBtn: {
    backgroundColor: 'rgba(239,68,71,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  flashSaleEndText: {
    color: '#EF4444',
    fontSize: FONT.sm,
    fontWeight: '700',
  },

  // Pinned question banner
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pinnedBannerIcon: {
    fontSize: 16,
  },
  pinnedBannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: FONT.sm,
    fontWeight: '500',
  },
  pinnedBannerClose: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT.md,
  },

  // Modals
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: FONT.lg,
    fontWeight: '700',
  },
  modalClose: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.xl,
  },
  modalBody: {
    padding: SPACING.md,
  },
  modalSubmit: {
    backgroundColor: COLORS.accent,
    margin: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: FONT.md,
    fontWeight: '700',
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.xs,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: '#FFFFFF',
    fontSize: FONT.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fieldMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  saleTypeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  saleTypeChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  saleTypeChipActive: {
    backgroundColor: COLORS.accent + '20',
    borderColor: COLORS.accent,
  },
  saleTypeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.sm,
    fontWeight: '600',
  },
  saleTypeTextActive: {
    color: COLORS.accent,
  },
});
