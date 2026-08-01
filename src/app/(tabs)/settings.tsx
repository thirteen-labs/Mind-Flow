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
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import * as LocalAuthentication from 'expo-local-authentication';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemePicker } from '@/components/theme-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme, useThemeManager } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { BackupService } from '@/services/backup-service';
import { CloudSyncService, type BackupInterval } from '@/services/sync/cloud-sync-service';

type SettingsTab = 'themes' | 'templates' | 'tags' | 'reminders';

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

function TemplatesTab() {
  const theme = useTheme();
  const [templates] = useState([
    { id: '1', name: 'Daily Journal', description: 'Default template for daily entries', isDefault: true },
    { id: '2', name: 'Meeting Notes', description: 'Template for meeting notes', isDefault: false },
    { id: '3', name: 'Project Plan', description: 'Template for project plans', isDefault: false },
  ]);

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.tabContentContainer}>
        {templates.map((template, index) => (
          <Animated.View key={template.id} entering={FadeInDown.delay(index * 50).springify()}>
            <Pressable
              style={[styles.templateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.templateHeader}>
                <SymbolView name="doc.text" size={20} tintColor={theme.tint} />
                <ThemedText type="default" style={styles.templateName}>{template.name}</ThemedText>
                {template.isDefault && (
                  <View style={[styles.defaultBadge, { backgroundColor: theme.tint }]}>
                    <ThemedText type="small" style={styles.defaultBadgeText}>Default</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText type="small" themeColor="textMuted">{template.description}</ThemedText>
            </Pressable>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Pressable style={[styles.createButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <SymbolView name="plus" size={18} tintColor={theme.tint} />
            <ThemedText type="default" themeColor="tint">Create Template</ThemedText>
          </Pressable>
        </Animated.View>
      </ThemedView>
    </ScrollView>
  );
}

function TagsTab() {
  const theme = useTheme();
  const [tags] = useState([
    { id: '1', name: 'Personal', color: '#007AFF', count: 12 },
    { id: '2', name: 'Work', color: '#FF9500', count: 8 },
    { id: '3', name: 'Ideas', color: '#34C759', count: 5 },
    { id: '4', name: 'Study', color: '#AF52DE', count: 3 },
    { id: '5', name: 'Health', color: '#FF3B30', count: 2 },
  ]);
  const [newTagName, setNewTagName] = useState('');

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.tabContentContainer}>
        {/* Search/Create Input */}
        <View style={[styles.tagInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SymbolView name="magnifyingglass" size={16} tintColor={theme.textMuted} />
          <TextInput
            value={newTagName}
            onChangeText={setNewTagName}
            placeholder="Search or create tag..."
            placeholderTextColor={theme.textMuted}
            style={[styles.tagInputField, { color: theme.text }]}
          />
        </View>

        {/* Tags List */}
        <ThemedView style={[styles.tagsList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {tags.map((tag, index) => (
            <Animated.View key={tag.id} entering={FadeInDown.delay(index * 50).springify()}>
              <Pressable
                style={[styles.tagItem, index < tags.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
              >
                <View style={[styles.tagColor, { backgroundColor: tag.color }]} />
                <ThemedText type="default" style={styles.tagName}>{tag.name}</ThemedText>
                <ThemedText type="small" themeColor="textMuted">{tag.count}</ThemedText>
              </Pressable>
            </Animated.View>
          ))}
        </ThemedView>

        {/* Add New Tag */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Pressable style={[styles.createButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <SymbolView name="plus" size={18} tintColor={theme.tint} />
            <ThemedText type="default" themeColor="tint">New Tag</ThemedText>
          </Pressable>
        </Animated.View>
      </ThemedView>
    </ScrollView>
  );
}

function RemindersTab() {
  const theme = useTheme();
  const { settings, loading } = useSettings();
  const [reminderEnabled, setReminderEnabled] = useState(false);

  if (loading || !settings) {
    return (
      <ThemedView style={styles.tabContent}>
        <ThemedText type="default" themeColor="textMuted">Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.tabContentContainer}>
        <SettingRow
          icon="bell"
          label="Enable Reminder"
          description="Get reminded to write"
        >
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </SettingRow>

        {reminderEnabled && (
          <>
            <View style={styles.reminderField}>
              <ThemedText type="small" themeColor="textSecondary">Reminder At</ThemedText>
              <Pressable style={[styles.reminderValue, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="default">Date & Time</ThemedText>
                <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
              </Pressable>
            </View>

            <View style={styles.reminderField}>
              <ThemedText type="small" themeColor="textSecondary">Repeat</ThemedText>
              <Pressable style={[styles.reminderValue, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="default">Does not repeat</ThemedText>
                <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
              </Pressable>
            </View>

            <Pressable style={[styles.saveButton, { backgroundColor: theme.primary }]}>
              <ThemedText type="default" style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { followSystem, setFollowSystem } = useThemeManager();
  const { settings, loading, update } = useSettings();
  const db = useSQLiteContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('themes');
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBackingUp(true);
    try {
      await BackupService.backupDatabase();
    } catch (e) {
      Alert.alert('Backup failed', e instanceof Error ? e.message : 'Unknown error');
    }
    setBackingUp(false);
  };

  const handleAppLock = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await CloudSyncService.saveState(db, { enabled: v });
    setSyncEnabled(v);
    if (v) {
      const phrase = await CloudSyncService.setupRecoveryPhrase(db);
      setRecoveryPhrase(phrase);
      setShowRecovery(true);
    }
  };

  const handleSetInterval = async (interval: BackupInterval) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await CloudSyncService.setBackupInterval(db, interval);
    setSyncInterval(interval);
  };

  const handleSyncNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'themes', label: 'Themes' },
    { key: 'templates', label: 'Templates' },
    { key: 'tags', label: 'Tags' },
    { key: 'reminders', label: 'Reminders' },
  ];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.container}>
        <Animated.View entering={FadeInDown.springify()}>
          <ThemedText type="title">Settings</ThemedText>
          <ThemedText type="subtitle" themeColor="textSecondary">
            Preferences & customization
          </ThemedText>
        </Animated.View>

        {/* Settings Tabs */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key);
                }}
                style={[
                  styles.tab,
                  activeTab === tab.key && { backgroundColor: theme.primary },
                ]}
              >
                <ThemedText
                  type="small"
                  style={[
                    styles.tabText,
                    activeTab === tab.key && { color: '#FFFFFF' },
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Tab Content */}
        {activeTab === 'themes' && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
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

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings/fonts' as any);
              }}
              style={[styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <SymbolView name="textformat" size={18} tintColor={theme.text} />
              <ThemedText type="default">Fonts</ThemedText>
              <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
            </Pressable>
          </Animated.View>
        )}

        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'tags' && <TagsTab />}
        {activeTab === 'reminders' && <RemindersTab />}

        {/* Common Settings */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
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

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings/about' as any);
            }}
            style={[styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <SymbolView name="info.circle" size={18} tintColor={theme.text} />
            <ThemedText type="default">About MindFlow</ThemedText>
            <SymbolView name="chevron.right" size={14} tintColor={theme.textMuted} />
          </Pressable>

          <SettingRow icon="character.book.closed" label="Writing">
            <ThemedText type="small" themeColor="textSecondary">
              Journals stored locally on device
            </ThemedText>
          </SettingRow>
        </Animated.View>
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
  tabBar: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  tabText: {
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
  },
  tabContentContainer: {
    gap: Spacing.three,
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
    borderCurve: 'continuous',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
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
    borderCurve: 'continuous',
  },
  // Template styles
  templateCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
    borderCurve: 'continuous',
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  templateName: {
    fontWeight: '600',
    flex: 1,
  },
  defaultBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    borderCurve: 'continuous',
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Tag styles
  tagInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  tagInputField: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter',
  },
  tagsList: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  tagColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  tagName: {
    flex: 1,
    fontWeight: '500',
  },
  // Reminder styles
  reminderField: {
    gap: Spacing.one,
  },
  reminderValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
    borderCurve: 'continuous',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
});
