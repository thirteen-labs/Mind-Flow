import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJournalStats } from '@/hooks/use-journal';
import { JournalService, type JournalEntry } from '@/services/journal-service';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { stats, loading, error, retry } = useJournalStats();
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    JournalService.getRecentJournals(db, 5).then((entries) => {
      setRecentEntries(entries.filter((e) => e.content.trim()));
    }).catch(() => {});
  }, [db]);

  const renderEntry = useCallback(({ item }: { item: JournalEntry }) => {
    const date = new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    return (
      <Pressable
        onPress={() => router.push(`/reading?date=${item.date}`)}
        style={[styles.entryRow, { borderBottomColor: theme.border }]}
      >
        <View style={styles.entryInfo}>
          <ThemedText type="default" numberOfLines={1}>{date}</ThemedText>
          <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
            {item.content.slice(0, 80)}{item.content.length > 80 ? '...' : ''}
          </ThemedText>
        </View>
        <View style={styles.entryMeta}>
          <ThemedText type="small" themeColor="textSecondary">{item.word_count}w</ThemedText>
          <SymbolView name="chevron.right" size={12} tintColor={theme.textMuted} />
        </View>
      </Pressable>
    );
  }, [theme]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">{getGreeting()}</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">{todayDate()}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <Pressable
          style={[styles.quickAction, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/(tabs)/writer')}
        >
          <SymbolView name="square.and.pencil" size={24} tintColor="#FFFFFF" />
          <ThemedText style={styles.quickActionText}>Start Writing</ThemedText>
        </Pressable>

        {loading ? (
          <ThemedView style={styles.statsRow}>
            {[1, 2, 3].map((i) => (
              <ThemedView key={i} type="backgroundElement" style={styles.statCard}>
                <ActivityIndicator size="small" color={theme.textMuted} />
              </ThemedView>
            ))}
          </ThemedView>
        ) : error ? (
          <ThemedView style={styles.errorCard}>
            <ThemedText type="small" themeColor="error">Could not load stats</ThemedText>
            <Pressable onPress={retry}>
              <ThemedText type="small" themeColor="tint">Tap to retry</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <ThemedView style={styles.statsRow}>
            <ThemedView type="backgroundElement" style={styles.statCard}>
              <SymbolView name="doc.text" size={20} tintColor={theme.text} />
              <ThemedText type="title">{stats?.entries ?? 0}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Entries</ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.statCard}>
              <SymbolView name="flame" size={20} tintColor={theme.text} />
              <ThemedText type="title">{stats?.streak ?? 0}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Day Streak</ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.statCard}>
              <SymbolView name="character.book.closed" size={20} tintColor={theme.text} />
              <ThemedText type="title">{stats?.totalWords ?? 0}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Words</ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        {recentEntries.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="default" themeColor="textSecondary" style={styles.sectionTitle}>
              Recent Entries
            </ThemedText>
            <ThemedView type="backgroundElement" style={[styles.entriesCard, { borderColor: theme.border }]}>
              <FlatList
                data={recentEntries}
                renderItem={renderEntry}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </ThemedView>
          </ThemedView>
        )}

        <Pressable
          onPress={() => router.push('/insights')}
          style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <SymbolView name="chart.bar.fill" size={18} tintColor={theme.text} />
          <ThemedText type="default">View Insights</ThemedText>
          <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/export')}
          style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <SymbolView name="square.and.arrow.up" size={18} tintColor={theme.text} />
          <ThemedText type="default">Export Journals</ThemedText>
          <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <SymbolView name="gearshape.fill" size={18} tintColor={theme.text} />
          <ThemedText type="default">Settings</ThemedText>
          <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  content: {
    gap: Spacing.four,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.three,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  errorCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entriesCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginLeft: Spacing.two,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});
