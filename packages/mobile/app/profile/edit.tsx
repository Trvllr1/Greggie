import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </Pressable>
        <Text style={s.title}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={s.content}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>👤</Text>
        <Text style={s.placeholder}>Profile editing coming soon</Text>
      </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  placeholder: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: FONT.md,
  },
});
