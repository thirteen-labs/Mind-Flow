import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { IconChevronLeft, IconPencil, IconTrash, IconCalendar, IconClock, IconMapPin, IconRepeat, IconBell, IconNotes, IconLink, IconCheck, IconX } from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PlannerService, type PlannerEvent, type RepeatType } from '@/services/planner-service';
import { NotificationService } from '@/services/notification-service';
import { openJournal } from '@/services/journal-nav';

const REMINDER_OPTIONS = [
  { label: 'None', value: null },
  { label: '5 min before', value: 5 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];
const REPEAT_OPTIONS: { label: string; value: RepeatType }[] = [
  { label: 'Never', value: 'never' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<PlannerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [repeat, setRepeat] = useState<RepeatType>('never');
  const [reminder, setReminder] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const reloadEvent = useCallback(async () => {
    if (!id) return;
    const result = await PlannerService.getEventById(db, id);
    setEvent(result);
  }, [db, id]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        const result = await PlannerService.getEventById(db, id);
        if (mounted) setEvent(result);
      } catch {
        if (mounted) setEvent(null);
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [db, id]);

  const startEditing = useCallback(() => {
    if (!event) return;
    setTitle(event.title);
    setLocation(event.location || '');
    setIsAllDay(event.isAllDay);
    setDate(event.date);
    setStartTime(event.startTime || '10:00');
    setEndTime(event.endTime || '11:00');
    setRepeat(event.repeat);
    setReminder(event.reminder);
    setNotes(event.notes || '');
    setIsEditing(true);
  }, [event]);

  const handleSave = useCallback(async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      await PlannerService.updateEvent(db, id, {
        title: title || 'Untitled Event',
        date,
        startTime: isAllDay ? null : startTime,
        endTime: isAllDay ? null : endTime,
        isAllDay,
        location: location || null,
        notes: notes || null,
        repeat,
        reminder,
      });

      if (event.notificationId) {
        await NotificationService.cancelEventReminder(event.notificationId);
      }

      if (reminder && startTime) {
        const notifId = await NotificationService.scheduleEventReminder(
          id, title || 'Untitled Event', date, startTime, reminder
        );
        await PlannerService.updateEvent(db, id, { notificationId: notifId || null });
      } else {
        await PlannerService.updateEvent(db, id, { notificationId: null });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      await reloadEvent();
    } catch {
      Alert.alert('Error', 'Could not save event');
    }
    setSaving(false);
  }, [db, event, id, title, location, isAllDay, date, startTime, endTime, repeat, reminder, notes, reloadEvent]);

  const handleDelete = useCallback(() => {
    if (!event) return;
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (event.notificationId) {
              await NotificationService.cancelEventReminder(event.notificationId);
            }
            await PlannerService.deleteEvent(db, event.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch {
            Alert.alert('Error', 'Could not delete event');
          }
        },
      },
    ]);
  }, [db, event]);

  if (loading) {
    return (
      <ThemedView style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.textMuted} />
      </ThemedView>
    );
  }

  if (!event) {
    return (
      <ThemedView style={[styles.centered, { paddingTop: insets.top }]}>
        <ThemedText type="default" themeColor="textMuted">Event not found</ThemedText>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="default" themeColor="tint">Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const renderDetailRow = (icon: React.ReactNode, label: string, value: string) => (
    <View style={[styles.detailRow, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailText}>
        <ThemedText type="small" themeColor="textMuted">{label}</ThemedText>
        <ThemedText type="default">{value}</ThemedText>
      </View>
    </View>
  );

  const reminderLabel = REMINDER_OPTIONS.find(o => o.value === event.reminder)?.label || 'None';
  const repeatLabel = REPEAT_OPTIONS.find(o => o.value === event.repeat)?.label || 'Never';

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerAction} hitSlop={8}>
          <IconChevronLeft size={20} color={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
        <ThemedText type="default" style={styles.headerTitle}>
          {isEditing ? 'Edit Event' : 'Event Details'}
        </ThemedText>
        {isEditing ? (
          <Pressable onPress={startEditing} style={styles.headerAction} hitSlop={8}>
            <IconX size={20} color={theme.text} />
          </Pressable>
        ) : (
          <Pressable onPress={startEditing} style={styles.headerAction} hitSlop={8}>
            <IconPencil size={18} color={theme.tint} />
          </Pressable>
        )}
      </View>

      {isEditing ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.editBody}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary">Title</ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary">Location (optional)</ThemedText>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Add location"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </View>

            <View style={styles.toggleRow}>
              <ThemedText type="default">All Day</ThemedText>
              <Pressable
                onPress={() => setIsAllDay(prev => !prev)}
                style={[styles.toggle, isAllDay && { backgroundColor: theme.primary }]}
              >
                <View style={[styles.toggleThumb, isAllDay && { marginLeft: 20 }]} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary">Date</ThemedText>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </View>

            {!isAllDay && (
              <View style={styles.timeRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText type="small" themeColor="textSecondary">Start Time</ThemedText>
                  <TextInput
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText type="small" themeColor="textSecondary">End Time</ThemedText>
                  <TextInput
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary">Repeat</ThemedText>
              <View style={styles.chipRow}>
                {REPEAT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRepeat(opt.value)}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      repeat === opt.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                  >
                    <ThemedText type="small" style={repeat === opt.value ? { color: '#FFFFFF' } : undefined}>
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary">Reminder</ThemedText>
              <View style={styles.chipRow}>
                {REMINDER_OPTIONS.map((opt) => (
                  <Pressable
                    key={String(opt.value)}
                    onPress={() => setReminder(opt.value)}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      reminder === opt.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                  >
                    <ThemedText type="small" style={reminder === opt.value ? { color: '#FFFFFF' } : undefined}>
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary">Notes</ThemedText>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={() => { Keyboard.dismiss(); setIsEditing(false); }}
              style={[styles.footerButton, { backgroundColor: theme.backgroundElement }]}
              disabled={saving}
            >
              <ThemedText type="default" themeColor="textMuted">Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.footerButton, styles.footerPrimary, { backgroundColor: theme.primary }]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <IconCheck size={18} color="#FFFFFF" />
                  <ThemedText type="default" style={styles.footerPrimaryText}>Save</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleBlock}>
              <View style={[styles.colorBar, { backgroundColor: event.color || theme.tint }]} />
              <ThemedText type="title" style={styles.eventTitle}>{event.title}</ThemedText>
            </View>

            <View style={styles.details}>
              {renderDetailRow(<IconCalendar size={18} color={theme.tint} />, 'Date', formatDate(event.date))}
              {renderDetailRow(
                <IconClock size={18} color={theme.tint} />,
                'Time',
                event.isAllDay ? 'All day' : `${formatTime(event.startTime || '')} - ${formatTime(event.endTime || '')}`
              )}
              {event.location ? renderDetailRow(<IconMapPin size={18} color={theme.tint} />, 'Location', event.location) : null}
              {renderDetailRow(<IconRepeat size={18} color={theme.tint} />, 'Repeat', repeatLabel)}
              {renderDetailRow(<IconBell size={18} color={theme.tint} />, 'Reminder', reminderLabel)}
              {event.notes ? renderDetailRow(<IconNotes size={18} color={theme.tint} />, 'Notes', event.notes) : null}
            </View>

            {event.journalId ? (
              <Pressable
                onPress={() => openJournal({ entryId: event.journalId! })}
                style={[styles.journalButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              >
                <IconLink size={16} color={theme.tint} />
                <ThemedText type="default" themeColor="tint">Open linked journal entry</ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={handleDelete}
              style={[styles.footerButton, { backgroundColor: theme.backgroundElement }]}
            >
              <IconTrash size={18} color={theme.error} />
              <ThemedText type="default" themeColor="error">Delete</ThemedText>
            </Pressable>
            <Pressable
              onPress={startEditing}
              style={[styles.footerButton, styles.footerPrimary, { backgroundColor: theme.primary }]}
            >
              <IconPencil size={18} color="#FFFFFF" />
              <ThemedText type="default" style={styles.footerPrimaryText}>Edit</ThemedText>
            </Pressable>
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  backButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
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
    minWidth: 72,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  colorBar: {
    width: 6,
    height: 44,
    borderRadius: 3,
    borderCurve: 'continuous',
  },
  eventTitle: {
    flex: 1,
    fontSize: 28,
    lineHeight: 36,
  },
  details: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderCurve: 'continuous',
  },
  detailIcon: {
    width: 28,
    alignItems: 'center',
  },
  detailText: {
    flex: 1,
    gap: Spacing.half,
  },
  journalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  editBody: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  inputGroup: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
    borderCurve: 'continuous',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderCurve: 'continuous',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderCurve: 'continuous',
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  footerPrimary: {
    backgroundColor: undefined,
  },
  footerPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
