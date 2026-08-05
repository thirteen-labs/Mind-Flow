import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { IconChevronLeft, IconEye, IconPencil, IconStar, IconPin, IconShare, IconFileText, IconCopy, IconTrash, IconFileExport, IconCheck } from '@tabler/icons-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, contrastText, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService, type JournalEntry } from '@/services/journal-service';
import { ExportService } from '@/services/export-service';

type ViewMode = 'reader' | 'editor' | 'export';

export default function NoteViewerScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [mode, setMode] = useState<ViewMode>('reader');
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const loadEntry = useCallback(async (entryDate: string) => {
    setLoading(true);
    try {
      const journal = await JournalService.getJournalByDate(db, entryDate);
      setEntry(journal);
      setIsFavorite(!!journal?.is_favorited);
      setIsPinned(!!journal?.is_pinned);
    } catch {
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadEntry(date);
    }
  }, [date, loadEntry]);

  const handleShare = useCallback(async () => {
    if (!entry) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: entry.content,
        title: entry.title ? entry.title : `Journal Entry - ${entry.date}`,
      });
    } catch {
      // Share cancelled
    }
  }, [entry]);

  const handleSave = useCallback(async () => {
    if (!entry) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const wordCount = editContent.trim().split(/\s+/).filter(Boolean).length;
      await JournalService.saveJournal(db, entry.id, editContent, wordCount, editTitle || null);
      setEntry(prev => prev ? { ...prev, content: editContent, title: editTitle, word_count: wordCount } : null);
      setHasChanges(false);
      setMode('reader');
    } catch {
      Alert.alert('Error', 'Could not save entry');
    }
  }, [db, entry, editContent, editTitle]);

  const handleContentChange = useCallback((text: string) => {
    setEditContent(text);
    setHasChanges(true);
  }, []);

  const handleTitleChange = useCallback((text: string) => {
    setEditTitle(text);
    setHasChanges(true);
  }, []);

  const handleToggleFavorite = useCallback(async () => {
    if (!entry) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = await JournalService.toggleFavorite(db, entry.id);
    setIsFavorite(newValue);
    setEntry(prev => prev ? { ...prev, is_favorited: newValue ? 1 : 0 } : null);
  }, [db, entry]);

  const handleTogglePin = useCallback(async () => {
    if (!entry) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = await JournalService.togglePin(db, entry.id);
    setIsPinned(newValue);
    setEntry(prev => prev ? { ...prev, is_pinned: newValue ? 1 : 0 } : null);
  }, [db, entry]);

  const handleDuplicate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!entry) return;
    Alert.alert(
      'Duplicate',
      'Create a copy of this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            try {
              await JournalService.createJournal(db, entry.content + '\n\n(Copy)');
              Alert.alert('Success', 'Entry duplicated');
            } catch {
              Alert.alert('Error', 'Could not duplicate entry');
            }
          },
        },
      ]
    );
  }, [db, entry]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!entry) return;
    Alert.alert(
      'Delete',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await JournalService.deleteJournal(db, entry.id);
              router.back();
            } catch {
              Alert.alert('Error', 'Could not delete entry');
            }
          },
        },
      ]
    );
  }, [db, entry]);

  const handleExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!entry) return;
    try {
      await ExportService.export({
        entries: [entry],
        format: 'markdown',
        filename: entry.title ? `journal_${entry.title}` : `journal_${entry.date}`,
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
  }, [entry, theme]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText type="default" themeColor="textMuted">Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!entry) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText type="default" themeColor="textMuted">Entry not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (mode === 'editor' && hasChanges) {
              Alert.alert('Discard changes?', 'You have unsaved changes', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => { setMode('reader'); router.back(); } },
                { text: 'Save', onPress: async () => { await handleSave(); router.back(); } },
              ]);
            } else {
              router.back();
            }
          }} style={styles.backButton}>
            <IconChevronLeft size={20} color={theme.text} />
          </Pressable>
          {mode === 'editor' ? (
            <TextInput
              value={editTitle}
              onChangeText={handleTitleChange}
              placeholder="Title"
              placeholderTextColor={theme.textMuted}
              style={[styles.titleInput, { color: theme.text, fontFamily: theme.fontFamily }]}
            />
          ) : (
            <ThemedText type="default" numberOfLines={1} style={styles.headerTitle}>
              {entry.title || formatDate(entry.date)}
            </ThemedText>
          )}
          {mode === 'editor' ? (
            <Pressable onPress={handleSave} style={[styles.editButton, { backgroundColor: theme.primary }]}>
              <IconCheck size={18} color={contrastText(theme.primary)} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setMode(mode === 'reader' ? 'editor' : 'reader')} style={styles.editButton}>
              {mode === 'reader' ? <IconPencil size={18} color={theme.tint} /> : <IconEye size={18} color={theme.tint} />}
            </Pressable>
          )}
        </ThemedView>
      </Animated.View>

      {/* Mode Tabs */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <View style={styles.tabBar}>
          {([
            { key: 'reader', icon: IconEye, label: 'Read' },
            { key: 'editor', icon: IconPencil, label: 'Edit' },
            { key: 'export', icon: IconFileExport, label: 'Export' },
          ] as const).map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (tab.key === 'editor' && entry) {
                  setEditContent(entry.content);
                  setEditTitle(entry.title || '');
                  setHasChanges(false);
                }
                setMode(tab.key);
              }}
              style={[styles.tab, mode === tab.key && { backgroundColor: theme.primary }]}
            >
              <tab.icon size={16} color={mode === tab.key ? contrastText(theme.primary) : theme.textMuted} />
              <ThemedText
                type="small"
                style={{ color: mode === tab.key ? contrastText(theme.primary) : theme.textMuted, fontWeight: '600' }}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* Meta Info */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ThemedView style={styles.metaContainer}>
          <ThemedText type="small" themeColor="textMuted">
            {formatDate(entry.date)} · {formatTime(entry.date)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {entry.word_count} words
          </ThemedText>
        </ThemedView>
      </Animated.View>

      {/* Content */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.contentContainer}>
        {mode === 'reader' ? (
          <ScrollView
            contentContainerStyle={styles.contentPadding}
            showsVerticalScrollIndicator={false}
          >
            <MarkdownRenderer content={entry.content} />
          </ScrollView>
        ) : mode === 'editor' ? (
          <ScrollView
            contentContainerStyle={styles.contentPadding}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              value={editContent}
              onChangeText={handleContentChange}
              placeholder="Start writing..."
              placeholderTextColor={theme.textMuted}
              multiline
              textAlignVertical="top"
              style={[styles.editorInput, { color: theme.text, fontFamily: theme.fontFamily }]}
              autoFocus
            />
          </ScrollView>
        ) : (
          <ExportOptions entry={entry} theme={theme} />
        )}
      </Animated.View>

      {/* Action Bar */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <ThemedView style={[styles.actionBar, { borderTopColor: theme.border }]}>
          <Pressable
            onPress={handleToggleFavorite}
            style={[styles.actionButton, isFavorite && styles.actionButtonActive]}
          >
            <IconStar
              size={20}
              color={isFavorite ? theme.warning : theme.textMuted}
              fill={isFavorite ? theme.warning : 'none'}
            />
          </Pressable>

          <Pressable
            onPress={handleTogglePin}
            style={[styles.actionButton, isPinned && styles.actionButtonActive]}
          >
            <IconPin
              size={20}
              color={isPinned ? theme.tint : theme.textMuted}
              fill={isPinned ? theme.tint : 'none'}
            />
          </Pressable>

          <Pressable onPress={handleShare} style={styles.actionButton}>
            <IconShare size={20} color={theme.textMuted} />
          </Pressable>

          <Pressable onPress={handleExport} style={styles.actionButton}>
            <IconFileText size={20} color={theme.textMuted} />
          </Pressable>

          <Pressable onPress={handleDuplicate} style={styles.actionButton}>
            <IconCopy size={20} color={theme.textMuted} />
          </Pressable>

          <Pressable onPress={handleDelete} style={styles.actionButton}>
            <IconTrash size={20} color={theme.error} />
          </Pressable>
        </ThemedView>
      </Animated.View>
    </ThemedView>
  );
}

