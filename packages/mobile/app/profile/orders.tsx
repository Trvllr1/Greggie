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

const ORDERS = [
  { id: 'o1', product: 'Tech Gadget Pro', price: 49.99, status: 'Shipped', date: '1h ago' },
  { id: 'o2', product: 'Artisan Candle Set', price: 24.99, status: 'Delivered', date: 'Yesterday' },
  { id: 'o3', product: 'Vintage Vinyl', price: 35.0, status: 'Processing', date: '3 days ago' },
];

const statusColor: Record<string, string> = {
  Shipped: '#818CF8',
  Delivered: '#34D399',
  Processing: '#FBBF24',
};

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </Pressable>
        <Text style={s.title}>Orders</Text>
        <View style={{ width: 60 }} />
      </View>
      <FlatList
        data={ORDERS}
        keyExtractor={(o) => o.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.product}>{item.product}</Text>
              <Text style={s.date}>{item.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.price}>${item.price.toFixed(2)}</Text>
              <View style={[s.badge, { backgroundColor: (statusColor[item.status] ?? '#818CF8') + '20' }]}>
                <Text style={[s.badgeText, { color: statusColor[item.status] ?? '#818CF8' }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text style={s.emptyText}>No orders yet</Text>
          </View>
        }
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
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  product: { color: '#FFFFFF', fontSize: FONT.md, fontWeight: '600' },
  date: { color: 'rgba(255,255,255,0.4)', fontSize: FONT.xs, marginTop: 4 },
  price: { color: '#FFFFFF', fontSize: FONT.md, fontWeight: '700' },
  badge: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginTop: 4 },
  badgeText: { fontSize: FONT.xs, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: FONT.md },
});
