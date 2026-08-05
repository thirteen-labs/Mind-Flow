import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconDots,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconPencil,
  IconPin,
  IconTrash,
  IconX,
  IconBulb,
  IconCalendarEvent,
  IconBrain,
  type Icon,
} from '@tabler/icons-react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { contrastText, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getNoteName, JournalService, type JournalEntry, type JournalEntryType } from '@/services/journal-service';
import { openJournal } from '@/services/journal-nav';
import { useActiveNoteId } from '@/store/sidebar';

type Section = { title: string; data: JournalEntry[] };

interface SheetAction {
  key: string;
  icon: typeof IconPencil;
  label: string;
  color: string;
  onPress: () => void;
}

const TYPE_ICON: Record<JournalEntryType, Icon> = {
  note: IconFileText,
  idea: IconBulb,
  plan: IconCalendarEvent,
  thought: IconBrain,
};

function typeColor(type: JournalEntryType, theme: ReturnType<typeof useTheme>): string {
  switch (type) {
    case 'idea':
      return theme.warning;
    case 'plan':
      return theme.success;
    case 'thought':
      return theme.secondary;
    default:
      return theme.tint;
  }
}

export default function NotesSidebar({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const activeNoteId = useActiveNoteId();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(Math.round(width * 0.85), 340);

  const [notes, setNotes] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuEntry, setMenuEntry] = useState<JournalEntry | null>(null);
  const [renameEntry, setRenameEntry] = useState<JournalEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = visible ? withSpring(1, { damping: 22, stiffness: 240 }) : withTiming(0, { duration: 180 });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * -panelWidth }],
  }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await JournalService.getSidebarNotes(db);
      setNotes(list);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load();
    }
  }, [visible, load]);

  useEffect(() => {
    if (renameEntry) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRenameValue(getNoteName(renameEntry));
    }
  }, [renameEntry]);

  const sections = useMemo<Section[]>(() => {
    const pinned = notes.filter((n) => n.is_pinned);
    const normal = notes.filter((n) => !n.is_pinned && !n.is_hidden);
    const hidden = notes.filter((n) => !n.is_pinned && n.is_hidden);
    const result: Section[] = [];
    if (pinned.length) result.push({ title: 'Pinned', data: pinned });
    if (normal.length) result.push({ title: 'Notes', data: normal });
    if (hidden.length) result.push({ title: 'Hidden', data: hidden });
    return result;
  }, [notes]);

  const closeSheet = useCallback(() => setMenuEntry(null), []);
  const closeRename = useCallback(() => setRenameEntry(null), []);

  const openViewer = useCallback((entry: JournalEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeSheet();
    onClose();
    router.push(`/reading?id=${entry.id}`);
  }, [closeSheet, onClose]);

  const openEditor = useCallback((entry: JournalEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeSheet();
    openJournal({ entryId: entry.id });
  }, [closeSheet]);

  const handleTogglePin = useCallback(async (entry: JournalEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const newValue = await JournalService.togglePin(db, entry.id);
      setMenuEntry((prev) => (prev ? { ...prev, is_pinned: newValue ? 1 : 0 } : prev));
      await load();
    } catch {
      Alert.alert('Error', 'Could not update pin');
    }
  }, [db, load]);

  const handleToggleHidden = useCallback(async (entry: JournalEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const newValue = !entry.is_hidden;
      await JournalService.setHidden(db, entry.id, newValue);
      setMenuEntry((prev) => (prev ? { ...prev, is_hidden: newValue ? 1 : 0 } : prev));
      await load();
    } catch {
      Alert.alert('Error', 'Could not update note');
    }
  }, [db, load]);

  const handleDelete = useCallback((entry: JournalEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Note',
      `Delete "${getNoteName(entry)}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await JournalService.deleteJournal(db, entry.id);
              closeSheet();
              await load();
            } catch {
              Alert.alert('Error', 'Could not delete note');
            }
          },
        },
      ]
    );
  }, [db, load, closeSheet]);

  const handleRenameSave = useCallback(async () => {
    if (!renameEntry) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const name = renameValue.trim();
    try {
      await JournalService.renameJournal(db, renameEntry.id, name || null);
      closeRename();
      await load();
    } catch {
      Alert.alert('Error', 'Could not rename note');
    }
  }, [db, renameEntry, renameValue, closeRename, load]);

  const actions: SheetAction[] = menuEntry
    ? [
        {
          key: 'rename',
          icon: IconEdit,
          label: 'Rename',
          color: theme.text,
          onPress: () => {
            closeSheet();
            setRenameEntry(menuEntry);
          },
        },
        {
          key: 'viewer',
          icon: IconEye,
          label: 'Open in viewer',
          color: theme.text,
          onPress: () => openViewer(menuEntry),
        },
        {
          key: 'editor',
          icon: IconPencil,
          label: 'Open in editor',
          color: theme.text,
          onPress: () => openEditor(menuEntry),
        },
        {
          key: 'hide',
          icon: IconEyeOff,
          label: menuEntry.is_hidden ? 'Unhide' : 'Hide',
          color: theme.text,
          onPress: () => handleToggleHidden(menuEntry),
        },
        {
          key: 'pin',
          icon: IconPin,
          label: menuEntry.is_pinned ? 'Unpin' : 'Pin to top',
          color: theme.text,
          onPress: () => handleTogglePin(menuEntry),
        },
        {
          key: 'delete',
          icon: IconTrash,
          label: 'Delete',
          color: theme.error,
          onPress: () => handleDelete(menuEntry),
        },
      ]
    : [];

  const renderRow = useCallback(({ item }: { item: JournalEntry }) => {
    const name = getNoteName(item);
    const IconEl = TYPE_ICON[item.entry_type ?? 'note'];
    const isActive = item.id === activeNoteId;
    return (
      <Pressable
        onPress={() => openViewer(item)}
        style={({ pressed }) => [
          styles.row,
          pressed && { backgroundColor: theme.backgroundElement },
          isActive && { backgroundColor: withAlpha(theme.tint, 0.1 ) },
        ]}
      >
        <View style={[styles.rowIcon, { backgroundColor: withAlpha(typeColor(item.entry_type ?? 'note', theme), 0.14) }]}>
          <IconEl size={15} color={typeColor(item.entry_type ?? 'note', theme)} />
        </View>
        <ThemedText type="default" numberOfLines={1} style={styles.rowName}>
          {name}
        </ThemedText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMenuEntry(item);
          }}
          hitSlop={10}
          style={({ pressed }) => [styles.rowDots, pressed && { backgroundColor: theme.backgroundSelected }]}
        >
          <IconDots size={18} color={theme.textMuted} />
        </Pressable>
      </Pressable>
    );
  }, [theme, activeNoteId, openViewer]);

  const renderSectionHeader = useCallback(({ section }: { section: Section }) => (
    <ThemedText type="smallBold" themeColor="textMuted" style={styles.sectionHeader}>
      {section.title}
    </ThemedText>
  ), []);

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.overlay]}
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityViewIsModal={visible}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.45)' }, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { width: panelWidth, backgroundColor: theme.background, borderRightColor: theme.border }, panelStyle]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + Spacing.three }]}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.headerIcon, { backgroundColor: withAlpha(theme.primary, 0.14) }]}>
              <IconFileText size={16} color={theme.primary} />
            </View>
            <View>
              <ThemedText type="default" style={styles.headerTitle}>All Notes</ThemedText>
              <ThemedText type="small" themeColor="textMuted">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.closeButton, pressed && { backgroundColor: theme.backgroundElement }]}
          >
            <IconX size={18} color={theme.textMuted} />
          </Pressable>
        </View>

        {/* List */}
        {loading && notes.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.textMuted} />
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.centered}>
            <ThemedText type="small" themeColor="textMuted">No notes yet</ThemedText>
            <ThemedText type="small" themeColor="textMuted">Write your first note to see it here</ThemedText>
          </View>
        ) : (
          <SectionList
            sections={sections}
            renderItem={renderRow}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </Animated.View>

      {/* Note action sheet */}
      <Modal visible={!!menuEntry} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <Animated.View entering={FadeInDown.springify()}>
              <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
                <ThemedText type="default" numberOfLines={1} style={styles.sheetTitle}>
                  {menuEntry ? getNoteName(menuEntry) : ''}
                </ThemedText>
                <Pressable onPress={closeSheet} hitSlop={8} style={styles.sheetClose}>
                  <IconX size={16} color={theme.textMuted} />
                </Pressable>
              </View>
              {actions.map((action) => (
                <Pressable
                  key={action.key}
                  onPress={action.onPress}
                  style={({ pressed }) => [styles.sheetAction, pressed && { backgroundColor: theme.backgroundElement }]}
                >
                  <action.icon size={19} color={action.color} />
                  <ThemedText
                    type="default"
                    style={[styles.sheetActionLabel, action.key === 'delete' && { color: theme.error }]}
                  >
                    {action.label}
                  </ThemedText>
                </Pressable>
              ))}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename modal */}
      <Modal visible={!!renameEntry} transparent animationType="fade" onRequestClose={closeRename}>
        <Pressable style={styles.renameBackdrop} onPress={closeRename}>
          <Pressable style={[styles.renameCard, { backgroundColor: theme.surface }]}>
            <Animated.View entering={FadeInDown.springify()}>
              <ThemedText type="default" style={styles.renameTitle}>Rename Note</ThemedText>
              <TextInput
                autoFocus
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="Note name"
                placeholderTextColor={theme.textMuted}
                maxLength={80}
                selectTextOnFocus
                onSubmitEditing={handleRenameSave}
                style={[styles.renameInput, { color: theme.text, backgroundColor: theme.backgroundElement, fontFamily: theme.fontFamily }]}
              />
              <View style={styles.renameActions}>
                <Pressable onPress={closeRename} style={({ pressed }) => [styles.renameButton, pressed && { opacity: 0.7 }]}>
                  <ThemedText type="default" themeColor="textMuted">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleRenameSave}
                  style={({ pressed }) => [styles.renameButton, styles.renameSave, { backgroundColor: theme.primary }, pressed && { opacity: 0.85 }]}
                >
                  <ThemedText type="default" style={[styles.renameSaveText, { color: contrastText(theme.primary) }]}>Save</ThemedText>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 100,
  },
  backdrop: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    paddingBottom: Spacing.six,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    flex: 1,
    fontWeight: '500',
  },
  rowDots: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.one,
  },
  sheetTitle: {
    flex: 1,
    fontWeight: '600',
  },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  sheetActionLabel: {
    fontWeight: '500',
  },
  renameCard: {
    marginHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
  },
  renameTitle: {
    fontWeight: '700',
  },
  renameInput: {
    fontSize: 16,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  renameButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  renameSave: {
    minWidth: 88,
    alignItems: 'center',
  },
  renameSaveText: {
    fontWeight: '600',
  },});
