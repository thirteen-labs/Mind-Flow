import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemePicker } from '@/components/theme-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/hooks/use-settings';

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
  const { settings, loading, update } = useSettings();

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
});
