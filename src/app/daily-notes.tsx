import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { IconChevronLeft, IconChevronRight, IconCalendarEvent, IconFileText, IconPlus } from '@tabler/icons-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService, type JournalEntry } from '@/services/journal-service';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
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

export default function DailyNotesScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const entries = await JournalService.getJournalsByDateRange(db, startDate, endDate);
      setEntries(entries);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [db, year, month, daysInMonth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries();
  }, [currentDate, loadEntries]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  const selectDay = useCallback((day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(new Date(year, month, day));
  }, [year, month]);

  const goToToday = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  const renderCalendarDay = useCallback((day: number, index: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasEntry = entries.some(e => e.date === dateStr);
    const isSelected = selectedDate.getDate() === day && 
                      selectedDate.getMonth() === month && 
                      selectedDate.getFullYear() === year;
    const isToday = new Date().getDate() === day && 
                   new Date().getMonth() === month && 
                   new Date().getFullYear() === year;

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
        {hasEntry && (
          <View style={[styles.entryIndicator, isSelected ? { backgroundColor: '#FFFFFF' } : { backgroundColor: theme.tint }]} />
        )}
      </Pressable>
    );
  }, [year, month, selectedDate, entries, theme, selectDay]);

  const renderEntry = useCallback(({ item, index }: { item: JournalEntry; index: number }) => {
    const date = new Date(item.date + 'T00:00:00');
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/reading?date=${item.date}`);
          }}
          style={[styles.entryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.entryHeader}>
            <ThemedText type="small" themeColor="textMuted">{timeStr}</ThemedText>
          </View>
          <ThemedText type="default" numberOfLines={3}>{item.content}</ThemedText>
          <View style={styles.entryFooter}>
            <ThemedText type="small" themeColor="textSecondary">{item.word_count} words</ThemedText>
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [theme]);

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const selectedDateEntries = entries.filter(e => {
    const entryDate = new Date(e.date + 'T00:00:00');
    return entryDate.getDate() === selectedDate.getDate() &&
           entryDate.getMonth() === selectedDate.getMonth() &&
           entryDate.getFullYear() === selectedDate.getFullYear();
  });

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }} style={styles.backButton}>
            <IconChevronLeft size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="title">Daily Notes</ThemedText>
        </ThemedView>
      </Animated.View>

      {/* Calendar */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ThemedView style={[styles.calendarContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <Pressable onPress={() => navigateMonth('prev')} style={styles.navButton}>
              <IconChevronLeft size={20} color={theme.text} />
            </Pressable>
            <View style={styles.monthTitleContainer}>
              <ThemedText type="default" style={styles.monthTitle}>
                {MONTHS[month]} {year}
              </ThemedText>
            </View>
            <Pressable onPress={() => navigateMonth('next')} style={styles.navButton}>
              <IconChevronRight size={20} color={theme.text} />
            </Pressable>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {DAYS_OF_WEEK.map((day, index) => (
              <ThemedText key={index} type="small" themeColor="textMuted" style={styles.dayHeader}>
                {day}
              </ThemedText>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <View key={index} style={styles.dayContainer}>
                {day ? renderCalendarDay(day, index) : <View style={styles.emptyDay} />}
              </View>
            ))}
          </View>

          {/* Today Button */}
          <Pressable onPress={goToToday} style={[styles.todayButton, { backgroundColor: theme.backgroundElement }]}>
            <IconCalendarEvent size={14} color={theme.tint} />
            <ThemedText type="small" themeColor="tint">Today</ThemedText>
          </Pressable>
        </ThemedView>
      </Animated.View>

      {/* Entries List */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <View style={styles.entriesHeader}>
          <ThemedText type="default" style={styles.entriesTitle}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            {selectedDateEntries.length} {selectedDateEntries.length === 1 ? 'entry' : 'entries'}
          </ThemedText>
        </View>
      </Animated.View>

      <FlatList
        data={selectedDateEntries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.entriesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.emptyState}>
              <IconFileText size={48} color={theme.textMuted} />
              <ThemedText type="default" themeColor="textSecondary">
                No entries for this day
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Tap the + button to create one
              </ThemedText>
            </Animated.View>
          ) : null
        }
      />

      {/* FAB */}
      <Animated.View entering={FadeInRight.delay(400).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/reading?date=${selectedDate.toISOString().split('T')[0]}`);
          }}
          style={[styles.fab, { backgroundColor: theme.primary }]}
        >
          <IconPlus size={24} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
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
    gap: Spacing.three,
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
  calendarContainer: {
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontWeight: '600',
    fontSize: 16,
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
  },
  dayContainer: {
    width: '14.28%',
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
  emptyDay: {
    width: 32,
    height: 32,
  },
  dayText: {
    fontSize: 14,
  },
  entryIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
    borderCurve: 'continuous',
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  entriesTitle: {
    fontWeight: '600',
  },
  entriesList: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  entryCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.two,
    gap: Spacing.two,
    borderCurve: 'continuous',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
});
