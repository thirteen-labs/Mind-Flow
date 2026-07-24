import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import * as LocalAuthentication from 'expo-local-authentication';

import { ThemePicker } from '@/components/theme-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme, useThemeManager } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { BackupService } from '@/services/backup-service';
import { CloudSyncService, type BackupInterval } from '@/services/sync/cloud-sync-service';

function timeLabel(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <ThemedText type="small" themeColor="tint" style={styles.sectionHeader}>
      {label}
    </ThemedText>
  );
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: string;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.settingRow, { borderBottomColor: theme.border }]}
    >
      <View style={styles.settingInfo}>
        <SymbolView name={icon as any} size={18} tintColor={theme.text} />
        <View style={styles.settingText}>
          <ThemedText type="default">{label}</ThemedText>
          {description && (
            <ThemedText type="small" themeColor="textMuted">
              {description}
            </ThemedText>
          )}
        </View>
      </View>
      {children}
    </ThemedView>
  );
}

function TimePicker({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [hStr, setHStr] = useState(String(hour));
  const [mStr, setMStr] = useState(String(minute).padStart(2, '0'));

  if (!editing) {
    return (
      <Pressable onPress={() => setEditing(true)}>
        <ThemedText type="default" themeColor="tint">
          {timeLabel(hour, minute)}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={styles.timeEditor}>
      <TextInput
        value={hStr}
        onChangeText={setHStr}
        keyboardType="number-pad"
        style={[styles.timeInput, { color: theme.text, borderColor: theme.border }]}
        maxLength={2}
      />
      <ThemedText type="default">:</ThemedText>
      <TextInput
        value={mStr}
        onChangeText={setMStr}
        keyboardType="number-pad"
        style={[styles.timeInput, { color: theme.text, borderColor: theme.border }]}
        maxLength={2}
      />
      <Pressable
        onPress={() => {
          const h = Math.min(23, Math.max(0, parseInt(hStr, 10) || 0));
          const m = Math.min(59, Math.max(0, parseInt(mStr, 10) || 0));
          onChange(h, m);
          setEditing(false);
        }}
      >
        <SymbolView name="checkmark" size={18} tintColor={theme.tint} />
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { followSystem, setFollowSystem } = useThemeManager();
  const { settings, loading, update } = useSettings();
  const db = useSQLiteContext();
  const [backingUp, setBackingUp] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState<BackupInterval>('manual');
  const [syncing, setSyncing] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');

  useEffect(() => {
    (async () => {
      const state = await CloudSyncService.getState(db);
      setSyncEnabled(state.enabled);
      setSyncInterval(state.interval);
    })();
  }, [db]);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await BackupService.backupDatabase();
    } catch (e) {
      Alert.alert('Backup failed', e instanceof Error ? e.message : 'Unknown error');
    }
    setBackingUp(false);
  };

  const handleAppLock = async () => {
    try {
      const available = await LocalAuthentication.hasHardwareAsync();
      if (!available) {
        Alert.alert('Not available', 'Biometric authentication is not available on this device');
        return;
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert('Not set up', 'Please enroll in biometric authentication in your device settings first');
        return;
      }
      const newVal = !settings!.appLockEnabled;
      await update({ appLockEnabled: newVal });
    } catch {
      Alert.alert('Error', 'Could not check biometric availability');
    }
  };

  const handleToggleSync = async (v: boolean) => {
    await CloudSyncService.saveState(db, { enabled: v });
    setSyncEnabled(v);
    if (v) {
      const phrase = await CloudSyncService.setupRecoveryPhrase(db);
      setRecoveryPhrase(phrase);
      setShowRecovery(true);
    }
  };

  const handleSetInterval = async (interval: BackupInterval) => {
    await CloudSyncService.setBackupInterval(db, interval);
    setSyncInterval(interval);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await CloudSyncService.backupToDrive(db);
      Alert.alert('Backup complete', 'Your data has been backed up to Google Drive');
    } catch (e) {
      Alert.alert('Backup failed', e instanceof Error ? e.message : 'Could not complete backup');
    }
    setSyncing(false);
  };

  if (loading || !settings) {
    return (
      <ThemedView style={{ flex: 1, padding: Spacing.four }}>
        <ThemedText type="title">Settings</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title">Settings</ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary">
          Preferences & customization
        </ThemedText>

        <SectionHeader label="Appearance" />
        <SettingRow
          icon="circle.righthalf.filled"
          label="Follow system theme"
          description="Automatically switch theme with light/dark mode"
        >
          <Switch
            value={followSystem}
            onValueChange={setFollowSystem}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>
        <ThemePicker />

        <SectionHeader label="Notifications" />

        <SettingRow
          icon="sun.max"
          label="Morning reminder"
          description={settings.morningReminderEnabled ? `Daily at ${timeLabel(settings.morningReminderHour, settings.morningReminderMinute)}` : 'Start your day with a journal prompt'}
        >
          <Switch
            value={settings.morningReminderEnabled}
            onValueChange={(v) => update({ morningReminderEnabled: v })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>

        {settings.morningReminderEnabled && (
          <View style={styles.timeRow}>
            <ThemedText type="default" themeColor="textSecondary">Time</ThemedText>
            <TimePicker
              hour={settings.morningReminderHour}
              minute={settings.morningReminderMinute}
              onChange={(h, m) => update({ morningReminderHour: h, morningReminderMinute: m })}
            />
          </View>
        )}

        <SettingRow
          icon="moon.stars"
          label="Evening reminder"
          description={settings.eveningReminderEnabled ? `Daily at ${timeLabel(settings.eveningReminderHour, settings.eveningReminderMinute)}` : 'Reflect on your day'}
        >
          <Switch
            value={settings.eveningReminderEnabled}
            onValueChange={(v) => update({ eveningReminderEnabled: v })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>

        {settings.eveningReminderEnabled && (
          <View style={styles.timeRow}>
            <ThemedText type="default" themeColor="textSecondary">Time</ThemedText>
            <TimePicker
              hour={settings.eveningReminderHour}
              minute={settings.eveningReminderMinute}
              onChange={(h, m) => update({ eveningReminderHour: h, eveningReminderMinute: m })}
            />
          </View>
        )}

        <SettingRow
          icon="flame"
          label="Streak reminder"
          description="Remind you to write if you haven't by evening"
        >
          <Switch
            value={settings.streakReminderEnabled}
            onValueChange={(v) => update({ streakReminderEnabled: v })}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>

        <SectionHeader label="Security" />
        <SettingRow
          icon="faceid"
          label="App lock"
          description="Require biometric or passcode to open the app"
        >
          <Switch
            value={settings.appLockEnabled}
            onValueChange={handleAppLock}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>

        <SectionHeader label="Data" />
        <Pressable
          onPress={handleBackup}
          disabled={backingUp}
          style={[styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <SymbolView name="externaldrive" size={18} tintColor={theme.text} />
          <ThemedText type="default">{backingUp ? 'Exporting...' : 'Export Database'}</ThemedText>
          <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
        </Pressable>
        <ThemedText type="small" themeColor="textMuted" style={styles.actionHint}>
          Export your journal database as a SQLite file for safekeeping
        </ThemedText>

        <SectionHeader label="Cloud Sync" />

        <SettingRow
          icon="cloud"
          label="Google Drive backup"
          description="Automatically back up your journals to Google Drive"
        >
          <Switch
            value={syncEnabled}
            onValueChange={handleToggleSync}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>

        {showRecovery && recoveryPhrase && (
          <ThemedView style={[styles.recoveryCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.primary }]}>
            <SymbolView name="exclamationmark.shield" size={20} tintColor={theme.primary} />
            <ThemedView style={{ flex: 1, gap: Spacing.one }}>
              <ThemedText type="default" style={{ fontWeight: '600' }}>Recovery Phrase</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Write down these words. You need them to restore your data.
              </ThemedText>
              <ThemedText type="default" style={[styles.recoveryPhrase, { color: theme.primary }]}>
                {recoveryPhrase}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        {syncEnabled && (
          <>
            <SettingRow
              icon="clock.arrow.circlepath"
              label="Backup interval"
              description={`Current: ${syncInterval === 'manual' ? 'Manual only' : syncInterval}`}
            >
              <View style={{ flexDirection: 'row', gap: Spacing.one }}>
                {(['manual', 'daily', 'weekly', 'monthly'] as BackupInterval[]).map((interval) => (
                  <Pressable
                    key={interval}
                    onPress={() => handleSetInterval(interval)}
                    style={[
                      styles.intervalChip,
                      {
                        backgroundColor: syncInterval === interval ? theme.primary : theme.backgroundElement,
                        borderColor: syncInterval === interval ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: syncInterval === interval ? '#FFFFFF' : theme.text, fontWeight: '500' }}
                    >
                      {interval === 'manual' ? 'Manual' : interval.charAt(0).toUpperCase() + interval.slice(1)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </SettingRow>

            <Pressable
              onPress={handleSyncNow}
              disabled={syncing}
              style={[styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <SymbolView name="arrow.up.doc" size={18} tintColor={theme.text} />
              <ThemedText type="default">{syncing ? 'Backing up...' : 'Back Up Now'}</ThemedText>
            </Pressable>
          </>
        )}

        <SectionHeader label="About" />

        <SettingRow icon="info.circle" label="Version">
          <ThemedText type="default" themeColor="textSecondary">1.0.0</ThemedText>
        </SettingRow>

        <SettingRow icon="character.book.closed" label="Writing">
          <ThemedText type="small" themeColor="textSecondary">
            Journals stored locally on device
          </ThemedText>
        </SettingRow>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  settingText: {
    gap: Spacing.half,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: Spacing.six,
    paddingBottom: Spacing.three,
  },
  timeEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  timeInput: {
    width: 36,
    height: 32,
    borderRadius: Spacing.one,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 15,
    padding: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  actionHint: {
    paddingHorizontal: Spacing.one,
    marginTop: -Spacing.two,
  },
  recoveryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  recoveryPhrase: {
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    lineHeight: 22,
    marginTop: Spacing.one,
  },
  intervalChip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
});
