import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { IconChevronLeft, IconMoodHappy, IconPencil, IconCheck, IconBrain, IconBulb, IconCalendarEvent, IconFileText, IconMenu2, type Icon } from '@tabler/icons-react-native';
import * as Haptics from 'expo-haptics';

import { MarkdownEditor } from '@/components/editor/markdown-editor';
import { MoodPicker } from '@/components/mood-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, contrastText, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useJournal, type UseJournalOptions } from '@/hooks/use-journal';
import { useTemplate } from '@/hooks/use-template';
import { insertImage } from '@/components/editor/formatting';
import { consumeJournalParams, type JournalEntryType, type JournalNavParams, type WriterMode } from '@/services/journal-nav';
import { setActiveNoteId, openSidebar } from '@/store/sidebar';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ENTRY_TYPE_CONFIG: Record<WriterMode, { label: string; placeholder: string; titlePlaceholder: string; icon: Icon; color: (theme: ReturnType<typeof useTheme>) => string }> = {
  note: {
    label: 'Note',
    placeholder: 'Start writing your thoughts...',
    titlePlaceholder: 'Title',
    icon: IconFileText,
    color: (t) => t.tint,
  },
  idea: {
    label: 'Idea',
    placeholder: 'Capture a spark — what is on your mind?',
    titlePlaceholder: 'Untitled Idea',
    icon: IconBulb,
    color: (t) => t.warning,
  },
  plan: {
    label: 'Plan',
    placeholder: 'Outline today\'s plan...',
    titlePlaceholder: 'Untitled Plan',
    icon: IconCalendarEvent,
    color: (t) => t.success,
  },
  thought: {
    label: 'Thought',
    placeholder: 'Record a passing thought...',
    titlePlaceholder: 'Untitled Thought',
    icon: IconBrain,
    color: (t) => t.secondary,
  },
  template: {
    label: 'Template',
    placeholder: 'Write or paste reusable template content...',
    titlePlaceholder: 'Untitled Template',
    icon: IconFileText,
    color: (t) => t.secondary,
  },
};

export default function WriterScreen() {
  const theme = useTheme();
  const [journalParams, setJournalParams] = useState<JournalNavParams>({});
  const sessionKey = journalParams.requestId ?? 'initial';

  const isTemplate = journalParams.type === 'template';
  const journalOptions: UseJournalOptions = isTemplate
    ? { type: 'note', sessionKey }
    : {
        entryId: journalParams.entryId,
        type: (journalParams.type && journalParams.type !== 'template'
          ? journalParams.type
          : 'note') as JournalEntryType,
        date: journalParams.date,
        sessionKey,
      };
  const journalState = useJournal(journalOptions);
  const templateState = useTemplate({
    templateId: isTemplate ? journalParams.templateId : undefined,
    sessionKey,
  });

  const active = isTemplate ? templateState : journalState;
  const { content, setContent, title, setTitle, wordCount, loading, error, retry, save } = active;

  const contentRef = useRef(content);
  const processedSketchRef = useRef<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  const displayType: WriterMode = isTemplate ? 'template' : (journalState.journal?.entry_type ?? journalOptions.type ?? 'note');
  const typeConfig = ENTRY_TYPE_CONFIG[displayType];
  const typeColor = typeConfig.color(theme);
  const displayDate = journalState.journal?.date ?? journalParams.date ?? getTodayDate();
  const selectedMood = journalState.journal?.mood ?? null;

  useEffect(() => {
    const entry = journalState.journal;
    if (entry && entry.id && !entry.id.startsWith('draft_')) {
      setActiveNoteId(entry.id);
    } else {
      setActiveNoteId(null);
    }
  }, [journalState.journal]);

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
      if (params) setJournalParams(params);
    }, [])
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadOnly(false);
    setShowMoodPicker(false);
    if (journalParams.content) setContent(journalParams.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

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

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          {error}
        </ThemedText>
        <Pressable onPress={retry} style={[styles.retryButton, { backgroundColor: theme.primary }]}>
          <ThemedText type="default" style={{ color: contrastText(theme.primary) }}>Retry</ThemedText>
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
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openSidebar();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.headerAction, pressed && { backgroundColor: theme.backgroundElement }]}
        >
          <IconMenu2 size={20} color={theme.tint} />
        </Pressable>
        <Pressable onPress={handleBack} style={styles.headerAction}>
          <IconChevronLeft size={20} color={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
        <View style={styles.headerCenter}>
          <TextInput
            value={title ?? ''}
            onChangeText={setTitle}
            placeholder={typeConfig.titlePlaceholder}
            placeholderTextColor={theme.textMuted}
            editable={!readOnly}
            selectTextOnFocus
            maxLength={80}
            style={[styles.titleInput, { color: theme.text, fontFamily: theme.fontFamily }]}
          />
          <View style={styles.headerMeta}>
            {displayType !== 'note' && (
              <View style={[styles.typeChip, { backgroundColor: withAlpha(typeColor, 0.14) }]}>
                <ThemedText type="small" style={[styles.typeChipText, { color: typeColor }]}>
                  {typeConfig.label}
                </ThemedText>
              </View>
            )}
            <ThemedText type="small" themeColor="textMuted">
              {isTemplate ? '' : `${formatDate(displayDate)} · `}{wordCount} {wordCount === 1 ? 'word' : 'words'}
            </ThemedText>
          </View>
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
          {!isTemplate && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMoodPicker(!showMoodPicker);
              }}
              style={styles.headerIconButton}
            >
              <IconMoodHappy size={20} color={selectedMood ? theme.primary : theme.tint} />
            </Pressable>
          )}
        </View>
      </ThemedView>

      {/* Mood Picker */}
      {showMoodPicker && !isTemplate && (
        <View style={[styles.moodContainer, { borderBottomColor: theme.border }]}>
          <MoodPicker selected={selectedMood} onSelect={journalState.setMood} />
        </View>
      )}

      {/* Editor */}
      <View style={styles.editorContainer}>
        <MarkdownEditor
          value={content}
          onChange={setContent}
          placeholder={typeConfig.placeholder}
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
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  typeChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Spacing.one,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    textTransform: 'capitalize',
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
