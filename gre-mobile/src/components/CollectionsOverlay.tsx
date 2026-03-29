import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { useTheme } from "../theme";
import { useCollections } from "../hooks/useCollections";
import { getCollectionItems, FeedItem, Collection } from "../services/api";
import { ButterflyIcon } from "./ButterflyIcon";
import { SourceBadge } from "./SourceBadge";
import { triggerHaptic } from "../utils/haptics";

interface CollectionsOverlayProps {
  onClose: () => void;
  onAddToCollection?: (item: FeedItem) => void;
}

type OverlayView = "list" | "detail" | "edit";

export function CollectionsOverlay({ onClose, onAddToCollection }: CollectionsOverlayProps) {
  const theme = useTheme();
  const { collections, loading, create, update, remove, removeItem, refresh } = useCollections();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [view, setView] = useState<OverlayView>("list");
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [detailItems, setDetailItems] = useState<FeedItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Creating new collection
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📁");

  // Editing collection
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleClose = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
  };

  const openDetail = useCallback(async (col: Collection) => {
    await triggerHaptic();
    setSelectedCollection(col);
    setView("detail");
    setDetailLoading(true);
    try {
      const data = await getCollectionItems(col.id);
      setDetailItems(data.items ?? []);
    } catch {
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openEdit = (col: Collection) => {
    triggerHaptic();
    setSelectedCollection(col);
    setEditName(col.name);
    setEditEmoji(col.emoji || "📁");
    setView("edit");
  };

  const handleSaveEdit = async () => {
    if (!selectedCollection || !editName.trim()) return;
    await update(selectedCollection.id, editName.trim(), editEmoji);
    setView("list");
    refresh();
  };

  const handleDelete = async (col: Collection) => {
    await triggerHaptic();
    await remove(col.id);
    if (view === "detail" || view === "edit") setView("list");
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await triggerHaptic();
    await create(newName.trim(), newEmoji);
    setNewName("");
    setCreating(false);
  };

  const handleRemoveFromCollection = async (feedItemId: string) => {
    if (!selectedCollection) return;
    await triggerHaptic();
    await removeItem(selectedCollection.id, feedItemId);
    setDetailItems((prev) => prev.filter((i) => i.id !== feedItemId));
  };

  // ── List View ──
  const renderListView = () => (
    <>
      <FlatList
        data={collections}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: col }) => (
          <Pressable
            onPress={() => openDetail(col)}
            onLongPress={() => openEdit(col)}
            style={[styles.collectionCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.borderAccent }]}
          >
            <Text style={styles.cardEmoji}>{col.emoji || "📁"}</Text>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: theme.colors.textPrimary }]}>{col.name}</Text>
              <Text style={[styles.cardCount, { color: theme.colors.textMuted }]}>
                {col.item_count} item{col.item_count !== 1 ? "s" : ""}
              </Text>
            </View>
            <Text style={[styles.chevron, { color: theme.colors.textMuted }]}>›</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No collections yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
              Create one to start organizing your feed
            </Text>
          </View>
        }
      />

      {/* Create new */}
      {creating ? (
        <View style={[styles.createRow, { borderColor: theme.colors.borderAccent }]}>
          <TextInput
            style={[styles.createInput, { color: theme.colors.textPrimary, borderColor: theme.colors.accent }]}
            placeholder="Collection name..."
            placeholderTextColor={theme.colors.textMuted}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <Pressable onPress={handleCreate} style={[styles.createBtn, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.createBtnText}>Create</Text>
          </Pressable>
          <Pressable onPress={() => setCreating(false)} style={styles.cancelBtn}>
            <Text style={[styles.cancelBtnText, { color: theme.colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => { triggerHaptic(); setCreating(true); }}
          style={[styles.newCollectionBtn, { backgroundColor: theme.colors.accent }]}
        >
          <Text style={styles.newCollectionBtnText}>+ New Collection</Text>
        </Pressable>
      )}
    </>
  );

  // ── Detail View ──
  const renderDetailView = () => (
    <>
      {/* Detail header */}
      <Pressable onPress={() => setView("list")} style={styles.backRow}>
        <Text style={[styles.backArrow, { color: theme.colors.accent }]}>‹</Text>
        <Text style={[styles.backText, { color: theme.colors.accent }]}>Collections</Text>
      </Pressable>

      <View style={styles.detailHeader}>
        <Text style={styles.detailEmoji}>{selectedCollection?.emoji || "📁"}</Text>
        <Text style={[styles.detailName, { color: theme.colors.textPrimary }]}>
          {selectedCollection?.name}
        </Text>
        <Pressable onPress={() => openEdit(selectedCollection!)} style={styles.editBtn}>
          <Text style={[styles.editBtnText, { color: theme.colors.accent }]}>Edit</Text>
        </Pressable>
      </View>

      <FlatList
        data={detailItems}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.detailCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.borderAccent }]}>
            <SourceBadge platform={item.source.platform} badgeColor={item.source.badge_color} />
            <View style={styles.detailCardInfo}>
              {item.content.author_handle && (
                <Text style={[styles.detailAuthor, { color: theme.colors.textPrimary }]}>
                  @{item.content.author_handle}
                </Text>
              )}
              <Text style={[styles.detailCaption, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {item.content.caption || item.source.origin_url}
              </Text>
            </View>
            <Pressable onPress={() => handleRemoveFromCollection(item.id)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>✕</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Empty collection</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
              Add items from your feed using the + button
            </Text>
          </View>
        }
      />
    </>
  );

  // ── Edit View ──
  const renderEditView = () => (
    <View style={styles.editForm}>
      <Pressable onPress={() => setView(selectedCollection ? "detail" : "list")} style={styles.backRow}>
        <Text style={[styles.backArrow, { color: theme.colors.accent }]}>‹</Text>
        <Text style={[styles.backText, { color: theme.colors.accent }]}>Back</Text>
      </Pressable>

      <Text style={[styles.editTitle, { color: theme.colors.textPrimary }]}>Edit Collection</Text>

      <TextInput
        style={[styles.editInput, { color: theme.colors.textPrimary, borderColor: theme.colors.borderAccent }]}
        value={editName}
        onChangeText={setEditName}
        placeholder="Collection name"
        placeholderTextColor={theme.colors.textMuted}
      />

      <Pressable onPress={handleSaveEdit} style={[styles.saveBtn, { backgroundColor: theme.colors.accent }]}>
        <Text style={styles.saveBtnText}>Save Changes</Text>
      </Pressable>

      <Pressable
        onPress={() => selectedCollection && handleDelete(selectedCollection)}
        style={[styles.deleteCollBtn, { borderColor: "#EF4444" }]}
      >
        <Text style={styles.deleteCollBtnText}>Delete Collection</Text>
      </Pressable>
    </View>
  );

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={[styles.panel, { backgroundColor: theme.colors.base }]}>
        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: theme.colors.borderAccent }]}>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <ButterflyIcon size={22} />
          </Pressable>
          <Text style={[styles.topTitle, { color: theme.colors.textPrimary }]}>Collections</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Content */}
        {view === "list" && renderListView()}
        {view === "detail" && renderDetailView()}
        {view === "edit" && renderEditView()}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 150,
  },
  panel: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  topTitle: {
    fontSize: 20, fontWeight: "800",
  },
  listContent: {
    padding: 16,
  },
  collectionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  cardEmoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700" },
  cardCount: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 24, fontWeight: "300" },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { fontSize: 14 },
  createRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
  },
  createBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  cancelBtnText: { fontSize: 16, fontWeight: "700" },
  newCollectionBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  newCollectionBtnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  backArrow: { fontSize: 28, fontWeight: "300" },
  backText: { fontSize: 15, fontWeight: "600" },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  detailEmoji: { fontSize: 32 },
  detailName: { flex: 1, fontSize: 22, fontWeight: "800" },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { fontWeight: "700", fontSize: 14 },
  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  detailCardInfo: { flex: 1 },
  detailAuthor: { fontSize: 13, fontWeight: "700" },
  detailCaption: { fontSize: 12, marginTop: 2 },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  removeBtnText: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  editForm: {
    padding: 16,
  },
  editTitle: { fontSize: 22, fontWeight: "800", marginVertical: 16 },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  saveBtnText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  deleteCollBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
  },
  deleteCollBtnText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
});
