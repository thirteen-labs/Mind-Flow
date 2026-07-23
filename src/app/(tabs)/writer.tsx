import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { EmbedList } from '@/components/embed-list';
import { MarkdownEditor } from '@/components/editor/markdown-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTodayJournal } from '@/hooks/use-journal';

export default function WriterScreen() {
  const theme = useTheme();
  const { content, setContent, wordCount, loading, error, retry } = useTodayJournal();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const todayISO = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.textMuted} />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.three }}>
        <ThemedText type="default" themeColor="error">Failed to load journal</ThemedText>
        <Pressable
          onPress={retry}
          style={[styles.retryButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <ThemedText type="default" themeColor="tint">Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerRow}>
          <ThemedText type="title">Today</ThemedText>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push(`/reading?date=${todayISO}`)}
              style={[styles.iconButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <SymbolView name="book" size={18} tintColor={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/export')}
              style={[styles.iconButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <SymbolView name="square.and.arrow.up" size={18} tintColor={theme.text} />
            </Pressable>
          </View>
        </ThemedView>
        <ThemedText type="small" themeColor="textSecondary">{today}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">{wordCount} words</ThemedText>
      </ThemedView>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <MarkdownEditor value={content} onChange={setContent} placeholder="Start writing..." />
        <EmbedList content={content} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.half,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  retryButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});
