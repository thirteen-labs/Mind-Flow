import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService, type JournalEntry } from '@/services/journal-service';
import { TagService, type Tag } from '@/services/tag-service';

const DEBOUNCE_MS = 300;

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function snippet(text: string, maxLen = 120): string {
  const clean = text.replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= maxLen) return clean || '(empty)';
  return clean.slice(0, maxLen).trimEnd() + '\u2026';
}

type DateRangePreset = 'all' | 'today' | 'week' | 'month' | 'year';

function getDateRange(preset: DateRangePreset): { fromDate?: string; toDate?: string; label: string } {
  const now = new Date();
  const today = dateStr(now);
  if (preset === 'today') return { fromDate: today, toDate: today, label: 'Today' };
  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    return { fromDate: dateStr(start), toDate: today, label: 'This Week' };
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: dateStr(start), toDate: today, label: 'This Month' };
  }
  if (preset === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { fromDate: dateStr(start), toDate: today, label: 'This Year' };
  }
  return { label: 'All Time' };
}

export default function SearchScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    TagService.getAll(db).then(setAllTags).catch(() => {});
  }, [db]);

  const search = useCallback(
    async (q: string, tagIds: string[], preset: DateRangePreset) => {
      const range = getDateRange(preset);
      const hasQuery = q.trim().length > 0;
      const hasTags = tagIds.length > 0;
      const hasDate = preset !== 'all';
      if (!hasQuery && !hasTags && !hasDate) {
        setResults([]);
        setSearched(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const rows = await JournalService.searchJournals(
          db, q,
          hasTags ? tagIds : undefined,
          range.fromDate, range.toDate
        );
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [db]
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query, selectedTagIds, datePreset), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, selectedTagIds, datePreset, search]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleResultPress = useCallback((entry: JournalEntry) => {
    router.push(`/reading?date=${entry.date}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: JournalEntry }) => (
      <Pressable
        onPress={() => handleResultPress(item)}
        style={[styles.result, { borderBottomColor: theme.border }]}
      >
        <ThemedView style={styles.resultHeader}>
          <ThemedText type="small" themeColor="tint">
            {formatDate(item.date)}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {item.word_count} words
          </ThemedText>
        </ThemedView>
        <ThemedText type="default" numberOfLines={3}>
          {snippet(item.content)}
        </ThemedText>
      </Pressable>
    ),
    [theme, handleResultPress]
  );

  const hasFilters = selectedTagIds.length > 0 || datePreset !== 'all';

  const clearAll = useCallback(() => {
    setSelectedTagIds([]);
    setDatePreset('all');
  }, []);

  const presets: { key: DateRangePreset; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'tray.full' },
    { key: 'today', label: 'Today', icon: 'sun.max' },
    { key: 'week', label: 'Week', icon: 'calendar' },
    { key: 'month', label: 'Month', icon: 'calendar.badge.clock' },
    { key: 'year', label: 'Year', icon: 'calendar.badge.year' },
  ];

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Search</ThemedText>
      </ThemedView>

      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <SymbolView name="magnifyingglass" size={16} tintColor={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search journals..."
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <SymbolView name="xmark.circle.fill" size={16} tintColor={theme.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={styles.dateRow}>
        {presets.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setDatePreset(p.key)}
            style={[
              styles.dateChip,
              {
                backgroundColor: datePreset === p.key ? theme.primary : theme.backgroundElement,
                borderColor: datePreset === p.key ? theme.primary : theme.border,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: datePreset === p.key ? '#FFFFFF' : theme.textSecondary, fontWeight: '500' }}
            >
              {p.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {allTags.length > 0 && (
        <View style={styles.tagRow}>
          <FlatList
            horizontal
            data={allTags}
            keyExtractor={(t) => t.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagList}
            renderItem={({ item: tag }) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <Pressable
                  onPress={() => toggleTag(tag.id)}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: active ? tag.color : theme.backgroundElement,
                      borderColor: active ? tag.color : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: active ? '#FFFFFF' : theme.textSecondary, fontWeight: '500' }}
                  >
                    {tag.name}
                  </ThemedText>
                </Pressable>
              );
            }}
          />
          {hasFilters && (
            <Pressable onPress={clearAll} style={styles.clearTags}>
              <ThemedText type="small" themeColor="textMuted">Clear all</ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {loading ? (
        <ThemedView style={styles.centered}>
          <ActivityIndicator color={theme.textMuted} />
        </ThemedView>
      ) : !searched ? (
        <ThemedView style={styles.centered}>
          <SymbolView name="text.magnifyingglass" size={48} tintColor={theme.textMuted} />
          <ThemedText type="default" themeColor="textSecondary">
            Search your journals
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            Find entries by content, date, tags, or keywords
          </ThemedText>
        </ThemedView>
      ) : results.length === 0 ? (
        <ThemedView style={styles.centered}>
          <SymbolView name="questionmark" size={48} tintColor={theme.textMuted} />
          <ThemedText type="default" themeColor="textSecondary">
            No results
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            Try different keywords, date range, or tags
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    paddingHorizontal: Spacing.three,
    height: 44,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
    height: '100%',
  },
  dateRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  dateChip: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.four,
  },
  tagList: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  tagChip: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  clearTags: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: 100,
  },
  hint: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 220,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  result: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    gap: Spacing.one,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
