import { useState } from 'react';
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
import {
  IconBell,
  IconBook2,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCloud,
  IconContrast,
  IconDeviceFloppy,
  IconFileText,
  IconFingerprint,
  IconFlame,
  IconInfoCircle,
  IconMoonStars,
  IconPlus,
  IconSearch,
  IconSun,
  IconTypography,
} from '@tabler/icons-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemePicker } from '@/components/theme-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, contrastText } from '@/constants/theme';
import { useTheme, useThemeManager } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';
import { BackupService } from '@/services/backup-service';

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
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={styles.settingInfo}>
        <View style={[styles.settingIcon, { backgroundColor: theme.surfaceVariant }]}>{icon}</View>
        <View style={styles.settingText}>
          <ThemedText type="default" numberOfLines={1}>{label}</ThemedText>
          {description && (
            <ThemedText type="small" themeColor="textMuted">
              {description}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.settingControl}>{children}</View>
    </View>
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
        <IconCheck size={18} color={theme.tint} />
      </Pressable>
    </View>
  );
}

function TemplatesTab() {
  const theme = useTheme();
  const [templates] = useState<{ id: string; name: string; description: string; isDefault: boolean }[]>([]);

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
      <ThemedView style={styles.tabContentContainer}>
        {templates.map((template, index) => (
          <Animated.View key={template.id} entering={FadeInDown.delay(index * 50).springify()}>
            <Pressable
              style={[styles.templateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.templateHeader}>
                <IconFileText size={20} color={theme.tint} />
                <ThemedText type="default" style={styles.templateName}>{template.name}</ThemedText>
                {template.isDefault && (
                  <View style={[styles.defaultBadge, { backgroundColor: theme.tint }]}>
                    <ThemedText type="small" style={[styles.defaultBadgeText, { color: contrastText(theme.tint) }]}>Default</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText type="small" themeColor="textMuted">{template.description}</ThemedText>
            </Pressable>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Pressable style={[styles.createButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <IconPlus size={18} color={theme.tint} />
            <ThemedText type="default" themeColor="tint">Create Template</ThemedText>
          </Pressable>
        </Animated.View>
      </ThemedView>
    </ScrollView>
  );
}

function TagsTab() {
  const theme = useTheme();
  const [tags] = useState<{ id: string; name: string; color: string; count: number }[]>([]);
  const [newTagName, setNewTagName] = useState('');

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
      <ThemedView style={styles.tabContentContainer}>
        {/* Search/Create Input */}
        <View style={[styles.tagInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <IconSearch size={16} color={theme.textMuted} />
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
            <IconPlus size={18} color={theme.tint} />
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
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
      <ThemedView style={styles.tabContentContainer}>
        <SettingRow
          icon={<IconBell size={18} color={theme.text} />}
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
                <IconChevronRight size={14} color={theme.textMuted} />
              </Pressable>
            </View>

            <View style={styles.reminderField}>
              <ThemedText type="small" themeColor="textSecondary">Repeat</ThemedText>
              <Pressable style={[styles.reminderValue, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="default">Does not repeat</ThemedText>
                <IconChevronRight size={14} color={theme.textMuted} />
              </Pressable>
            </View>

            <Pressable style={[styles.saveButton, { backgroundColor: theme.primary }]}>
              <IconCheck size={16} color={contrastText(theme.primary)} />
              <ThemedText type="default" style={[styles.saveButtonText, { color: contrastText(theme.primary) }]}>Save</ThemedText>
            </Pressable>
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { followSystem, setFollowSystem } = useThemeManager();
  const { settings, loading, update } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('themes');
  const [backingUp, setBackingUp] = useState(false);

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
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 6 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <ThemedView style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backAction}>
          <IconChevronLeft size={20} color={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
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
                    activeTab === tab.key && { color: contrastText(theme.primary) },
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
            <ThemedView style={[styles.settingsGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <SettingRow
                icon={<IconContrast size={18} color={theme.tint} />}
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
            </ThemedView>
            <ThemePicker />

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings/fonts' as any);
              }}
              style={[styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <IconTypography size={18} color={theme.text} />
              <ThemedText type="default">Fonts</ThemedText>
              <IconChevronRight size={14} color={theme.textMuted} />
            </Pressable>
          </Animated.View>
        )}

        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'tags' && <TagsTab />}
        {activeTab === 'reminders' && <RemindersTab />}

        {/* Common Settings */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <SectionHeader label="Notifications" />

          <ThemedView style={[styles.settingsGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SettingRow
              icon={<IconSun size={18} color={theme.tint} />}
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
              <View style={[styles.timeRow, { borderBottomColor: theme.border }]}>
                <ThemedText type="default" themeColor="textSecondary">Time</ThemedText>
                <TimePicker
                  hour={settings.morningReminderHour}
                  minute={settings.morningReminderMinute}
                  onChange={(h, m) => update({ morningReminderHour: h, morningReminderMinute: m })}
                />
              </View>
            )}

            <SettingRow
              icon={<IconMoonStars size={18} color={theme.tint} />}
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
              <View style={[styles.timeRow, { borderBottomColor: theme.border }]}>
                <ThemedText type="default" themeColor="textSecondary">Time</ThemedText>
                <TimePicker
                  hour={settings.eveningReminderHour}
                  minute={settings.eveningReminderMinute}
                  onChange={(h, m) => update({ eveningReminderHour: h, eveningReminderMinute: m })}
                />
              </View>
            )}

            <SettingRow
              icon={<IconFlame size={18} color={theme.tint} />}
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
          </ThemedView>

          <SectionHeader label="Security" />
          <ThemedView style={[styles.settingsGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SettingRow
              icon={<IconFingerprint size={18} color={theme.tint} />}
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
          </ThemedView>

          <SectionHeader label="Data" />
          <Pressable
            onPress={handleBackup}
            disabled={backingUp}
            style={[styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <IconDeviceFloppy size={18} color={theme.text} />
            <ThemedText type="default">{backingUp ? 'Exporting...' : 'Export Database'}</ThemedText>
            <IconChevronRight size={14} color={theme.textMuted} />
          </Pressable>
          <ThemedText type="small" themeColor="textMuted" style={styles.actionHint}>
            Export your journal database as a SQLite file for safekeeping
          </ThemedText>

          <SectionHeader label="Cloud Sync" />

          <ThemedView style={[styles.settingsGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SettingRow
              icon={<IconCloud size={18} color={theme.tint} />}
              label="Google Drive backup"
              description="Coming soon — automatic cloud backup"
            >
              <View style={[styles.badge, { backgroundColor: theme.surfaceVariant }]}>
                <ThemedText type="small" themeColor="textMuted">Soon</ThemedText>
              </View>
            </SettingRow>
          </ThemedView>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/settings/about' as any);
            }}
            style={[styles.actionRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          >
            <IconInfoCircle size={18} color={theme.text} />
            <ThemedText type="default">About MindFlow</ThemedText>
            <IconChevronRight size={14} color={theme.textMuted} />
          </Pressable>

          <ThemedView style={[styles.settingsGroup, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SettingRow icon={<IconBook2 size={18} color={theme.tint} />} label="Writing">
              <ThemedText type="small" themeColor="textSecondary">
                Journals stored locally on device
              </ThemedText>
            </SettingRow>
          </ThemedView>
        </Animated.View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: 6,
  },
  container: {
    flex: 1,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  backAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half,
    alignSelf: 'flex-start',
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
  settingsGroup: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
    borderCurve: 'continuous',
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
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
    minWidth: 0,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    gap: Spacing.half,
    flex: 1,
    flexShrink: 1,
  },
  settingControl: {
    marginLeft: Spacing.two,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 66,
    paddingRight: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    marginTop: Spacing.one,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
    borderCurve: 'continuous',
  },
  saveButtonText: {
    fontWeight: '600',
  },  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
});
