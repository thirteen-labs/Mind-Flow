import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { IconChevronLeft, IconFile, IconPencil, IconFileText, IconClock, IconBook, IconPlus } from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatCard } from '@/components/stat-card';
import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService, type JournalEntry } from '@/services/journal-service';
import { TagService, type Tag } from '@/services/tag-service';
import { openJournal } from '@/services/journal-nav';

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', calm: '😌', grateful: '🥰', thoughtful: '🤔',
  sad: '😢', frustrated: '😤', anxious: '😰', excited: '🤩',
  tired: '🥱', sick: '🤒',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function estimateReadingTime(words: number): string {
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

export default function CalendarDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tagsByEntry, setTagsByEntry] = useState<Record<string, Tag[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;
    let mounted = true;
    (async () => {
      try {
        const result = await JournalService.getJournalsByDate(db, date);
        if (!mounted) return;
        setEntries(result);
        const tags: Record<string, Tag[]> = {};
        await Promise.all(result.map(async (entry) => {
          try {
            tags[entry.id] = await TagService.getJournalTags(db, entry.id);
          } catch {
            tags[entry.id] = [];
          }
        }));
        if (mounted) setTagsByEntry(tags);
      } catch {
        if (mounted) setEntries([]);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [db, date]);

  const totalWords = entries.reduce((sum, e) => sum + e.word_count, 0);
  const displayDate = date ? formatDate(date) : '';
  const isToday = date === new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.textMuted} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerAction}>
          <IconChevronLeft size={20} color={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.dateTitle}>{displayDate}</ThemedText>
          {isToday && (
            <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
              <ThemedText type="small" style={{ color: '#FFFFFF', fontWeight: '600' }}>Today</ThemedText>
            </View>
          )}
        </View>

        {entries.length > 0 && (
          <View style={styles.statsRow}>
            <StatCard icon={<IconFileText size={20} />} value={totalWords} label="words" style={styles.statCard} />
            <StatCard icon={<IconClock size={20} />} color={theme.accent} value={estimateReadingTime(totalWords)} label="read" style={styles.statCard} />
          </View>
        )}

        {entries.length === 0 ? (
          <ThemedView style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <IconFile size={40} color={theme.textMuted} />
            <ThemedText type="default" themeColor="textMuted" style={{ textAlign: 'center' }}>
              No journal entries for this day
            </ThemedText>
            <Pressable
              onPress={() => openJournal({ date: date as string, type: 'note' })}
              style={[styles.createBtn, { backgroundColor: theme.primary }]}
            >
              <IconPencil size={16} color="#FFFFFF" />
              <ThemedText type="default" style={{ color: '#FFFFFF', fontWeight: '600' }}>Write Entry</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <>
            {entries.map((entry) => {
              const entryTags = tagsByEntry[entry.id] ?? [];
              return (
                <ThemedView key={entry.id} style={[styles.entryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.entryHeader}>
                    <View style={styles.entryTitleWrap}>
                      <ThemedText type="default" numberOfLines={1} style={styles.entryTitle}>
                        {entry.title || formatTime(entry.date)}
                      </ThemedText>
                      {entry.entry_type === 'idea' && (
                        <View style={[styles.typeChip, { backgroundColor: withAlpha(theme.warning, 0.14) }]}>
                          <ThemedText type="small" style={[styles.typeChipText, { color: theme.warning }]}>Idea</ThemedText>
                        </View>
                      )}
                    </View>
                    {entry.mood && (
                      <ThemedText type="default">{MOOD_EMOJIS[entry.mood] ?? ''} {entry.mood}</ThemedText>
                    )}
                  </View>

                  {entryTags.length > 0 && (
                    <View style={styles.tagRow}>
                      {entryTags.map((tag) => (
                        <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color }]}>
                          <ThemedText type="small" style={{ color: '#FFFFFF' }}>{tag.name}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  <ThemedText type="default" numberOfLines={3} style={styles.preview}>
                    {entry.content.trim() || 'Empty entry'}
                  </ThemedText>

                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => router.push(`/reading?id=${entry.id}` as any)}
                      style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                    >
                      <IconBook size={18} color="#FFFFFF" />
                      <ThemedText type="default" style={{ color: '#FFFFFF', fontWeight: '600' }}>Read</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => openJournal({ entryId: entry.id })}
                      style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.primary, borderWidth: 1 }]}
                    >
                      <IconPencil size={18} color={theme.primary} />
                      <ThemedText type="default" style={{ color: theme.primary, fontWeight: '600' }}>Edit</ThemedText>
                    </Pressable>
                  </View>
                </ThemedView>
              );
            })}

            <Pressable
              onPress={() => openJournal({ date: date as string, type: 'note' })}
              style={[styles.addBtn, { borderColor: theme.primary }]}
            >
              <IconPlus size={16} color={theme.primary} />
              <ThemedText type="default" style={{ color: theme.primary, fontWeight: '600' }}>Add another entry</ThemedText>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  dateTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    flex: 1,
  },
  todayBadge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Spacing.two,
  },
  statCard: {
    width: '48%',
  },
  entryCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
    gap: Spacing.two,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  entryTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minWidth: 0,
  },
  entryTitle: {
    fontWeight: '600',
    flexShrink: 1,
  },
  typeChip: {
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
    borderRadius: Spacing.one,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  tagChip: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  preview: {
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
});
