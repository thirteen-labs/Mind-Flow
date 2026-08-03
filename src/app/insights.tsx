import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { IconChevronLeft, IconStar, IconFlame } from '@tabler/icons-react-native';

import { BarChart, StatCard } from '@/components/insights/bar-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  JournalService,
  type Insights,
  type WordCountPoint,
  type MonthlyActivity,
} from '@/services/journal-service';

function monthLabel(month: string): string {
  const d = new Date(month + '-01T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function weekdayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

export default function InsightsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [history, setHistory] = useState<WordCountPoint[]>([]);
  const [monthly, setMonthly] = useState<MonthlyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      JournalService.getInsights(db),
      JournalService.getWordCountHistory(db, 90),
      JournalService.getMonthlyActivity(db),
    ]).then(([i, h, m]) => {
      if (!mounted) return;
      setInsights(i);
      setHistory(h);
      setMonthly(m);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [db]);

  const barData = history
    .filter((_, i) => i >= history.length - window)
    .map((p) => ({ label: window <= 7 ? weekdayLabel(p.date) : p.date.slice(5), value: p.words }));

  const maxWords = Math.max(...barData.map((d) => d.value), 1);

  const monthlyBars = monthly
    .slice()
    .reverse()
    .map((m) => ({ label: monthLabel(m.month), value: m.words }));

  const maxMonthly = Math.max(...monthlyBars.map((d) => d.value), 1);

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.textMuted} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ThemedView style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <IconChevronLeft size={18} color={theme.text} />
        </Pressable>
        <ThemedText type="title">Insights</ThemedText>
      </ThemedView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {insights && (
          <ThemedView style={styles.statsRow}>
            <StatCard label="Entries" value={insights.totalEntries} />
            <StatCard label="Total Words" value={insights.totalWords} />
            <StatCard label="Streak" value={`${insights.currentStreak}d`} />
            <StatCard label="Best Streak" value={`${insights.longestStreak}d`} />
          </ThemedView>
        )}

        <ThemedView style={styles.section}>
          <ThemedView style={styles.sectionHeader}>
            <ThemedText type="subtitle">Daily Words</ThemedText>
            <ThemedView style={styles.windowRow}>
              {([7, 30, 90] as const).map((w) => (
                <Pressable
                  key={w}
                  onPress={() => setWindow(w)}
                  style={[
                    styles.windowBtn,
                    {
                      backgroundColor: window === w ? theme.primary : 'transparent',
                      borderColor: window === w ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    themeColor={window === w ? 'text' : 'textSecondary'}
                    style={{ color: window === w ? '#FFFFFF' : undefined }}
                  >
                    {w}d
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>
          <BarChart data={barData} max={maxWords} />
        </ThemedView>

        {monthlyBars.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Monthly Words</ThemedText>
            <BarChart data={monthlyBars} max={maxMonthly} height={100} />
          </ThemedView>
        )}

        {insights && insights.bestDayOfWeek !== '-' && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Writing Habits</ThemedText>
            <ThemedView type="backgroundElement" style={styles.habitCard}>
              <IconStar size={24} color={theme.accent} />
              <ThemedText type="default">
                Most productive on <ThemedText type="default" style={{ fontWeight: '600' }}>{insights.bestDayOfWeek}</ThemedText>
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.habitCard}>
              <IconFlame size={24} color={theme.notification} />
              <ThemedText type="default">
                Longest streak: <ThemedText type="default" style={{ fontWeight: '600' }}>{insights.longestStreak} days</ThemedText>
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.five,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  windowRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  windowBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
});
