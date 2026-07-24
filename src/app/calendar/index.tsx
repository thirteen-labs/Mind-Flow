import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { JournalService } from '@/services/journal-service';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<{ entries: number; streak: number; totalWords: number } | null>(null);

  const monthStart = useMemo(() => {
    return `${year}-${String(month + 1).padStart(2, '0')}-01`;
  }, [year, month]);

  const monthEnd = useMemo(() => {
    const last = new Date(year, month + 1, 0);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  }, [year, month]);

  useEffect(() => {
    JournalService.getEntryDatesInRange(db, monthStart, monthEnd).then((dates) => {
      setEntryDates(new Set(dates));
    }).catch(() => {});
  }, [db, monthStart, monthEnd]);

  useEffect(() => {
    JournalService.getJournalStats(db).then((s) => {
      setStats(s);
    }).catch(() => {});
  }, [db]);

  const goBack = useCallback(() => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }, [month, setYear]);

  const goForward = useCallback(() => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }, [month, setYear]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = todayDate();

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const handleDayPress = useCallback((day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (entryDates.has(dateStr) || dateStr === today) {
      router.push(`/reading?date=${dateStr}`);
    } else {
      router.push(`/(tabs)/writer?date=${dateStr}`);
    }
  }, [year, month, entryDates]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title">Calendar</ThemedText>

        {stats && (
          <ThemedView style={styles.statsRow}>
            <ThemedView style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="title" style={styles.statNumber}>{stats.entries}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">Entries</ThemedText>
            </ThemedView>
            <ThemedView style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="title" style={styles.statNumber}>{stats.streak}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">Day Streak</ThemedText>
            </ThemedView>
            <ThemedView style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="title" style={styles.statNumber}>{stats.totalWords}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">Total Words</ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        <ThemedView style={[styles.calendar, { borderColor: theme.border }]}>
          <ThemedView style={styles.monthNav}>
            <Pressable onPress={goBack} style={styles.navButton}>
              <SymbolView name="chevron.left" size={18} tintColor={theme.text} />
            </Pressable>
            <ThemedText type="default" style={styles.monthTitle}>
              {MONTHS[month]} {year}
            </ThemedText>
            <Pressable onPress={goForward} style={styles.navButton}>
              <SymbolView name="chevron.right" size={18} tintColor={theme.text} />
            </Pressable>
          </ThemedView>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d) => (
              <ThemedView key={d} style={styles.weekdayCell}>
                <ThemedText type="small" themeColor="textMuted">{d}</ThemedText>
              </ThemedView>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (day === null) return <View key={`e-${di}`} style={styles.dayCell} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasEntry = entryDates.has(dateStr);
                const isToday = dateStr === today;
                return (
                  <Pressable
                    key={day}
                    onPress={() => handleDayPress(day)}
                    style={[
                      styles.dayCell,
                      isToday && { borderColor: theme.primary, borderWidth: 1, borderRadius: Spacing.two },
                    ]}
                  >
                    <ThemedText
                      type="default"
                      style={[
                        styles.dayText,
                        isToday && { color: theme.primary, fontWeight: '700' },
                      ]}
                    >
                      {day}
                    </ThemedText>
                    {hasEntry && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
                    {!hasEntry && !isToday && <View style={styles.dotPlaceholder} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ThemedView>

        <ThemedView style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
            <ThemedText type="small" themeColor="textMuted">Has entry</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.textMuted, opacity: 0.3 }]} />
            <ThemedText type="small" themeColor="textMuted">No entry</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSquare, { borderColor: theme.primary, borderWidth: 1 }]} />
            <ThemedText type="small" themeColor="textMuted">Today</ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={[styles.tipCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <SymbolView name="lightbulb" size={18} tintColor={theme.tint} />
          <View style={styles.tipText}>
            <ThemedText type="default" style={{ fontWeight: '500' }}>Streak Tracker</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              Tap a day to read or write. Green dots show days with entries.
            </ThemedText>
          </View>
        </ThemedView>
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.half,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  calendar: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.two,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.two,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.one + 2,
    minHeight: 44,
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 6,
    height: 6,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingVertical: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  tipText: {
    flex: 1,
    gap: Spacing.half,
  },
});
