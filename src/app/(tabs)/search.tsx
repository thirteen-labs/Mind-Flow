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

const DEBOUNCE_MS = 300;

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
  return clean.slice(0, maxLen).trimEnd() + '…';
}

export default function SearchScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setSearched(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const rows = await JournalService.searchJournals(db, q);
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
    timerRef.current = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, search]);

  const handleResultPress = useCallback((entry: JournalEntry) => {
    router.push('/(tabs)/writer');
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
            Find entries by content, date, or keywords
          </ThemedText>
        </ThemedView>
      ) : results.length === 0 ? (
        <ThemedView style={styles.centered}>
          <SymbolView name="questionmark" size={48} tintColor={theme.textMuted} />
          <ThemedText type="default" themeColor="textSecondary">
            No results
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            Try different keywords
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
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    paddingHorizontal: Spacing.three,
    height: 40,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  list: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  result: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
