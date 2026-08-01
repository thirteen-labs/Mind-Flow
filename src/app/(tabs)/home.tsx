import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJournalStats } from '@/hooks/use-journal';
import { JournalService, type JournalEntry } from '@/services/journal-service';

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', calm: '😌', grateful: '🥰', thoughtful: '🤔',
  sad: '😢', frustrated: '😤', anxious: '😰', excited: '🤩',
  tired: '🥱', sick: '🤒',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getUserName(): string {
  return 'Chris';
}

function getTimeEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 17) return '🌤️';
  return '🌙';
}

export default function HomeScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { stats, loading, error, retry } = useJournalStats();
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [entries, today] = await Promise.all([
          JournalService.getRecentJournals(db, 5),
          JournalService.getTodayJournal(db),
        ]);
        if (!mountedRef.current) return;
        setRecentEntries(entries.filter((e) => e.content.trim()));
        setTodayEntry(today);
      } catch {
        // silently fail
      }
    })();
  }, [db]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      (async () => {
        try {
          const [entries, today] = await Promise.all([
            JournalService.getRecentJournals(db, 5),
            JournalService.getTodayJournal(db),
          ]);
          if (!mountedRef.current) return;
          setRecentEntries(entries.filter((e) => e.content.trim()));
          setTodayEntry(today);
        } catch { /* silently fail */ }
      })(),
      retry(),
    ]);
    if (mountedRef.current) setRefreshing(false);
  }, [db, retry]);

  const renderEntry = useCallback(({ item, index }: { item: JournalEntry; index: number }) => {
    const date = new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/reading?date=${item.date}`);
          }}
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
      </Animated.View>
    );
  }, [theme]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textMuted} />
      }
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.container}>
        {/* Greeting Header */}
        <Animated.View entering={FadeInDown.springify()}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.greetingRow}>
              <View>
                <ThemedText type="title">{getGreeting()}, {getUserName()} {getTimeEmoji()}</ThemedText>
                <ThemedText type="default" themeColor="textSecondary">How are you feeling today?</ThemedText>
              </View>
              <Pressable 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/settings');
                }}
                style={[styles.profileButton, { backgroundColor: theme.surface }]}
              >
                <SymbolView name="person.fill" size={20} tintColor={theme.text} />
              </Pressable>
            </ThemedView>
          </ThemedView>
        </Animated.View>

        {/* Daily Note Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/reading?date=${new Date().toISOString().split('T')[0]}`);
            }}
            style={[styles.dailyNoteCard, { backgroundColor: theme.primary }]}
          >
            <View style={styles.dailyNoteContent}>
              <ThemedText style={styles.dailyNoteTitle}>📝 Daily Note</ThemedText>
              <ThemedText style={styles.dailyNotePreview}>
                {todayEntry?.content 
                  ? todayEntry.content.slice(0, 60) + (todayEntry.content.length > 60 ? '...' : '')
                  : 'Start writing your daily note...'}
              </ThemedText>
            </View>
            <SymbolView name="chevron.right" size={20} tintColor="#FFFFFF" />
          </Pressable>
        </Animated.View>

        {/* Quick Actions Grid */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <ThemedView style={styles.section}>
            <ThemedText type="default" themeColor="textSecondary" style={styles.sectionTitle}>
              Quick Actions
            </ThemedText>
            <View style={styles.quickActionsGrid}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/writer');
                }}
                style={[styles.quickActionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <SymbolView name="square.and.pencil" size={24} tintColor={theme.tint} />
                <ThemedText type="default" style={styles.quickActionLabel}>New Note</ThemedText>
              </Pressable>
              
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/writer');
                }}
                style={[styles.quickActionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <SymbolView name="lightbulb" size={24} tintColor={theme.tint} />
                <ThemedText type="default" style={styles.quickActionLabel}>New Idea</ThemedText>
              </Pressable>
              
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/planner');
                }}
                style={[styles.quickActionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <SymbolView name="calendar" size={24} tintColor={theme.tint} />
                <ThemedText type="default" style={styles.quickActionLabel}>New Plan</ThemedText>
              </Pressable>
              
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/writer');
                }}
                style={[styles.quickActionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <SymbolView name="doc.text" size={24} tintColor={theme.tint} />
                <ThemedText type="default" style={styles.quickActionLabel}>Template</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </Animated.View>

        {/* Stats Section */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <ThemedView style={styles.section}>
            <ThemedText type="default" themeColor="textSecondary" style={styles.sectionTitle}>
              Your Progress
            </ThemedText>
            {loading ? (
              <ThemedView style={styles.statsRow}>
                {[1, 2, 3].map((i) => (
                  <ThemedView key={i} type="backgroundElement" style={styles.statCard}>
                    <ThemedText type="small" themeColor="textMuted">Loading...</ThemedText>
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
          </ThemedView>
        </Animated.View>

        {/* Today's Mood */}
        {todayEntry?.mood && (
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <ThemedView type="backgroundElement" style={[styles.moodRow, { borderColor: theme.border }]}>
              <ThemedText type="default">Today&apos;s mood: {MOOD_EMOJIS[todayEntry.mood] ?? ''} {todayEntry.mood}</ThemedText>
            </ThemedView>
          </Animated.View>
        )}

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <ThemedView style={styles.section}>
              <ThemedView style={styles.sectionHeader}>
                <ThemedText type="default" themeColor="textSecondary" style={styles.sectionTitle}>
                  Recent
                </ThemedText>
                <Pressable onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/search');
                }}>
                  <ThemedText type="small" themeColor="tint">View all</ThemedText>
                </Pressable>
              </ThemedView>
              <ThemedView type="backgroundElement" style={[styles.entriesCard, { borderColor: theme.border }]}>
                <FlatList
                  data={recentEntries}
                  renderItem={renderEntry}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </ThemedView>
            </ThemedView>
          </Animated.View>
        )}

        {/* Quick Links */}
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <ThemedView style={styles.linksSection}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/insights');
              }}
              style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <SymbolView name="chart.bar.fill" size={18} tintColor={theme.text} />
              <ThemedText type="default">View Insights</ThemedText>
              <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/export');
              }}
              style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <SymbolView name="square.and.arrow.up" size={18} tintColor={theme.text} />
              <ThemedText type="default">Export Journals</ThemedText>
              <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/settings');
              }}
              style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <SymbolView name="gearshape.fill" size={18} tintColor={theme.text} />
              <ThemedText type="default">Settings</ThemedText>
              <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
            </Pressable>
          </ThemedView>
        </Animated.View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderCurve: 'continuous',
  },
  dailyNoteContent: {
    flex: 1,
    gap: Spacing.one,
  },
  dailyNoteTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dailyNotePreview: {
    color: '#FFFFFF',
    opacity: 0.9,
    fontSize: 14,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  quickActionCard: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  quickActionLabel: {
    fontWeight: '500',
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
    borderCurve: 'continuous',
  },
  errorCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  entriesCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
    borderCurve: 'continuous',
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
  linksSection: {
    gap: Spacing.two,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
});
