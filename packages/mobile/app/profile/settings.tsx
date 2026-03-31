import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, FONT, RADIUS } from '../../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem('greggie_onboarding_done');
  };

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </Pressable>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Preferences</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>🔔 Notifications</Text>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: COLORS.accent }} />
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>📳 Haptic Feedback</Text>
            <Switch value={haptics} onValueChange={setHaptics} trackColor={{ true: COLORS.accent }} />
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>🌙 Dark Mode</Text>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: COLORS.accent }} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <Pressable style={s.row} onPress={handleResetOnboarding}>
            <Text style={s.rowLabel}>🔄 Reset Onboarding</Text>
            <Text style={s.rowArrow}>›</Text>
          </Pressable>
          <Pressable style={s.row}>
            <Text style={s.rowLabel}>🔒 Privacy Policy</Text>
            <Text style={s.rowArrow}>›</Text>
          </Pressable>
          <Pressable style={s.row}>
            <Text style={s.rowLabel}>📄 Terms of Service</Text>
            <Text style={s.rowArrow}>›</Text>
          </Pressable>
        </View>

        <Text style={s.version}>Greggie v1.0.0</Text>
      </ScrollView>
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
  content: { padding: SPACING.md, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  section: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.xs,
    fontWeight: '600',
    padding: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowLabel: { color: '#FFFFFF', fontSize: FONT.md },
  rowArrow: { color: 'rgba(255,255,255,0.3)', fontSize: FONT.xl },
  version: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: FONT.xs,
    textAlign: 'center',
  },
});
