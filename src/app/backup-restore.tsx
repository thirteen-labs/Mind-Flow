import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  IconChevronLeft,
  IconX,
  IconUpload,
  IconDownload,
  IconCloud,
} from '@tabler/icons-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BackupService } from '@/services/backup-service';
import { CloudSyncService } from '@/services/sync/cloud-sync-service';

export default function BackupRestoreScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadBackupStatus = useCallback(async () => {
    try {
      const state = await CloudSyncService.getState(db);
      setAutoBackupEnabled(state.enabled);
      setLastBackup(state.lastBackupAt ? new Date(state.lastBackupAt) : null);
    } catch {
      // Silently fail
    }
  }, [db]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBackupStatus();
  }, [loadBackupStatus]);

  const handleBackUpNow = useCallback(async () => {
    setSyncing(true);

    try {
      await BackupService.backupDatabase();
      setLastBackup(new Date());
      Alert.alert('Backup complete', 'Your data has been backed up successfully');
    } catch (e) {
      Alert.alert('Backup failed', e instanceof Error ? e.message : 'Could not complete backup');
    } finally {
      setSyncing(false);
    }
  }, []);

  const handleRestore = useCallback(() => {
    Alert.alert('Coming Soon', 'Restore from backup will be available in a future update.');
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconChevronLeft size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Backup & Restore</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <IconX size={20} color={theme.text} />
        </Pressable>
      </ThemedView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      {/* Backup Status */}
      <ThemedView style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary">Last Backup</ThemedText>
        <ThemedText type="default" style={styles.backupDate}>
          {lastBackup ? formatDate(lastBackup) : 'Never'}
        </ThemedText>
        <ThemedText type="small" themeColor={autoBackupEnabled ? 'success' : 'textMuted'}>
          Auto Backup is {autoBackupEnabled ? 'ON' : 'OFF'}
        </ThemedText>
      </ThemedView>

      {/* Action Buttons */}
      <ThemedView style={styles.actionsContainer}>
        <Pressable
          onPress={handleBackUpNow}
          disabled={syncing}
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
        >
          {syncing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <IconUpload size={20} color="#FFFFFF" />
          )}
          <ThemedText type="default" style={styles.actionButtonText}>
            {syncing ? 'Backing up...' : 'Back Up Now'}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleRestore}
          style={[styles.actionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <IconDownload size={20} color={theme.text} />
          <ThemedText type="default">Restore from Backup</ThemedText>
        </Pressable>
      </ThemedView>

      {/* Syncing Indicator */}
      {syncing && (
        <ThemedView style={[styles.progressContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.progressHeader}>
            <IconCloud size={20} color={theme.tint} />
            <ThemedText type="default" themeColor="textSecondary">Backing up your data...</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textMuted" style={styles.progressText}>
            Please don&apos;t close the app.
          </ThemedText>
        </ThemedView>
      )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 6,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.one,
  },
  backupDate: {
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressContainer: {
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
  },
});
