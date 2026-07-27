import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService, type JournalEntry } from '@/services/journal-service';
import { TagService, type Tag } from '@/services/tag-service';

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

function estimateReadingTime(text: string): string {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

export default function CalendarDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;
    let mounted = true;
    (async () => {
      try {
        const result = await JournalService.getJournalByDate(db, date);
        if (mounted) {
          setEntry(result);
          if (result) {
            TagService.getJournalTags(db, result.id).then(setTags).catch(() => {});
          }
        }
      } catch {
        if (mounted) setEntry(null);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [db, date]);

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
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerAction}>
          <SymbolView name="chevron.left" size={20} tintColor={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title" style={styles.dateTitle}>{displayDate}</ThemedText>
        {isToday && (
          <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
            <ThemedText type="small" style={{ color: '#FFFFFF', fontWeight: '600' }}>Today</ThemedText>
          </View>
        )}

        {!entry ? (
          <ThemedView style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <SymbolView name="doc" size={40} tintColor={theme.textMuted} />
            <ThemedText type="default" themeColor="textMuted" style={{ textAlign: 'center' }}>
              No journal entry for this day
            </ThemedText>
            <Pressable
              onPress={() => router.push(`/(tabs)/writer?date=${date}` as any)}
              style={[styles.createBtn, { backgroundColor: theme.primary }]}
            >
              <SymbolView name="square.and.pencil" size={16} tintColor="#FFFFFF" />
              <ThemedText type="default" style={{ color: '#FFFFFF', fontWeight: '600' }}>Write Entry</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <>
            <View style={styles.statsRow}>
              <ThemedView style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <SymbolView name="doc.text" size={16} tintColor={theme.textSecondary} />
                <ThemedText type="default" style={{ fontWeight: '600' }}>{entry.word_count}</ThemedText>
                <ThemedText type="small" themeColor="textMuted">words</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <SymbolView name="clock" size={16} tintColor={theme.textSecondary} />
                <ThemedText type="default" style={{ fontWeight: '600' }}>{estimateReadingTime(entry.content)}</ThemedText>
                <ThemedText type="small" themeColor="textMuted">read</ThemedText>
              </ThemedView>
            </View>

            {entry.mood && (
              <View style={[styles.moodRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="default">
                  {MOOD_EMOJIS[entry.mood] ?? ''} {entry.mood}
                </ThemedText>
              </View>
            )}

            {tags.length > 0 && (
              <View style={styles.tagRow}>
                {tags.map((tag) => (
                  <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color }]}>
                    <ThemedText type="small" style={{ color: '#FFFFFF' }}>{tag.name}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                onPress={() => router.push(`/reading?date=${date}` as any)}
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
              >
                <SymbolView name="book" size={18} tintColor="#FFFFFF" />
                <ThemedText type="default" style={{ color: '#FFFFFF', fontWeight: '600' }}>Read</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(tabs)/writer?date=${date}` as any)}
                style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.primary, borderWidth: 1 }]}
              >
                <SymbolView name="square.and.pencil" size={18} tintColor={theme.primary} />
                <ThemedText type="default" style={{ color: theme.primary, fontWeight: '600' }}>Edit</ThemedText>
              </Pressable>
            </View>

            {entry.content.trim() ? (
              <ThemedView style={[styles.previewCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="smallBold" themeColor="textMuted" style={{ marginBottom: Spacing.one }}>Preview</ThemedText>
                <ThemedText type="default" numberOfLines={10} style={{ lineHeight: 24 }}>
                  {entry.content}
                </ThemedText>
              </ThemedView>
            ) : (
              <ThemedView style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="default" themeColor="textMuted">This entry is empty</ThemedText>
              </ThemedView>
            )}
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
  dateTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  todayBadge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  previewCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
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
