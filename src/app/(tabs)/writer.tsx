import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { IconChevronLeft, IconMoodHappy } from '@tabler/icons-react-native';
import * as Haptics from 'expo-haptics';

import { MarkdownEditor } from '@/components/editor/markdown-editor';
import { MoodPicker } from '@/components/mood-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJournal } from '@/hooks/use-journal';
import { insertImage } from '@/components/editor/formatting';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function WriterScreen() {
  const { date, sketchUri } = useLocalSearchParams<{ date: string; sketchUri: string }>();
  const theme = useTheme();
  const targetDate = date || getTodayDate();
  const { journal, loading, error, content, setContent, wordCount, retry } = useJournal(targetDate);
  const contentRef = useRef(content);
  const [selectedMood, setSelectedMood] = useState<string | null>(journal?.mood ?? null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [error]);

  useEffect(() => {
    if (sketchUri) {
      const newContent = insertImage(contentRef.current, contentRef.current.length, contentRef.current.length, sketchUri);
      setContent(newContent.text);
    }
  }, [sketchUri, setContent]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.textMuted} />
      </ThemedView>
    );
  }

  if (error || !journal) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          {error || 'Could not load journal entry'}
        </ThemedText>
        <Pressable onPress={retry} style={[styles.retryButton, { backgroundColor: theme.primary }]}>
          <ThemedText type="default" style={{ color: '#FFFFFF' }}>Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={handleBack} style={styles.headerAction}>
          <IconChevronLeft size={20} color={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText type="small" themeColor="textMuted">
            {formatDate(targetDate)}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowMoodPicker(!showMoodPicker);
          }}
          style={styles.headerAction}
        >
          <IconMoodHappy size={20} color={selectedMood ? theme.primary : theme.tint} />
        </Pressable>
      </ThemedView>

      {/* Mood Picker */}
      {showMoodPicker && (
        <View style={[styles.moodContainer, { borderBottomColor: theme.border }]}>
          <MoodPicker selected={selectedMood} onSelect={setSelectedMood} />
        </View>
      )}

      {/* Editor */}
      <View style={styles.editorContainer}>
        <MarkdownEditor
          value={content}
          onChange={setContent}
          placeholder="Start writing your thoughts..."
        />
      </View>
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
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  moodContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editorContainer: {
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
