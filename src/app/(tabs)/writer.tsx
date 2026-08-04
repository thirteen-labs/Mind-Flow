import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { IconChevronLeft, IconMoodHappy, IconPencil, IconCheck } from '@tabler/icons-react-native';
import * as Haptics from 'expo-haptics';

import { MarkdownEditor } from '@/components/editor/markdown-editor';
import { MoodPicker } from '@/components/mood-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJournal } from '@/hooks/use-journal';
import { insertImage } from '@/components/editor/formatting';
import { consumeJournalParams, type JournalNavParams } from '@/services/journal-nav';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function WriterScreen() {
  const theme = useTheme();
  const [journalParams, setJournalParams] = useState<JournalNavParams>({});
  const targetDate = journalParams.date || getTodayDate();
  const { journal, loading, error, content, setContent, title, setTitle, wordCount, save, retry } = useJournal(targetDate);
  const contentRef = useRef(content);
  const processedSketchRef = useRef<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(journal?.mood ?? null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [error]);

  useFocusEffect(
    useCallback(() => {
      const params = consumeJournalParams();
      setJournalParams(params ?? {});
    }, [])
  );

  useEffect(() => {
    const sketchUri = journalParams.sketchUri;
    if (sketchUri && processedSketchRef.current !== sketchUri) {
      processedSketchRef.current = sketchUri;
      const newContent = insertImage(contentRef.current, contentRef.current.length, contentRef.current.length, sketchUri);
      setContent(newContent.text);
    }
  }, [journalParams.sketchUri, setContent]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    save();
    router.back();
  }, [save]);

  const handleSaveToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (readOnly) {
      setReadOnly(false);
    } else {
      Keyboard.dismiss();
      save();
      setReadOnly(true);
    }
  }, [readOnly, save]);

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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={handleBack} style={styles.headerAction}>
          <IconChevronLeft size={20} color={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
        <View style={styles.headerCenter}>
          <TextInput
            value={title ?? ''}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={theme.textMuted}
            editable={!readOnly}
            selectTextOnFocus
            maxLength={80}
            style={[styles.titleInput, { color: theme.text, fontFamily: theme.fontFamily }]}
          />
          <ThemedText type="small" themeColor="textMuted">
            {formatDate(targetDate)} · {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleSaveToggle}
            style={[styles.headerIconButton, readOnly && { backgroundColor: theme.backgroundElement }]}
          >
            {readOnly
              ? <IconPencil size={20} color={theme.tint} />
              : <IconCheck size={20} color={theme.tint} />
            }
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMoodPicker(!showMoodPicker);
            }}
            style={styles.headerIconButton}
          >
            <IconMoodHappy size={20} color={selectedMood ? theme.primary : theme.tint} />
          </Pressable>
        </View>
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
          readOnly={readOnly}
        />
      </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 6,
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
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
  },
  titleInput: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    padding: 0,
    maxWidth: '100%',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
