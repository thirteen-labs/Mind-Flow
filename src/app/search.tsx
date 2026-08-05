import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconBulb,
  IconCalendar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronUp,
  IconCircleX,
  IconFileText,
  IconFilter,
  IconHelp,
  IconSearch,
} from '@tabler/icons-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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
type SortOption = 'newest' | 'oldest' | 'az' | 'za';
type FilterType = 'note' | 'plan' | 'idea';

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
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [selectedTypes, setSelectedTypes] = useState<FilterType[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [allNotes, setAllNotes] = useState<JournalEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    TagService.getAll(db).then(setAllTags).catch(() => {});
    JournalService.getAllJournals(db).then((entries) => {
      setAllNotes(entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }).catch(() => {});
  }, [db]);

  const search = useCallback(
    async (q: string, tagIds: string[], preset: DateRangePreset, types: FilterType[], sort: SortOption) => {
      const range = getDateRange(preset);
      const hasQuery = q.trim().length > 0;
      const hasTags = tagIds.length > 0;
      const hasDate = preset !== 'all';
      const hasTypes = types.length > 0;
      const hasSearch = hasQuery || hasTags || hasDate || hasTypes;

      if (!hasSearch) {
        setResults(allNotes);
        setSearched(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setSearched(true);
      try {
        let rows = await JournalService.searchJournals(
          db, q,
          hasTags ? tagIds : undefined,
          range.fromDate, range.toDate
        );

        if (hasTypes) {
          rows = rows.filter((r) => types.includes(r.entry_type as FilterType));
        }

        rows.sort((a, b) => {
          switch (sort) {
            case 'newest':
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            case 'oldest':
              return new Date(a.date).getTime() - new Date(b.date).getTime();
            case 'az':
              return a.content.localeCompare(b.content);
            case 'za':
              return b.content.localeCompare(a.content);
            default:
              return 0;
          }
        });

        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [db, allNotes]
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query, selectedTagIds, datePreset, selectedTypes, sortBy), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, selectedTagIds, datePreset, selectedTypes, sortBy, search]);

  const toggleTag = useCallback((tagId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const toggleType = useCallback((type: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleResultPress = useCallback((entry: JournalEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/reading?id=${entry.id}`);
  }, []);

  const clearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTagIds([]);
    setDatePreset('all');
    setSelectedTypes([]);
    setSortBy('newest');
    setQuery('');
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: JournalEntry; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Pressable
          onPress={() => handleResultPress(item)}
          style={[styles.result, { borderBottomColor: theme.border }]}
        >
          <ThemedView style={styles.resultHeader}>
            <ThemedText type="small" themeColor="tint" numberOfLines={1}>
              {item.title || formatDate(item.date)}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {item.word_count} words
            </ThemedText>
          </ThemedView>
          <ThemedText type="default" numberOfLines={3}>
            {snippet(item.content)}
          </ThemedText>
        </Pressable>
      </Animated.View>
    ),
    [theme, handleResultPress]
  );

  const hasFilters = selectedTagIds.length > 0 || datePreset !== 'all' || selectedTypes.length > 0 || sortBy !== 'newest';

  const datePresets: { key: DateRangePreset; label: string }[] = [
    { key: 'all', label: 'Anytime' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ];

  const typeFilters: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'note', label: 'Notes', icon: <IconFileText size={14} /> },
    { key: 'plan', label: 'Plans', icon: <IconCalendar size={14} /> },
    { key: 'idea', label: 'Ideas', icon: <IconBulb size={14} /> },
  ];

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'newest', label: 'Newest First' },
    { key: 'oldest', label: 'Oldest First' },
    { key: 'az', label: 'A-Z' },
    { key: 'za', label: 'Z-A' },
  ];

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerAction}>
            <IconChevronLeft size={20} color={theme.tint} />
            <ThemedText type="default" themeColor="tint">Back</ThemedText>
          </Pressable>
          <ThemedText type="title">All Notes</ThemedText>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSearch(!showSearch);
            }}
            style={styles.headerAction}
          >
            <IconSearch size={20} color={theme.tint} />
          </Pressable>
        </ThemedView>
      </Animated.View>

      {/* Search Bar — hidden until triggered */}
      {showSearch && (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <IconSearch size={16} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search notes, plans, ideas..."
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <IconCircleX size={16} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}

      {/* Filters Toggle — only visible when search is open */}
      {showSearch && (
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFilters(!showFilters);
            }}
            style={[styles.filterToggle, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <IconFilter size={16} color={theme.tint} />
            <ThemedText type="small" themeColor="tint">Filters</ThemedText>
            {showFilters ? <IconChevronUp size={12} color={theme.tint} /> : <IconChevronDown size={12} color={theme.tint} />}
          </Pressable>
        </Animated.View>
      )}

      {/* Filters Section */}
      {showFilters && (
        <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.filtersContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Type Filter */}
          <View style={styles.filterSection}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.filterLabel}>Type</ThemedText>
            <View style={styles.filterChips}>
              {typeFilters.map((type) => (
                <Pressable
                  key={type.key}
                  onPress={() => toggleType(type.key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selectedTypes.includes(type.key) ? theme.primary : theme.backgroundElement,
                      borderColor: selectedTypes.includes(type.key) ? theme.primary : theme.border,
                    },
                  ]}
                >
                  {(() => {
                    const isSelected = selectedTypes.includes(type.key);
                    const color = isSelected ? '#FFFFFF' : theme.textSecondary;
                    if (React.isValidElement(type.icon)) {
                      return React.cloneElement(type.icon as React.ReactElement<{ color?: string }>, { color });
                    }
                    return type.icon;
                  })()}
                  <ThemedText
                    type="small"
                    style={{ color: selectedTypes.includes(type.key) ? '#FFFFFF' : theme.textSecondary, fontWeight: '500' }}
                  >
                    {type.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <View style={styles.filterSection}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.filterLabel}>Tags</ThemedText>
              <FlashList
                horizontal
                data={allTags}
                keyExtractor={(t) => t.id}
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.tagSeparator} />}
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
            </View>
          )}

          {/* Date Filter */}
          <View style={styles.filterSection}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.filterLabel}>Date</ThemedText>
            <View style={styles.filterChips}>
              {datePresets.map((preset) => (
                <Pressable
                  key={preset.key}
                  onPress={() => setDatePreset(preset.key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: datePreset === preset.key ? theme.primary : theme.backgroundElement,
                      borderColor: datePreset === preset.key ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: datePreset === preset.key ? '#FFFFFF' : theme.textSecondary, fontWeight: '500' }}
                  >
                    {preset.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Sort Filter */}
          <View style={styles.filterSection}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.filterLabel}>Sort By</ThemedText>
            <View style={styles.filterChips}>
              {sortOptions.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => setSortBy(option.key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: sortBy === option.key ? theme.primary : theme.backgroundElement,
                      borderColor: sortBy === option.key ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: sortBy === option.key ? '#FFFFFF' : theme.textSecondary, fontWeight: '500' }}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Clear Filters */}
          {hasFilters && (
            <Pressable onPress={clearAll} style={styles.clearFilters}>
              <ThemedText type="small" themeColor="textMuted">Clear all filters</ThemedText>
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* Results */}
      {loading ? (
        <ThemedView style={styles.centered}>
          <ActivityIndicator color={theme.textMuted} />
        </ThemedView>
      ) : !searched && results.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.centered}>
          <IconSearch size={48} color={theme.textMuted} />
          <ThemedText type="default" themeColor="textSecondary">
            Search your journals
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            Find entries by content, date, tags, or keywords
          </ThemedText>
        </Animated.View>
      ) : results.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.centered}>
          <IconHelp size={48} color={theme.textMuted} />
          <ThemedText type="default" themeColor="textSecondary">
            No results
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            Try different keywords, date range, or tags
          </ThemedText>
          <Pressable onPress={clearAll} style={[styles.clearButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="tint">Clear Filters</ThemedText>
          </Pressable>
        </Animated.View>
      ) : (
        <>
          {searched && (
            <ThemedText type="small" themeColor="textMuted" style={styles.resultsCount}>
              {results.length} {results.length === 1 ? 'note' : 'notes'} found
            </ThemedText>
          )}
          <FlashList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 6,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
    alignSelf: 'flex-start',
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
    borderCurve: 'continuous',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
    height: '100%',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  filtersContainer: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.three,
    borderCurve: 'continuous',
  },
  filterSection: {
    gap: Spacing.two,
  },
  filterLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  tagSeparator: {
    width: Spacing.two,
  },
  tagChip: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  clearFilters: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
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
  clearButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderCurve: 'continuous',
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
  resultsCount: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
});
