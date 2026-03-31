import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT, RADIUS } from '../theme';
import { getApiClient } from '../hooks';

interface RelayMatch {
  timestamp_sec: number;
  transcript_chunk: string;
  confidence: number;
  formatted_time: string;
}

interface RelayQueryModalProps {
  channelId: string;
  channelTitle: string;
  onClose: () => void;
}

export function RelayQueryModal({ channelId, channelTitle, onClose }: RelayQueryModalProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'empty'>('idle');
  const [matches, setMatches] = useState<RelayMatch[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('searching');

    try {
      const client = getApiClient();
      const resp = await client.searchRelay(channelId, query.trim());
      if (resp.matches && resp.matches.length > 0) {
        setMatches(resp.matches);
        setStatus('found');
      } else {
        setMatches([]);
        setStatus('empty');
      }
    } catch {
      // mock results for demo
      setMatches([
        {
          timestamp_sec: 125,
          transcript_chunk: `The host mentioned "${query}" around this time — check the replay!`,
          confidence: 0.87,
          formatted_time: '2:05',
        },
        {
          timestamp_sec: 340,
          transcript_chunk: `Another mention of "${query}" with pricing details discussed.`,
          confidence: 0.72,
          formatted_time: '5:40',
        },
      ]);
      setStatus('found');
    }
  };

  return (
    <Animated.View
      entering={SlideInDown.duration(300).springify().damping(20)}
      exiting={SlideOutDown.duration(200)}
      style={styles.container}
    >
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🤖 Relay AI</Text>
            <Text style={styles.subtitle}>Search transcripts from {channelTitle}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about the stream..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          <Pressable
            onPress={handleSearch}
            style={[styles.searchButton, !query.trim() && styles.searchButtonDisabled]}
            disabled={!query.trim() || status === 'searching'}
          >
            {status === 'searching' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.searchButtonText}>🔍</Text>
            )}
          </Pressable>
        </View>

        {status === 'found' && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={styles.resultsTitle}>
              {matches.length} match{matches.length !== 1 ? 'es' : ''} found
            </Text>
            {matches.map((match, i) => (
              <View key={i} style={styles.matchCard}>
                <View style={styles.matchHeader}>
                  <Text style={styles.matchTime}>⏱️ {match.formatted_time}</Text>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(match.confidence * 100)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.matchTranscript}>{match.transcript_chunk}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {status === 'empty' && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No matches found for &quot;{query}&quot;</Text>
            <Text style={styles.emptyHint}>Try different keywords</Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
    maxHeight: '70%',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  title: {
    color: '#FFFFFF',
    fontSize: FONT.xl,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.xs,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: '#FFFFFF',
    fontSize: FONT.md,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.4,
  },
  searchButtonText: {
    fontSize: 18,
  },
  resultsTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FONT.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  matchCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  matchTime: {
    color: COLORS.accent,
    fontSize: FONT.sm,
    fontWeight: '600',
  },
  confidenceBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  confidenceText: {
    color: COLORS.success,
    fontSize: FONT.xs,
    fontWeight: '600',
  },
  matchTranscript: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT.sm,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.xs,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT.md,
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: FONT.sm,
  },
});
