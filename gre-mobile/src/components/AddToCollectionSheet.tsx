import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useTheme } from "../theme";
import { useCollections } from "../hooks/useCollections";
import { triggerHaptic } from "../utils/haptics";
import { FeedItem } from "../services/api";

interface AddToCollectionSheetProps {
  item: FeedItem;
  onClose: () => void;
}

export function AddToCollectionSheet({ item, onClose }: AddToCollectionSheetProps) {
  const theme = useTheme();
  const { collections, create, addItem, removeItem, refresh } = useCollections();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📁");
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());

  // Slide up on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleToggle = async (collectionId: string) => {
    await triggerHaptic();
    if (memberOf.has(collectionId)) {
      await removeItem(collectionId, item.id);
      setMemberOf((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    } else {
      await addItem(collectionId, item.id);
      setMemberOf((prev) => new Set(prev).add(collectionId));
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await triggerHaptic();
    const col = await create(newName.trim(), newEmoji);
    if (col) {
      await addItem(col.id, item.id);
      setMemberOf((prev) => new Set(prev).add(col.id));
      setNewName("");
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={styles.backdropPress} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderAccent,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={[styles.handleBar, { backgroundColor: theme.colors.textMuted }]} />

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Add to Collection
        </Text>

        {/* Item preview */}
        <View style={[styles.itemPreview, { backgroundColor: theme.colors.surfaceElevated }]}>
          <Text style={[styles.itemCaption, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.content.caption || item.source.origin_url}
          </Text>
        </View>

        {/* Collection list */}
        <FlatList
          data={collections}
          keyExtractor={(c) => c.id}
          style={styles.list}
          renderItem={({ item: col }) => {
            const isMember = memberOf.has(col.id);
            return (
              <Pressable
                onPress={() => handleToggle(col.id)}
                style={[
                  styles.collectionRow,
                  {
                    backgroundColor: isMember
                      ? theme.colors.accentGlow
                      : theme.colors.surfaceElevated,
                    borderColor: isMember
                      ? theme.colors.accent
                      : theme.colors.borderAccent,
                  },
                ]}
              >
                <Text style={styles.collectionEmoji}>{col.emoji || "📁"}</Text>
                <Text style={[styles.collectionName, { color: theme.colors.textPrimary }]}>
                  {col.name}
                </Text>
                <Text style={[styles.collectionCount, { color: theme.colors.textMuted }]}>
                  {col.item_count}
                </Text>
                <Text style={styles.checkmark}>{isMember ? "✓" : ""}</Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
              No collections yet
            </Text>
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
          </View>
        ) : (
          <Pressable
            onPress={() => { triggerHaptic(); setCreating(true); }}
            style={[styles.newBtn, { borderColor: theme.colors.accent }]}
          >
            <Text style={[styles.newBtnText, { color: theme.colors.accent }]}>+ New Collection</Text>
          </Pressable>
        )}

        {/* Done */}
        <Pressable onPress={handleClose} style={[styles.doneBtn, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 160,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "70%",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  itemPreview: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  itemCaption: {
    fontSize: 13,
  },
  list: {
    maxHeight: 240,
    marginBottom: 12,
  },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  collectionEmoji: {
    fontSize: 20,
  },
  collectionName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  collectionCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 16,
    fontWeight: "800",
    color: "#34D399",
    width: 20,
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
  },
  createRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
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
  createBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  newBtn: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  newBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
});
