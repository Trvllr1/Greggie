import React from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/theme';
import { DEMO_CHANNELS } from '../../src/demoData';

export default function FollowingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </Pressable>
        <Text style={s.title}>Following</Text>
        <View style={{ width: 60 }} />
      </View>
      <FlatList
        data={DEMO_CHANNELS}
        keyExtractor={(c) => c.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.avatar}>
              <Text style={{ fontSize: 20 }}>📺</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.title}</Text>
              <Text style={s.category}>{item.category}</Text>
            </View>
            <View style={[s.statusDot, item.status === 'LIVE' && s.liveDot]} />
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  back: { color: 'rgba(255,255,255,0.6)', fontSize: FONT.md },
  title: { color: '#FFFFFF', fontSize: FONT.lg, fontWeight: '700' },
  list: { padding: SPACING.md, gap: SPACING.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: '#FFFFFF', fontSize: FONT.md, fontWeight: '600' },
  category: { color: 'rgba(255,255,255,0.4)', fontSize: FONT.xs, marginTop: 2 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  liveDot: { backgroundColor: '#EF4444' },
});
