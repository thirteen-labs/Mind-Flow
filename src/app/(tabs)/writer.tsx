import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';

import { EmbedList } from '@/components/embed-list';
import { MarkdownEditor } from '@/components/editor/markdown-editor';
import { MoodPicker } from '@/components/mood-picker';
import { TagInput } from '@/components/tag-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJournal } from '@/hooks/use-journal';
import { TagService, type Tag } from '@/services/tag-service';
import { MediaService } from '@/services/media-service';

export default function WriterScreen() {
  const theme = useTheme();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { content, setContent, wordCount, loading, error, retry, journal, setMood, isToday } = useJournal(dateParam);
  const db = useSQLiteContext();
  const [journalTags, setJournalTags] = useState<Tag[]>([]);
  const [showMediaSheet, setShowMediaSheet] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);

  useEffect(() => {
    if (journal) {
      TagService.getJournalTags(db, journal.id).then(setJournalTags).catch(() => {});
    }
  }, [db, journal]);

  const handleTagsChange = useCallback((tags: Tag[]) => {
    setJournalTags(tags);
  }, []);

  const insertIntoContent = useCallback((insertText: string) => {
    setContent((prev) => prev + (prev ? '\n\n' : '') + insertText);
  }, [setContent]);

  const handlePickImage = useCallback(async () => {
    setShowMediaSheet(false);
    if (!journal) return;
    setMediaLoading(true);
    try {
      const media = await MediaService.pickImage();
      if (media) {
        await MediaService.saveMediaRecord(db, media, journal.id);
        insertIntoContent(`![Image](${media.uri})`);
      }
    } finally {
      setMediaLoading(false);
    }
  }, [db, journal, insertIntoContent]);

  const handleTakePhoto = useCallback(async () => {
    setShowMediaSheet(false);
    if (!journal) return;
    setMediaLoading(true);
    try {
      const media = await MediaService.takePhoto();
      if (media) {
        await MediaService.saveMediaRecord(db, media, journal.id);
        insertIntoContent(`![Photo](${media.uri})`);
      }
    } finally {
      setMediaLoading(false);
    }
  }, [db, journal, insertIntoContent]);

  const handlePickVideo = useCallback(async () => {
    setShowMediaSheet(false);
    if (!journal) return;
    setMediaLoading(true);
    try {
      const media = await MediaService.pickVideo();
      if (media) {
        await MediaService.saveMediaRecord(db, media, journal.id);
        insertIntoContent(`[Video](${media.uri})`);
      }
    } finally {
      setMediaLoading(false);
    }
  }, [db, journal, insertIntoContent]);

  const entryDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();
  const displayDate = entryDate.toLocaleDateString('en-US', {
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
          <ThemedText type="title">{isToday ? 'Today' : displayDate}</ThemedText>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setShowMediaSheet(true)}
              style={[styles.iconButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <SymbolView name="paperclip" size={18} tintColor={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => router.push(`/reading?date=${dateParam ?? todayISO}`)}
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
        <ThemedText type="small" themeColor="textSecondary">{displayDate}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">{wordCount} words</ThemedText>
      </ThemedView>

      <MoodPicker selected={journal?.mood ?? null} onSelect={setMood} />

      {journal && (
        <TagInput
          journalId={journal.id}
          selectedTags={journalTags}
          onTagsChange={handleTagsChange}
        />
      )}

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <MarkdownEditor value={content} onChange={setContent} placeholder="Start writing..." />
        <EmbedList content={content} />
      </ScrollView>

      {mediaLoading && (
        <View style={styles.mediaLoadingOverlay}>
          <ActivityIndicator color={theme.text} />
        </View>
      )}

      <Modal visible={showMediaSheet} transparent animationType="fade">
        <Pressable style={styles.sheetOverlay} onPress={() => setShowMediaSheet(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <ThemedText type="default" style={styles.sheetTitle}>Attach Media</ThemedText>
            <Pressable onPress={handlePickImage} style={[styles.sheetOption, { borderBottomColor: theme.border }]}>
              <SymbolView name="photo" size={22} tintColor={theme.text} />
              <ThemedText type="default">Image from Library</ThemedText>
            </Pressable>
            <Pressable onPress={handleTakePhoto} style={[styles.sheetOption, { borderBottomColor: theme.border }]}>
              <SymbolView name="camera" size={22} tintColor={theme.text} />
              <ThemedText type="default">Take Photo</ThemedText>
            </Pressable>
            <Pressable onPress={handlePickVideo} style={styles.sheetOption}>
              <SymbolView name="video" size={22} tintColor={theme.text} />
              <ThemedText type="default">Video from Library</ThemedText>
            </Pressable>
            <Pressable onPress={() => setShowMediaSheet(false)} style={[styles.sheetCancel, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="default" themeColor="textMuted">Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  mediaLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  sheetTitle: {
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
});
