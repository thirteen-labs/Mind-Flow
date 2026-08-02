import { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabType = 'day' | 'week' | 'month';

interface PlannerEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  color?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function PlannerScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    location: '',
    isAllDay: false,
    date: formatDate(new Date()),
    startTime: '10:00',
    endTime: '11:00',
    repeat: 'never',
    reminder: '15',
    notes: '',
  });
  const [events, setEvents] = useState<PlannerEvent[]>(() => [
    {
      id: '1',
      title: 'Morning Routine',
      date: formatDate(new Date()),
      startTime: '08:00',
      endTime: '09:00',
      isAllDay: false,
      color: theme.tint,
    },
    {
      id: '2',
      title: 'Work on Project',
      date: formatDate(new Date()),
      startTime: '09:00',
      endTime: '11:00',
      isAllDay: false,
      color: theme.warning,
    },
    {
      id: '3',
      title: 'Meeting with Team',
      date: formatDate(new Date()),
      startTime: '11:00',
      endTime: '12:00',
      isAllDay: false,
      color: theme.success,
    },
    {
      id: '4',
      title: 'Gym',
      date: formatDate(new Date()),
      startTime: '13:00',
      endTime: '14:00',
      isAllDay: false,
      color: theme.error,
    },
  ]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (activeTab === 'day') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      } else if (activeTab === 'week') {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      } else {
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      }
      return newDate;
    });
  }, [activeTab]);

  const goToToday = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  const selectDay = useCallback((day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  }, [currentDate]);

  const handleCreateEvent = useCallback(() => {
    const newEventItem: PlannerEvent = {
      id: String(Date.now()),
      title: newEvent.title || 'New Event',
      date: newEvent.date,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      isAllDay: newEvent.isAllDay,
      color: theme.tint,
    };
    setEvents(prev => [...prev, newEventItem]);
    setShowNewEventModal(false);
    setNewEvent({
      title: '',
      location: '',
      isAllDay: false,
      date: formatDate(new Date()),
      startTime: '10:00',
      endTime: '11:00',
      repeat: 'never',
      reminder: '15',
      notes: '',
    });
  }, [theme]);

  const renderCalendarDay = useCallback((day: number, index: number) => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasEvents = events.some(e => e.date === dateStr);
    const isSelected = selectedDate.getDate() === day &&
                      selectedDate.getMonth() === m &&
                      selectedDate.getFullYear() === y;
    const isToday = new Date().getDate() === day &&
                   new Date().getMonth() === m &&
                   new Date().getFullYear() === y;

    return (
      <Pressable
        key={index}
        onPress={() => selectDay(day)}
        style={[
          styles.calendarDay,
          isSelected && { backgroundColor: theme.primary },
          isToday && !isSelected && { borderColor: theme.tint, borderWidth: 1 },
        ]}
      >
        <ThemedText
          type="small"
          style={[
            styles.dayText,
            isSelected && { color: '#FFFFFF' },
            isToday && !isSelected && { color: theme.tint },
          ]}
        >
          {day}
        </ThemedText>
        {hasEvents && (
          <View style={[styles.eventIndicator, isSelected ? { backgroundColor: '#FFFFFF' } : { backgroundColor: theme.tint }]} />
        )}
      </Pressable>
    );
  }, [currentDate, selectedDate, events, theme, selectDay]);

  const renderTimeSlot = useCallback((hour: number) => {
    const timeStr = `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
    const slotEvents = events.filter(e => {
      const eventHour = parseInt(e.startTime.split(':')[0]);
      return eventHour === hour && e.date === formatDate(selectedDate);
    });

    return (
      <View key={hour} style={[styles.timeSlot, { borderBottomColor: theme.border }]}>
        <ThemedText type="small" themeColor="textMuted" style={styles.timeLabel}>
          {timeStr}
        </ThemedText>
        <View style={styles.timeSlotContent}>
          {slotEvents.map(event => (
            <Pressable
              key={event.id}
              style={[styles.eventBlock, { backgroundColor: event.color || theme.tint }]}
            >
              <ThemedText type="small" style={styles.eventTitle}>{event.title}</ThemedText>
              <ThemedText type="small" style={styles.eventTime}>
                {event.startTime} - {event.endTime}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }, [events, selectedDate, theme]);

  const renderWeekView = useCallback(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      return day;
    });

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekContainer}>
        {weekDays.map((day, index) => {
          const dateStr = formatDate(day);
          const hasEvents = events.some(e => e.date === dateStr);
          const isSelected = selectedDate.toDateString() === day.toDateString();
          const isToday = new Date().toDateString() === day.toDateString();

          return (
            <Pressable
              key={index}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDate(day);
              }}
              style={[
                styles.weekDay,
                isSelected && { backgroundColor: theme.primary },
                isToday && !isSelected && { borderColor: theme.tint, borderWidth: 1 },
              ]}
            >
              <ThemedText type="small" themeColor="textMuted">
                {DAYS_OF_WEEK[day.getDay()]}
              </ThemedText>
              <ThemedText
                type="default"
                style={[
                  styles.weekDayNumber,
                  isSelected && { color: '#FFFFFF' },
                  isToday && !isSelected && { color: theme.tint },
                ]}
              >
                {day.getDate()}
              </ThemedText>
              {hasEvents && (
                <View style={[styles.weekEventIndicator, isSelected ? { backgroundColor: '#FFFFFF' } : { backgroundColor: theme.tint }]} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }, [currentDate, selectedDate, events, theme]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
  ];

  const getDateDisplay = () => {
    if (activeTab === 'day') {
      return selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } else if (activeTab === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return `${MONTHS[month]} ${year}`;
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Planner</ThemedText>
        </ThemedView>
      </Animated.View>

      {/* Tabs */}
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

      {/* Date Navigation */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <View style={styles.dateNavigation}>
          <Pressable onPress={() => navigateDate('prev')} style={styles.navButton}>
            <SymbolView name="chevron.left" size={20} tintColor={theme.text} />
          </Pressable>
          <View style={styles.dateTitleContainer}>
            <ThemedText type="default" style={styles.dateTitle}>
              {getDateDisplay()}
            </ThemedText>
          </View>
          <Pressable onPress={() => navigateDate('next')} style={styles.navButton}>
            <SymbolView name="chevron.right" size={20} tintColor={theme.text} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Calendar Views */}
      {activeTab === 'month' && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <ThemedView style={[styles.calendarContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.dayHeaders}>
              {DAYS_OF_WEEK.map((day, index) => (
                <ThemedText key={index} type="small" themeColor="textMuted" style={styles.dayHeader}>
                  {day}
                </ThemedText>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {Array.from({ length: firstDay }, (_, i) => (
                <View key={`empty-${i}`} style={styles.dayContainer} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => (
                <View key={i} style={styles.dayContainer}>
                  {renderCalendarDay(i + 1, i)}
                </View>
              ))}
            </View>
          </ThemedView>
        </Animated.View>
      )}

      {activeTab === 'week' && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          {renderWeekView()}
        </Animated.View>
      )}

      {/* Today Button */}
      <Animated.View entering={FadeInDown.delay(400).springify()}>
        <Pressable onPress={goToToday} style={[styles.todayButton, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="tint">Today</ThemedText>
        </Pressable>
      </Animated.View>

      {/* Events List */}
      <Animated.View entering={FadeInDown.delay(500).springify()}>
        <View style={styles.eventsHeader}>
          <ThemedText type="default" style={styles.eventsTitle}>
            Events for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </ThemedText>
        </View>
      </Animated.View>

      {activeTab === 'day' ? (
        <ScrollView style={styles.timeSlotsContainer}>
          {HOURS.map(hour => renderTimeSlot(hour))}
        </ScrollView>
      ) : (
        <FlatList
          data={events.filter(e => e.date === formatDate(selectedDate))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.emptyState}>
              <SymbolView name="calendar" size={48} tintColor={theme.textMuted} />
              <ThemedText type="default" themeColor="textSecondary">
                No events for this day
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Tap the + button to create one
              </ThemedText>
            </Animated.View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
              <Pressable style={[styles.eventCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.eventColorBar, { backgroundColor: item.color || theme.tint }]} />
                <View style={styles.eventContent}>
                  <ThemedText type="default" style={styles.eventCardTitle}>{item.title}</ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {item.startTime} - {item.endTime}
                  </ThemedText>
                </View>
              </Pressable>
            </Animated.View>
          )}
        />
      )}

      {/* FAB */}
      <Animated.View entering={FadeInRight.delay(700).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowNewEventModal(true);
          }}
          style={[styles.fab, { backgroundColor: theme.primary }]}
        >
          <SymbolView name="plus" size={24} tintColor="#FFFFFF" />
        </Pressable>
      </Animated.View>

      {/* New Event Modal */}
      <Modal visible={showNewEventModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowNewEventModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <ThemedText type="default" style={styles.modalTitle}>New Plan / Event</ThemedText>
              <Pressable onPress={() => setShowNewEventModal(false)}>
                <SymbolView name="xmark" size={20} tintColor={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <ThemedText type="small" themeColor="textSecondary">Title</ThemedText>
                <TextInput
                  value={newEvent.title}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
                  placeholder="Event title"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" themeColor="textSecondary">Location (optional)</ThemedText>
                <TextInput
                  value={newEvent.location}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, location: text }))}
                  placeholder="Add location"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
              </View>

              <View style={styles.toggleRow}>
                <ThemedText type="default">All Day</ThemedText>
                <Pressable
                  onPress={() => setNewEvent(prev => ({ ...prev, isAllDay: !prev.isAllDay }))}
                  style={[styles.toggle, newEvent.isAllDay && { backgroundColor: theme.primary }]}
                >
                  <View style={[styles.toggleThumb, newEvent.isAllDay && { marginLeft: 20 }]} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" themeColor="textSecondary">Date</ThemedText>
                <TextInput
                  value={newEvent.date}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, date: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
              </View>

              <View style={styles.timeRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText type="small" themeColor="textSecondary">Start Time</ThemedText>
                  <TextInput
                    value={newEvent.startTime}
                    onChangeText={(text) => setNewEvent(prev => ({ ...prev, startTime: text }))}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText type="small" themeColor="textSecondary">End Time</ThemedText>
                  <TextInput
                    value={newEvent.endTime}
                    onChangeText={(text) => setNewEvent(prev => ({ ...prev, endTime: text }))}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" themeColor="textSecondary">Notes</ThemedText>
                <TextInput
                  value={newEvent.notes}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, notes: text }))}
                  placeholder="Add notes"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border }]}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setShowNewEventModal(false)}
                style={[styles.cancelButton, { backgroundColor: theme.backgroundElement }]}
              >
                <ThemedText type="default" themeColor="textMuted">Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleCreateEvent}
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
              >
                <ThemedText type="default" style={styles.saveButtonText}>Save</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.four,
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
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  calendarContainer: {
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  dayHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.two,
  },
  dayHeader: {
    width: 32,
    textAlign: 'center',
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayContainer: {
    width: 32,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  dayText: {
    fontSize: 14,
  },
  eventIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  weekContainer: {
    paddingHorizontal: Spacing.four,
  },
  weekDay: {
    width: 48,
    height: 64,
    borderRadius: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
    borderCurve: 'continuous',
  },
  weekDayNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekEventIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  todayButton: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    marginVertical: Spacing.two,
    borderCurve: 'continuous',
  },
  eventsHeader: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  eventsTitle: {
    fontWeight: '600',
  },
  timeSlotsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  timeSlot: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  timeLabel: {
    width: 60,
    paddingTop: Spacing.two,
  },
  timeSlotContent: {
    flex: 1,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  eventBlock: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderCurve: 'continuous',
  },
  eventTitle: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  eventTime: {
    color: '#FFFFFF',
    opacity: 0.9,
  },
  eventsList: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.two,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  eventColorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  eventCardTitle: {
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: Spacing.four,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontWeight: '600',
    fontSize: 18,
  },
  modalBody: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.one,
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
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.four,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
