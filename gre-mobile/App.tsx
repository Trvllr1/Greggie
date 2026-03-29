import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { UniversalCard } from "./src/components/UniversalCard";
import { UrlInputBar } from "./src/components/UrlInputBar";
import { SkeletonCard } from "./src/components/SkeletonCard";
import { PlatformFilterBar } from "./src/components/PlatformFilterBar";
import { SearchBar } from "./src/components/SearchBar";
import { GridCard } from "./src/components/GridCard";
import { MaterializingCard } from "./src/components/MaterializingCard";
import { CinemaMode } from "./src/components/CinemaMode";
import { OnboardingOverlay, hasCompletedOnboarding, markOnboardingDone } from "./src/components/OnboardingOverlay";
import { CollectionsOverlay } from "./src/components/CollectionsOverlay";
import { AddToCollectionSheet } from "./src/components/AddToCollectionSheet";
import { ShareStackOverlay } from "./src/components/ShareStackOverlay";
import { useFeed } from "./src/hooks/useFeed";
import { useSearch } from "./src/hooks/useSearch";
import { useShareStack } from "./src/hooks/useShareStack";
import { FeedItem } from "./src/services/api";
import { triggerHaptic } from "./src/utils/haptics";
import { darkTheme, lightTheme, ThemeProvider } from "./src/theme";
import { ButterflyIcon } from "./src/components/ButterflyIcon";
import { DetectedPlatform } from "./src/utils/platformDetect";

const PREVIEW_DURATION = 4000;

