import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';

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
  const [syncProgress, setSyncProgress] = useState(0);
  const [destinations, setDestinations] = useState([
    { id: '1', type: 'google-drive' as const, name: 'Google Drive', connected: false },
    { id: '2', type: 'local' as const, name: 'Local Storage', connected: true },
  ]);

  const loadBackupStatus = useCallback(async () => {
    try {
      const state = await CloudSyncService.getState(db);
      setAutoBackupEnabled(state.enabled);
      // In a real implementation, you'd get the last backup date
      setLastBackup(new Date(Date.now() - 24 * 60 * 60 * 1000)); // Yesterday
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
    setSyncProgress(0);
    
    // Simulate backup progress
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await BackupService.backupDatabase();
      setLastBackup(new Date());
      Alert.alert('Backup complete', 'Your data has been backed up successfully');
    } catch (e) {
      Alert.alert('Backup failed', e instanceof Error ? e.message : 'Could not complete backup');
    } finally {
      setSyncing(false);
      setSyncProgress(0);
      clearInterval(progressInterval);
    }
  }, []);

  const handleRestore = useCallback(() => {
    Alert.alert(
      'Restore',
      'Are you sure you want to restore from backup? This will replace your current data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real implementation, you'd show a file picker
              Alert.alert('Restore', 'Restore functionality coming soon');
            } catch (e) {
              Alert.alert('Restore failed', e instanceof Error ? e.message : 'Could not restore');
            }
          },
        },
      ]
    );
  }, []);

  const handleToggleDestination = useCallback((destinationId: string) => {
    setDestinations(prev => prev.map(d => 
      d.id === destinationId ? { ...d, connected: !d.connected } : d
    ));
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
          <SymbolView name="chevron.left" size={20} tintColor={theme.text} />
        </Pressable>
        <ThemedText type="title">Backup & Restore</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <SymbolView name="xmark" size={20} tintColor={theme.text} />
        </Pressable>
      </ThemedView>

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
            <SymbolView name="arrow.up.doc" size={20} tintColor="#FFFFFF" />
          )}
          <ThemedText type="default" style={styles.actionButtonText}>
            {syncing ? `Backing up... ${syncProgress}%` : 'Back Up Now'}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleRestore}
          style={[styles.actionButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <SymbolView name="arrow.down.doc" size={20} tintColor={theme.text} />
          <ThemedText type="default">Restore from Backup</ThemedText>
        </Pressable>
      </ThemedView>

      {/* Backup Progress */}
      {syncing && (
        <ThemedView style={[styles.progressContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.progressHeader}>
            <SymbolView name="cloud" size={20} tintColor={theme.tint} />
            <ThemedText type="default" themeColor="textSecondary">Syncing your data...</ThemedText>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.progressFill, { width: `${syncProgress}%`, backgroundColor: theme.primary }]} />
          </View>
          <ThemedText type="small" themeColor="textMuted" style={styles.progressText}>
            Please don&apos;t close the app.
          </ThemedText>
        </ThemedView>
      )}

      {/* Backup Destinations */}
      <ThemedView style={styles.destinationsSection}>
        <ThemedText type="default" style={styles.sectionTitle}>Backup to</ThemedText>
        
        {destinations.map((destination) => (
          <Pressable
            key={destination.id}
            onPress={() => handleToggleDestination(destination.id)}
            style={[styles.destinationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.destinationInfo}>
              <SymbolView 
                name={destination.type === 'google-drive' ? 'cloud' : 'externaldrive'} 
                size={24} 
                tintColor={theme.text} 
              />
              <View>
                <ThemedText type="default" style={styles.destinationName}>{destination.name}</ThemedText>
                <ThemedText type="small" themeColor={destination.connected ? 'success' : 'textMuted'}>
                  {destination.connected ? 'Connected' : 'Not connected'}
                </ThemedText>
              </View>
            </View>
            <SymbolView 
              name={destination.connected ? "checkmark.circle.fill" : "plus.circle"} 
              size={24} 
              tintColor={destination.connected ? theme.success : theme.textMuted} 
            />
          </Pressable>
        ))}
      </ThemedView>

      {/* Syncing Modal */}
      {syncing && (
        <View style={styles.syncingOverlay}>
          <ThemedView style={[styles.syncingModal, { backgroundColor: theme.surface }]}>
            <ThemedText type="default" style={styles.syncingTitle}>Syncing / Backup Status</ThemedText>
            <SymbolView name="cloud" size={48} tintColor={theme.tint} />
            <ThemedText type="default" themeColor="textSecondary">Syncing your data...</ThemedText>
            <View style={[styles.progressBar, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.progressFill, { width: `${syncProgress}%`, backgroundColor: theme.primary }]} />
            </View>
            <ThemedText type="small" themeColor="textMuted">
              Please don&apos;t close the app.
            </ThemedText>
          </ThemedView>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  destinationsSection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  destinationName: {
    fontWeight: '500',
  },
  syncingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncingModal: {
    width: '80%',
    padding: Spacing.four,
    borderRadius: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  syncingTitle: {
    fontWeight: '600',
    fontSize: 18,
  },
});
