import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService, type JournalEntry } from '@/services/journal-service';

export default function NoteViewerScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const loadEntry = useCallback(async (entryDate: string) => {
    setLoading(true);
    try {
      const journal = await JournalService.getJournalByDate(db, entryDate);
      setEntry(journal);
      setIsFavorite(false);
      setIsPinned(false);
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
        title: `Journal Entry - ${entry.date}`,
      });
    } catch {
      // Share cancelled
    }
  }, [entry]);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (entry) {
      router.push(`/reading?date=${entry.date}`);
    }
  }, [entry]);

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
    Alert.alert('Export', 'Export functionality coming soon');
  }, [entry]);

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
            router.back();
          }} style={styles.backButton}>
            <SymbolView name="chevron.left" size={20} tintColor={theme.text} />
          </Pressable>
          <ThemedText type="default" numberOfLines={1} style={styles.headerTitle}>
            {entry.content.split('\n')[0] || 'Journal Entry'}
          </ThemedText>
          <Pressable onPress={handleEdit} style={styles.editButton}>
            <SymbolView name="pencil" size={18} tintColor={theme.tint} />
          </Pressable>
        </ThemedView>
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
        <ScrollView
          contentContainerStyle={styles.contentPadding}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="default" style={styles.content}>
            {entry.content}
          </ThemedText>
        </ScrollView>
      </Animated.View>

      {/* Action Bar */}
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <ThemedView style={[styles.actionBar, { borderTopColor: theme.border }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsFavorite(!isFavorite);
            }}
            style={[styles.actionButton, isFavorite && styles.actionButtonActive]}
          >
            <SymbolView
              name={isFavorite ? "star.fill" : "star"}
              size={20}
              tintColor={isFavorite ? theme.warning : theme.textMuted}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsPinned(!isPinned);
            }}
            style={[styles.actionButton, isPinned && styles.actionButtonActive]}
          >
            <SymbolView
              name={isPinned ? "pin.fill" : "pin"}
              size={20}
              tintColor={isPinned ? theme.tint : theme.textMuted}
            />
          </Pressable>

          <Pressable onPress={handleShare} style={styles.actionButton}>
            <SymbolView name="square.and.arrow.up" size={20} tintColor={theme.textMuted} />
          </Pressable>

          <Pressable onPress={handleExport} style={styles.actionButton}>
            <SymbolView name="doc.text" size={20} tintColor={theme.textMuted} />
          </Pressable>

          <Pressable onPress={handleDuplicate} style={styles.actionButton}>
            <SymbolView name="doc.on.doc" size={20} tintColor={theme.textMuted} />
          </Pressable>

          <Pressable onPress={handleDelete} style={styles.actionButton}>
            <SymbolView name="trash" size={20} tintColor={theme.error} />
          </Pressable>
        </ThemedView>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