export default function App() {
  const {
    items,
    loading,
    loadingMore,
    error,
    refresh,
    fetchMore,
    visibleIndices,
    activeIndex,
    removeItem,
    onViewableItemsChanged,
    viewabilityConfig,
  } = useFeed();

  const isWeb = Platform.OS === "web";

  // ── Toggle state ──
  const [autoplay, setAutoplay] = useState(true);
  const [autoscroll, setAutoscroll] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [logoHovered, setLogoHovered] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set());
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // ── Magic Drop state ──
  const [magicDrop, setMagicDrop] = useState<{
    url: string;
    detected: DetectedPlatform;
    loading: boolean;
    item?: FeedItem;
  } | null>(null);

  // ── Cinema mode state ──
  const [cinemaMode, setCinemaMode] = useState(false);
  const [cinemaIndex, setCinemaIndex] = useState(0);

  // ── Onboarding state ──
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());

  // ── Grid video autoplay state ──
  // gridPlayingId: the card currently playing
  // gridPausedIds: set of card IDs that were playing and got paused (retain their iframe)
  const [gridPlayingId, setGridPlayingId] = useState<string | null>(null);
  const [gridPausedIds, setGridPausedIds] = useState<Set<string>>(new Set());

  // ── Collections + Share Stack state ──
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [shareStackOpen, setShareStackOpen] = useState(false);
  const [addToCollectionItem, setAddToCollectionItem] = useState<FeedItem | null>(null);
  const { count: shareStackCount, refreshCount: refreshStackCount } = useShareStack();

  const theme = darkMode ? darkTheme : lightTheme;

  // ── Scroll refs ──
  const flatListRef = useRef<FlatList<FeedItem>>(null);
  const gridScrollRef = useRef<ScrollView>(null);
  const scrollIndexRef = useRef(0);

  // ── Platform filtering ──
  const platformFiltered = useMemo(() => {
    if (activePlatforms.size === 0) return items;
    return items.filter((i) => activePlatforms.has(i.source.platform));
  }, [items, activePlatforms]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => {
      counts[i.source.platform] = (counts[i.source.platform] || 0) + 1;
    });
    return counts;
  }, [items]);

  // ── Search ──
  const { items: displayItems, matchCount } = useSearch(platformFiltered, searchQuery);

  // ── Grid: auto-start first video when entering grid mode with autoplay ON ──
  useEffect(() => {
    if (viewMode === "grid" && autoplay && !gridPlayingId) {
      const firstVideo = displayItems.find(
        (i) => !!i.content.is_video || !!i.content.embed_html
      );
      if (firstVideo) {
        setGridPlayingId(firstVideo.id);
      }
    }
    // Reset grid playback state when leaving grid
    if (viewMode !== "grid") {
      setGridPlayingId(null);
      setGridPausedIds(new Set());
    }
  }, [viewMode, autoplay]);

  // ── Grid: find next video after current finishes ──
  // YouTube iframe doesn't reliably report end, so we use a generous timeout
  // For now, user clicks to advance. Future: detect via postMessage.

  const handlePlatformToggle = (key: string) => {
    if (key === "all") {
      setActivePlatforms(new Set());
    } else {
      setActivePlatforms((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }
  };

  const handleToggleViewMode = async () => {
    await triggerHaptic();
    setViewMode((v) => (v === "list" ? "grid" : "list"));
  };

  const handleOpenSearch = async () => {
    await triggerHaptic();
    setSearchMode(true);
  };

  const handleCloseSearch = () => {
    setSearchMode(false);
    setSearchQuery("");
  };

  // ── Scroll to top on logo click ──
  const handleLogoPress = useCallback(async () => {
    await triggerHaptic();
    if (viewMode === "list") {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } else {
      gridScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [viewMode]);

  // ── Long press logo → re-trigger onboarding ──
  const handleLogoLongPress = useCallback(async () => {
    await triggerHaptic();
    if (Platform.OS === "web") {
      try { localStorage.removeItem("greggie_onboarding_done"); } catch {}
    }
    setShowOnboarding(true);
  }, []);

  // ── Magic Drop handlers ──
  const handleMagicDrop = useCallback((url: string, detected: DetectedPlatform) => {
    setMagicDrop({ url, detected, loading: true });
  }, []);

  const handleMagicDropComplete = useCallback((item: FeedItem) => {
    setMagicDrop((prev) =>
      prev ? { ...prev, loading: false, item } : null
    );
    setTimeout(() => setMagicDrop(null), 2500);
  }, []);

  // ── Cinema mode handlers ──
  const handleOpenCinema = useCallback((index: number) => {
    setCinemaIndex(index);
    setCinemaMode(true);
  }, []);

  const handleCloseCinema = useCallback(() => {
    setCinemaMode(false);
  }, []);

  // ── Onboarding handler ──
  const handleOnboardingComplete = useCallback((selectedPlatforms: string[]) => {
    setShowOnboarding(false);
    markOnboardingDone();
    if (selectedPlatforms.length > 0) {
      setActivePlatforms(new Set(selectedPlatforms));
    }
    refresh();
  }, [refresh]);

  // ── Grid card press: select for play (single tap), Cinema (double tap) ──
  const handleGridCardPress = useCallback((id: string) => {
    triggerHaptic();
    if (gridPlayingId === id) return; // already playing, ignore

    // Pause current playing card
    if (gridPlayingId) {
      setGridPausedIds((prev) => new Set(prev).add(gridPlayingId));
    }

    // If this card was paused, resume it (remove from paused set)
    setGridPausedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    setGridPlayingId(id);
  }, [gridPlayingId]);

  const handleGridCardRestart = useCallback((id: string) => {
    triggerHaptic();
    // Remove from paused, clear playing, then re-set to force iframe reload
    setGridPausedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setGridPlayingId(null);
    // Use timeout to force a re-mount of the iframe
    setTimeout(() => setGridPlayingId(id), 50);
  }, []);

  // ── Grid: auto-advance to next video when current ends ──
  const handleGridVideoEnded = useCallback((id: string) => {
    // Find the next video card after the one that just ended
    const currentIndex = displayItems.findIndex((i) => i.id === id);
    if (currentIndex === -1) return;

    const nextVideo = displayItems.slice(currentIndex + 1).find(
      (i) => !!i.content.is_video || !!i.content.embed_html
    );
    if (nextVideo) {
      setGridPlayingId(nextVideo.id);
      // Remove it from paused set if it was paused
      setGridPausedIds((prev) => {
        const next = new Set(prev);
        next.delete(nextVideo.id);
        return next;
      });
    } else {
      // No more videos — stop playback
      setGridPlayingId(null);
    }
  }, [displayItems]);

  // ── Autoscroll logic — redesigned ──
  // Autoscroll previews cards by auto-scrolling through the feed.
  // User tap on card area → stops autoscroll, that card plays.
  // Manual scroll → suspends autoscroll. When manual scroll ends → resumes after delay.
  // ── Autoscroll logic — works for both list and grid ──
  const [userScrolling, setUserScrolling] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridScrollIndexRef = useRef(0);

  // Grid row height: video cards 240 + 8 padding, image 200+8, text 140+8; use ~250 as average
  const GRID_ROW_HEIGHT = 250;

  useEffect(() => {
    if (!autoscroll || displayItems.length === 0 || pinnedId || userScrolling) return;

    if (viewMode === "list") {
      if (activeIndex !== null) scrollIndexRef.current = activeIndex;

      const timer = setInterval(() => {
        const next = scrollIndexRef.current + 1;
        if (next >= displayItems.length) {
          setAutoscroll(false);
          return;
        }
        scrollIndexRef.current = next;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
      }, PREVIEW_DURATION);

      return () => clearInterval(timer);
    } else {
      // Grid mode: scroll by rows (2 items per row)
      const timer = setInterval(() => {
        const nextRow = gridScrollIndexRef.current + 1;
        const totalRows = Math.ceil(displayItems.length / 2);
        if (nextRow >= totalRows) {
          setAutoscroll(false);
          return;
        }
        gridScrollIndexRef.current = nextRow;
        gridScrollRef.current?.scrollTo({
          y: nextRow * GRID_ROW_HEIGHT,
          animated: true,
        });
      }, PREVIEW_DURATION);

      return () => clearInterval(timer);
    }
  }, [autoscroll, displayItems.length, activeIndex, pinnedId, userScrolling, viewMode]);

  // Detect manual scroll start → suspend autoscroll
  const handleScrollBeginDrag = useCallback(() => {
    if (!autoscroll) return;
    setUserScrolling(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, [autoscroll]);

  // Detect manual scroll end → resume after 3s idle
  const handleScrollEndDrag = useCallback(() => {
    if (!autoscroll) return;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setUserScrolling(false);
    }, 3000);
  }, [autoscroll]);

  // Tap card → stop autoscroll, pin that card for play
  const handlePin = useCallback((id: string) => {
    if (autoscroll) {
      setAutoscroll(false);
      setUserScrolling(false);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    }
    setPinnedId((prev) => (prev === id ? null : id));
  }, [autoscroll]);

  const handleContentEnded = useCallback((id: string) => {
    if (pinnedId === id) {
      setPinnedId(null);
    }
  }, [pinnedId]);

  const handleToggleAutoplay = async () => {
    await triggerHaptic();
    setAutoplay((v) => !v);
  };

  const handleToggleAutoscroll = async () => {
    await triggerHaptic();
    setAutoscroll((v) => !v);
    setPinnedId(null);
    setUserScrolling(false);
    gridScrollIndexRef.current = 0;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const handleToggleDarkMode = async () => {
    await triggerHaptic();
    setDarkMode((v) => !v);
  };

  // ── Cinema from card ID (list and grid) ──
  const handleCinemaFromId = useCallback((id: string) => {
    const idx = displayItems.findIndex((i) => i.id === id);
    if (idx !== -1) handleOpenCinema(idx);
  }, [displayItems, handleOpenCinema]);

  // ── Add to Collection handler ──
  const handleAddToCollection = useCallback((id: string) => {
    triggerHaptic();
    const item = displayItems.find((i) => i.id === id);
    if (item) setAddToCollectionItem(item);
  }, [displayItems]);

  // Determine which single list card should be active (playing).
  // If there's a pinned card, that one plays. Otherwise, the first visible card plays.
  const activeListId = useMemo(() => {
    if (!autoplay || cinemaMode) return null;
    if (pinnedId) return pinnedId;
    // On web, activeIndex may not update via viewableItems — use index 0 as default
    const idx = activeIndex ?? 0;
    return displayItems[idx]?.id ?? null;
  }, [autoplay, cinemaMode, pinnedId, activeIndex, displayItems]);

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <UniversalCard
        item={item}
        isVisible={isWeb || visibleIndices.has(index)}
        isActive={item.id === activeListId}
        isPinned={pinnedId === item.id}
        onDelete={removeItem}
        onPin={handlePin}
        onContentEnded={handleContentEnded}
        onCinema={handleCinemaFromId}
        onAddToCollection={handleAddToCollection}
      />
    ),
    [isWeb, visibleIndices, activeListId, removeItem, pinnedId, handlePin, handleContentEnded, handleCinemaFromId, handleAddToCollection]
  );

  return (
    <ThemeProvider value={theme}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.base }]}>
        <StatusBar
          barStyle={theme.dark ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.surfaceElevated}
        />

        <View style={[styles.header, { backgroundColor: theme.colors.surfaceElevated, borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerTop}>
            {searchMode ? (
              <SearchBar
                visible={searchMode}
                query={searchQuery}
                onChangeQuery={setSearchQuery}
                onClose={handleCloseSearch}
                resultCount={matchCount}
              />
            ) : (
              <Pressable
                onPress={handleLogoPress}
                onLongPress={handleLogoLongPress}
                onHoverIn={() => setLogoHovered(true)}
                onHoverOut={() => setLogoHovered(false)}
                style={styles.logoPress}
              >
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Gregg</Text>
                  <View style={styles.butterflyWrap}>
                    <ButterflyIcon size={34} hovered={logoHovered} />
                  </View>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>e</Text>
                </View>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Your unified feed</Text>
              </Pressable>
            )}
            <View style={styles.headerActions}>
              {/* Share Stack button with badge */}
              <Pressable
                onPress={() => { triggerHaptic(); setShareStackOpen(true); }}
                style={[styles.headerBtn, { backgroundColor: theme.colors.surfaceOverlay }]}
              >
                <Text style={[styles.headerBtnIcon, { color: theme.colors.textPrimary }]}>📥</Text>
                {shareStackCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{shareStackCount}</Text>
                  </View>
                )}
              </Pressable>
              {/* Collections button */}
              <Pressable
                onPress={() => { triggerHaptic(); setCollectionsOpen(true); }}
                style={[styles.headerBtn, { backgroundColor: theme.colors.surfaceOverlay }]}
              >
                <Text style={[styles.headerBtnIcon, { color: theme.colors.textPrimary }]}>📂</Text>
              </Pressable>
              {!searchMode && (
                <Pressable
                  onPress={handleOpenSearch}
                  style={[styles.headerBtn, { backgroundColor: theme.colors.surfaceOverlay }]}
                >
                  <Text style={[styles.headerBtnIcon, { color: theme.colors.textPrimary }]}>🔍</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleToggleViewMode}
                style={[styles.headerBtn, { backgroundColor: viewMode === "grid" ? theme.colors.accentMuted : theme.colors.surfaceOverlay }]}
              >
                <Text style={[styles.headerBtnIcon, { color: viewMode === "grid" ? "#FFFFFF" : theme.colors.textPrimary }]}>
                  {viewMode === "list" ? "⊞" : "☰"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleToggleDarkMode}
                style={[styles.headerBtn, { backgroundColor: theme.colors.surfaceOverlay }]}
              >
                <Text style={[styles.headerBtnIcon, { color: theme.colors.textPrimary }]}>{theme.dark ? "☀️" : "🌙"}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <UrlInputBar
          onIngested={refresh}
          onMagicDrop={handleMagicDrop}
          onMagicDropComplete={handleMagicDropComplete}
        />

        {/* ── Platform Prism filter ── */}
        <PlatformFilterBar
          activePlatforms={activePlatforms}
          onToggle={handlePlatformToggle}
          counts={platformCounts}
        />

        {/* ── Toggle bar ── */}
        <View style={[styles.toggleBar, { backgroundColor: theme.colors.surfaceElevated, borderBottomColor: theme.colors.border }]}>
          <Pressable
            onPress={handleToggleAutoplay}
            style={[
              styles.toggleBtn,
              { backgroundColor: autoplay ? theme.colors.accentMuted : theme.colors.surfaceOverlay },
            ]}
          >
            <Text style={[styles.toggleText, { color: autoplay ? "#FFFFFF" : theme.colors.textMuted }]}>
              {autoplay ? "▶ ON" : "▶ OFF"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleToggleAutoscroll}
            style={[
              styles.toggleBtn,
              { backgroundColor: autoscroll ? theme.colors.accentMuted : theme.colors.surfaceOverlay },
            ]}
          >
            <Text style={[styles.toggleText, { color: autoscroll ? "#FFFFFF" : theme.colors.textMuted }]}>
              {autoscroll ? "⏬ ON" : "⏬ OFF"}
            </Text>
          </Pressable>
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: theme.colors.errorBg, borderColor: theme.colors.errorBorder }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        )}

        {loading && items.length === 0 ? (
          <ScrollView contentContainerStyle={styles.listContent} scrollEnabled={false}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </ScrollView>
        ) : displayItems.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              {searchQuery || activePlatforms.size > 0 ? "No matches" : "No posts yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {searchQuery || activePlatforms.size > 0
                ? "Try a different search or filter"
                : "Paste a link above or share one from another app"}
            </Text>
          </View>
        ) : viewMode === "grid" ? (
          <ScrollView
            ref={gridScrollRef}
            contentContainerStyle={styles.gridContent}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleScrollEndDrag}
          >
            <View style={styles.gridWrap}>
              {displayItems.map((item, idx) => (
                <View key={item.id} style={styles.gridCell}>
                  <GridCard
                    item={item}
                    onPress={handleGridCardPress}
                    onDelete={removeItem}
                    isPlaying={!cinemaMode && gridPlayingId === item.id}
                    isPaused={!cinemaMode && gridPausedIds.has(item.id)}
                    onRestart={handleGridCardRestart}
                    onCinema={handleCinemaFromId}
                    onVideoEnded={handleGridVideoEnded}
                    onAddToCollection={handleAddToCollection}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onRefresh={refresh}
            refreshing={loading}
            onEndReached={fetchMore}
            onEndReachedThreshold={0.5}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleScrollEndDrag}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <SkeletonCard />
                </View>
              ) : null
            }
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
            scrollIndicatorInsets={{ right: 1 }}
          />
        )}
        {/* ── Magic Drop materializing card ── */}
        {magicDrop && (
          <View style={styles.magicDropWrap}>
            <MaterializingCard
              detected={magicDrop.detected}
              loading={magicDrop.loading}
              authorHandle={magicDrop.item?.content.author_handle}
              caption={magicDrop.item?.content.caption}
              mediaUrl={magicDrop.item?.content.media_url}
              onRevealed={() => setMagicDrop(null)}
            />
          </View>
        )}

        {/* ── Cinema mode overlay ── */}
        {cinemaMode && (
          <CinemaMode
            items={displayItems}
            initialIndex={cinemaIndex}
            onClose={handleCloseCinema}
          />
        )}

        {/* ── Collections overlay ── */}
        {collectionsOpen && (
          <CollectionsOverlay
            onClose={() => setCollectionsOpen(false)}
          />
        )}

        {/* ── Share Stack overlay ── */}
        {shareStackOpen && (
          <ShareStackOverlay
            onClose={() => {
              setShareStackOpen(false);
              refresh();
              refreshStackCount();
            }}
            onCollect={(stackItemId) => {
              // For now, accept to feed — future: open collection picker for stack items
              setShareStackOpen(false);
            }}
            onCountChange={undefined}
          />
        )}

        {/* ── Add to Collection sheet ── */}
        {addToCollectionItem && (
          <AddToCollectionSheet
            item={addToCollectionItem}
            onClose={() => setAddToCollectionItem(null)}
          />
        )}

        {/* ── Onboarding overlay ── */}
        {showOnboarding && (
          <OnboardingOverlay onComplete={handleOnboardingComplete} />
        )}
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoPress: {
    cursor: "pointer",
  },
  butterflyWrap: {
    marginHorizontal: 1,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerBtnIcon: {
    fontSize: 16,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  listContent: {
    paddingVertical: 8,
  },
  gridContent: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridCell: {
    width: "50%",
    padding: 4,
  },
  footerLoader: {
    paddingBottom: 8,
  },
  toggleBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  magicDropWrap: {
    position: "absolute",
    top: 120,
    left: 0,
    right: 0,
    zIndex: 50,
  },
});
