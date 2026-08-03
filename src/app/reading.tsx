import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { IconChevronLeft, IconPencil, IconShare, IconSearch } from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService, type JournalEntry } from '@/services/journal-service';
import { ExportService } from '@/services/export-service';
import { TagService, type Tag } from '@/services/tag-service';

function estimateReadingTime(text: string): string {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', calm: '😌', grateful: '🥰', thoughtful: '🤔',
  sad: '😢', frustrated: '😤', anxious: '😰', excited: '🤩',
  tired: '🥱', sick: '🤒',
};
function moodEmoji(mood: string): string {
  return MOOD_EMOJIS[mood] ?? '';
}

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; entry: JournalEntry }
  | { status: 'error' };

export default function ReadingScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [readingTags, setReadingTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (!date) return;
    let mounted = true;
    (async () => {
      try {
        const result = await JournalService.getJournalByDate(db, date);
        if (mounted) {
          setLoadState(result ? { status: 'loaded', entry: result } : { status: 'error' });
        }
      } catch {
        if (mounted) setLoadState({ status: 'error' });
      }
    })();
    return () => { mounted = false; };
  }, [db, date]);

  useEffect(() => {
    if (loadState.status !== 'loaded') return;
    TagService.getJournalTags(db, loadState.entry.id).then(setReadingTags).catch(() => {});
  }, [db, loadState]);

  const handleExport = async (format: 'markdown' | 'html' | 'json' | 'pdf') => {
    if (loadState.status !== 'loaded') return;
    try {
      await ExportService.export({
        entries: [loadState.entry],
        format,
        filename: `mindflow_${loadState.entry.date}`,
        themeColors: {
          background: theme.background,
          text: theme.text,
          primary: theme.primary,
          fontFamily: theme.fontFamily,
        },
      });
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleExportMenu = () => {
    Alert.alert('Export Entry', 'Choose format', [
      { text: 'Markdown', onPress: () => handleExport('markdown') },
      { text: 'HTML', onPress: () => handleExport('html') },
      { text: 'JSON', onPress: () => handleExport('json') },
      { text: 'PDF', onPress: () => handleExport('pdf') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loadState.status === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.textMuted} />
      </ThemedView>
    );
  }

  if (loadState.status === 'error') {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="error">Journal entry not found</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="small" themeColor="tint">Go back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const entry = loadState.entry;
  const displayDate = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerAction}>
          <IconChevronLeft size={20} color={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push(`/(tabs)/writer?date=${entry.date}`)} style={styles.headerAction}>
            <IconPencil size={18} color={theme.tint} />
            <ThemedText type="default" themeColor="tint">Edit</ThemedText>
          </Pressable>
          <Pressable onPress={handleExportMenu} style={styles.headerAction}>
            <IconShare size={18} color={theme.tint} />
            <ThemedText type="default" themeColor="tint">Export</ThemedText>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: theme.fontFamily }]}>
          {displayDate}
        </Text>

        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: theme.textMuted }]}>
            {entry.word_count} words
          </Text>
          <Text style={[styles.metaDot, { color: theme.textMuted }]}>·</Text>
          <Text style={[styles.metaText, { color: theme.textMuted }]}>
            {estimateReadingTime(entry.content)}
          </Text>
        </View>

        {entry.mood ? (
          <View style={[styles.moodBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">{moodEmoji(entry.mood)} {entry.mood}</ThemedText>
          </View>
        ) : null}

        {readingTags.length > 0 && (
          <View style={styles.tagRow}>
            {readingTags.map((tag) => (
              <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color }]}>
                <ThemedText type="small" style={{ color: '#FFFFFF' }}>{tag.name}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {entry.content.trim() ? (
          <View style={styles.content}>
            <MarkdownRenderer content={entry.content} />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <IconSearch size={40} color={theme.textMuted} />
            <ThemedText type="default" themeColor="textMuted">This entry is empty</ThemedText>
          </View>
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
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: Spacing.one,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  metaText: {
    fontSize: 14,
  },
  metaDot: {
    fontSize: 14,
  },
  moodBadge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  tagChip: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  content: {
    marginTop: Spacing.two,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
});