function ExportOptions({ entry: entryData, theme: t }: { entry: JournalEntry; theme: ReturnType<typeof useTheme> }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async (format: 'markdown' | 'html' | 'pdf' | 'txt') => {
    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await ExportService.export({
        entries: [entryData],
        format,
        filename: entryData.title ? `journal_${entryData.title}` : `journal_${entryData.date}`,
        themeColors: {
          background: t.background,
          text: t.text,
          primary: t.primary,
          fontFamily: t.fontFamily,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExporting(false);
    }
  }, [entryData, t]);

  const formats = [
    { key: 'pdf' as const, label: 'PDF', desc: 'Print-ready document', icon: IconFileExport },
    { key: 'txt' as const, label: 'Plain Text', desc: 'Simple text file', icon: IconFileText },
    { key: 'markdown' as const, label: 'Markdown', desc: 'Raw text with formatting', icon: IconFileText },
    { key: 'html' as const, label: 'HTML', desc: 'Styled web page', icon: IconFileText },
  ];

  return (
    <ScrollView contentContainerStyle={styles.exportPadding}>
      <ThemedText type="subtitle" style={styles.exportTitle}>Export Entry</ThemedText>
      <ThemedText type="small" themeColor="textMuted" style={styles.exportSubtitle}>
        {entryData.title || entryData.date} · {entryData.word_count} words
      </ThemedText>
      <View style={styles.exportList}>
        {formats.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => handleExport(f.key)}
            disabled={exporting}
            style={[styles.exportOption, { backgroundColor: t.backgroundElement }]}
          >
            <View style={[styles.exportIconWrap, { backgroundColor: withAlpha(t.primary, 0.12) }]}>
              <f.icon size={20} color={t.primary} />
            </View>
            <View style={styles.exportInfo}>
              <ThemedText type="default" style={styles.exportLabel}>{f.label}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">{f.desc}</ThemedText>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontWeight: '600',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  contentContainer: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  content: {
    lineHeight: 24,
  },
  actionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  editorInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
  exportPadding: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  exportTitle: {
    marginBottom: Spacing.one,
  },
  exportSubtitle: {
    marginBottom: Spacing.two,
  },
  exportList: {
    gap: Spacing.two,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 14,
  },
  exportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportInfo: {
    flex: 1,
    gap: 2,
  },
  exportLabel: {
    fontWeight: '600',
  },
});
