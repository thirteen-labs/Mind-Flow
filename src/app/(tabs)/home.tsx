import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { IconBulb, IconChartBar, IconChevronRight, IconFileText, IconFlame, IconBook2, IconPencil, IconSettings2, IconShare, IconUser, IconCalendarEvent, IconBrain } from '@tabler/icons-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatCard } from '@/components/stat-card';
import { Spacing, contrastText, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJournalStats } from '@/hooks/use-journal';
import { JournalService, type JournalEntry } from '@/services/journal-service';
import { openJournal, type WriterMode } from '@/services/journal-nav';

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
        const [entries, todayEntries] = await Promise.all([
          JournalService.getRecentJournals(db, 5),
          JournalService.getTodayEntries(db),
        ]);
        if (!mountedRef.current) return;
        setRecentEntries(entries.filter((e) => e.content.trim()));
        setTodayEntry(todayEntries.find((e) => e.content.trim()) ?? todayEntries[0] ?? null);
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
          const [entries, todayEntries] = await Promise.all([
            JournalService.getRecentJournals(db, 5),
            JournalService.getTodayEntries(db),
          ]);
          if (!mountedRef.current) return;
          setRecentEntries(entries.filter((e) => e.content.trim()));
          setTodayEntry(todayEntries.find((e) => e.content.trim()) ?? todayEntries[0] ?? null);
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
    const moodEmoji = item.mood ? MOOD_EMOJIS[item.mood] : null;
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/reading?id=${item.id}`);
          }}
          style={({ pressed }) => [
            styles.entryCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={styles.entryCardHeader}>
            <View style={[styles.entryAvatar, { backgroundColor: theme.primary }]}>
              <ThemedText style={[styles.entryAvatarText, { color: contrastText(theme.primary) }]}>
                {(item.title || 'N').charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.entryCardMeta}>
              <ThemedText type="default" numberOfLines={1} style={styles.entryCardTitle}>
                {item.title || 'Daily Note'}
              </ThemedText>
              <View style={styles.entryCardSub}>
                <ThemedText type="small" themeColor="textMuted">{date}</ThemedText>
                <View style={[styles.entryDot, { backgroundColor: theme.border }]} />
                <ThemedText type="small" themeColor="textMuted">{item.word_count} words</ThemedText>
              </View>
            </View>
            {moodEmoji ? (
              <ThemedText style={styles.entryMood}>{moodEmoji}</ThemedText>
            ) : null}
          </View>

          <ThemedText type="default" themeColor="textSecondary" numberOfLines={3} style={styles.entryCardBody}>
            {item.content.trim() || 'No content yet'}
          </ThemedText>

          <View style={[styles.entryCardFooter, { borderTopColor: theme.border }]}>
            <ThemedText type="small" themeColor="tint">Read note</ThemedText>
            <IconChevronRight size={14} color={theme.tint} />
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
                <ThemedText style={styles.greetingTitle}>{getGreeting()} {getTimeEmoji()}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">How are you feeling today?</ThemedText>
              </View>
              <Pressable 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/settings');
                }}
                style={[styles.profileButton, { backgroundColor: theme.surface }]}
              >
                <IconUser size={20} color={theme.text} />
              </Pressable>
            </ThemedView>
          </ThemedView>
        </Animated.View>

        {/* Daily Note Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              openJournal({ type: 'note' });
            }}
            style={[styles.dailyNoteCard, { backgroundColor: theme.primary }]}
          >
            <View style={styles.dailyNoteContent}>
              <ThemedText style={[styles.dailyNoteTitle, { color: contrastText(theme.primary) }]}>📝 Daily Note</ThemedText>
              <ThemedText style={[styles.dailyNotePreview, { color: contrastText(theme.primary) }]}>
                {todayEntry?.content 
                  ? todayEntry.content.slice(0, 60) + (todayEntry.content.length > 60 ? '...' : '')
                  : 'Start writing your daily note...'}
              </ThemedText>
            </View>
            <IconChevronRight size={20} color={contrastText(theme.primary)} />
          </Pressable>
        </Animated.View>

        {/* Quick Actions Grid */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <ThemedView style={styles.section}>
            <ThemedText type="default" themeColor="textSecondary" style={styles.sectionTitle}>
              Quick Actions
            </ThemedText>
            <View style={styles.quickActionsGrid}>
              {([
                { type: 'note', label: 'New Note', icon: IconPencil, color: theme.tint },
                { type: 'idea', label: 'New Idea', icon: IconBulb, color: theme.warning },
                { type: 'plan', label: 'New Plan', icon: IconCalendarEvent, color: theme.success },
                { type: 'thought', label: 'New Thought', icon: IconBrain, color: theme.secondary },
                { type: 'template', label: 'Template', icon: IconFileText, color: theme.secondary },
              ] as { type: WriterMode; label: string; icon: typeof IconPencil; color: string }[]).map(
                (action) => (
                  <Pressable
                    key={action.type}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (action.type === 'template') {
                        router.push('/templates' as any);
                      } else {
                        openJournal({ type: action.type });
                      }
                    }}
                    style={({ pressed }) => [
                      styles.quickActionCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(action.color, 0.14) }]}>
                      <action.icon size={20} color={action.color} strokeWidth={2} />
                    </View>
                    <ThemedText type="small" style={styles.quickActionLabel}>{action.label}</ThemedText>
                  </Pressable>
                )
              )}
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
                  <ThemedView key={i} type="backgroundElement" style={styles.statLoading}>
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
                <StatCard icon={<IconFileText size={20} />} value={stats?.entries ?? 0} label="Entries" style={styles.statCard} />

                <StatCard icon={<IconFlame size={20} />} color={theme.notification} value={stats?.streak ?? 0} label="Day Streak" style={styles.statCard} />

                <StatCard icon={<IconBook2 size={20} />} color={theme.accent} value={stats?.totalWords ?? 0} label="Words" style={styles.statCard} />
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
                  router.push('/search');
                }}>
                  <ThemedText type="small" themeColor="tint">View all</ThemedText>
                </Pressable>
              </ThemedView>
              <View style={styles.entriesList}>
                {recentEntries.map((item, index) => (
                  <View key={item.id}>{renderEntry({ item, index })}</View>
                ))}
              </View>
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
              <IconChartBar size={18} color={theme.text} />
              <ThemedText type="default">View Insights</ThemedText>
              <IconChevronRight size={14} color={theme.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/export');
              }}
              style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <IconShare size={18} color={theme.text} />
              <ThemedText type="default">Export Journals</ThemedText>
              <IconChevronRight size={14} color={theme.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings');
              }}
              style={[styles.linkRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <IconSettings2 size={18} color={theme.text} />
              <ThemedText type="default">Settings</ThemedText>
              <IconChevronRight size={14} color={theme.textMuted} />
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
    paddingTop: 6,
  },
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 30,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 18,
    fontWeight: '600',
  },
  dailyNotePreview: {
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
    fontSize: 13,
    fontWeight: 700,
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
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Spacing.two,
  },
  statCard: {
    width: '31%',
  },
  statLoading: {
    width: '31%',
    alignItems: 'center',
    padding: Spacing.two,
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
  entriesList: {
    gap: Spacing.three,
  },
  entryCard: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    borderCurve: 'continuous',
  },
  entryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  entryAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  entryAvatarText: {
    fontSize: 18,
    fontWeight: 700,
  },
  entryCardMeta: {
    flex: 1,
    gap: 2,
  },
  entryCardTitle: {
    fontWeight: '600',
  },
  entryCardSub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  entryDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  entryMood: {
    fontSize: 22,
  },
  entryCardBody: {
    lineHeight: 22,
  },
  entryCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
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
