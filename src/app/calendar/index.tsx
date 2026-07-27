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
const HEAT_WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function heatColor(count: number, max: number, isDark: boolean): string {
  if (count === 0) return isDark ? '#1C1C1E' : '#E8E8E8';
  const intensity = count / Math.max(max, 1);
  if (intensity < 0.25) return isDark ? '#0D4429' : '#B7E4C7';
  if (intensity < 0.5) return isDark ? '#1B6B3A' : '#74C69D';
  if (intensity < 0.75) return isDark ? '#2E8B4E' : '#40916C';
  return isDark ? '#4ADE80' : '#1B4332';
}

export default function CalendarScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set());
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
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

  useEffect(() => {
    JournalService.getYearHeatmap(db, year).then(setHeatmap).catch(() => {});
  }, [db, year]);

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
    router.push(`/calendar/${dateStr}` as any);
  }, [year, month]);

  const heatmapDates = useMemo(() => {
    const dates: { date: string; day: number }[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push({ date: ds, day: d.getDay() });
    }
    return dates;
  }, [year]);

  const heatmapMax = Math.max(...Object.values(heatmap), 1);

  const heatmapWeeks: { date: string; count: number }[][] = useMemo(() => {
    const weeks: { date: string; count: number }[][] = [];
    let week: { date: string; count: number }[] = [];
    const firstDay = new Date(year, 0, 1).getDay();
    for (let i = 0; i < ((firstDay + 6) % 7); i++) week.push({ date: '', count: 0 });
    for (const hd of heatmapDates) {
      week.push({ date: hd.date, count: heatmap[hd.date] ?? 0 });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push({ date: '', count: 0 });
      weeks.push(week);
    }
    return weeks;
  }, [heatmap, heatmapDates, year]);

  const streakCount = stats?.streak ?? 0;

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

        <ThemedView style={[styles.heatmapCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.heatmapHeader}>
            <SymbolView name="flame.fill" size={16} tintColor={theme.notification} />
            <ThemedText type="default" style={{ fontWeight: '600' }}>
              {streakCount > 0 ? `${streakCount}-day streak` : 'No active streak'}
            </ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.heatmapScroll}>
            <View style={styles.heatmapContent}>
              <View style={styles.heatmapLabels}>
                {HEAT_WEEKDAYS.map((d, i) => (
                  <ThemedText key={i} type="small" themeColor="textMuted" style={styles.heatmapLabel}>
                    {d}
                  </ThemedText>
                ))}
              </View>
              <View style={styles.heatmapGrid}>
                {heatmapWeeks.map((week, wi) => (
                  <View key={wi} style={styles.heatmapWeek}>
                    {week.map((cell, ci) => {
                      if (!cell.date) return <View key={ci} style={styles.heatmapCell} />;
                      return (
                        <Pressable
                          key={ci}
                          onPress={() => router.push(`/calendar/${cell.date}` as any)}
                          style={[
                            styles.heatmapCell,
                            {
                              backgroundColor: heatColor(cell.count, heatmapMax, theme.isDark),
                              borderRadius: 3,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.heatmapFooter}>
            <ThemedText type="small" themeColor="textMuted">Less</ThemedText>
            <View style={[styles.heatmapDot, { backgroundColor: heatColor(0, 1, theme.isDark) }]} />
            <View style={[styles.heatmapDot, { backgroundColor: heatColor(1, 5, theme.isDark) }]} />
            <View style={[styles.heatmapDot, { backgroundColor: heatColor(2, 5, theme.isDark) }]} />
            <View style={[styles.heatmapDot, { backgroundColor: heatColor(4, 5, theme.isDark) }]} />
            <View style={[styles.heatmapDot, { backgroundColor: heatColor(5, 5, theme.isDark) }]} />
            <ThemedText type="small" themeColor="textMuted">More</ThemedText>
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
  heatmapCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  heatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  heatmapScroll: {
    marginLeft: -Spacing.two,
  },
  heatmapContent: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  heatmapLabels: {
    width: 24,
    justifyContent: 'flex-start',
    gap: 4,
    paddingTop: 2,
  },
  heatmapLabel: {
    height: 12,
    fontSize: 9,
    lineHeight: 12,
  },
  heatmapGrid: {
    flexDirection: 'row',
    gap: 3,
  },
  heatmapWeek: {
    gap: 3,
  },
  heatmapCell: {
    width: 12,
    height: 12,
  },
  heatmapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  heatmapDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
