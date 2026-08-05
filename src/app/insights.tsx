import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChevronLeft, IconStar, IconFlame, IconFileText, IconBook2, IconTrophy } from '@tabler/icons-react-native';

import { LineChart } from '@/components/insights/line-chart';
import { StatCard } from '@/components/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, contrastText } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  JournalService,
  type Insights,
  type WordCountPoint,
  type MonthlyActivity,
} from '@/services/journal-service';

function monthLabel(month: string): string {
  const d = new Date(month + '-01T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function weekdayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

type WindowDays = 7 | 30 | 90;

export default function InsightsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [history, setHistory] = useState<WordCountPoint[]>([]);
  const [monthly, setMonthly] = useState<MonthlyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState<WindowDays>(30);

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

  const labelInterval = windowDays === 90 ? 7 : windowDays === 30 ? 3 : 1;
  const barData = history
    .filter((_, i) => i >= history.length - windowDays)
    .map((p, i) => ({
      label:
        windowDays <= 7
          ? weekdayLabel(p.date)
          : i % labelInterval === 0 || i === windowDays - 1
            ? p.date.slice(5)
            : '',
      value: p.words,
    }));

  const maxWords = Math.max(...barData.map((d) => d.value), 1);

  const monthlyBars = monthly
    .slice()
    .reverse()
    .map((m) => ({ label: monthLabel(m.month), value: m.words }));

  const maxMonthly = Math.max(...monthlyBars.map((d) => d.value), 1);

  if (loading) {
    return (
      <ThemedView style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.textMuted} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + 6 }]}>
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
            <StatCard icon={<IconFileText size={20} />} value={insights.totalEntries} label="Entries" style={styles.statCard} />
            <StatCard icon={<IconBook2 size={20} />} color={theme.accent} value={insights.totalWords} label="Total Words" style={styles.statCard} />
            <StatCard icon={<IconFlame size={20} />} color={theme.notification} value={`${insights.currentStreak}d`} label="Streak" style={styles.statCard} />
            <StatCard icon={<IconTrophy size={20} />} color={theme.primary} value={`${insights.longestStreak}d`} label="Best Streak" style={styles.statCard} />
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.sectionCard}>
          <ThemedView style={styles.sectionHeader}>
            <ThemedText type="subtitle">Daily Words</ThemedText>
            <ThemedView style={styles.windowRow}>
              {([7, 30, 90] as const).map((w) => (
                <Pressable
                  key={w}
                  onPress={() => setWindowDays(w)}
                  style={[
                    styles.windowBtn,
                    {
                      backgroundColor: windowDays === w ? theme.primary : 'transparent',
                      borderColor: windowDays === w ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    themeColor={windowDays === w ? 'text' : 'textSecondary'}
                    style={{ color: windowDays === w ? contrastText(theme.primary) : undefined }}
                  >
                    {w}d
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>
          <LineChart data={barData} max={maxWords} showValues={windowDays === 7} />
        </ThemedView>

        {monthlyBars.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">Monthly Words</ThemedText>
            <LineChart data={monthlyBars} max={maxMonthly} height={100} />
          </ThemedView>
        )}

        {insights && insights.bestDayOfWeek !== '-' && (
          <ThemedView type="backgroundElement" style={styles.sectionCard}>
            <ThemedText type="subtitle">Writing Habits</ThemedText>
            <ThemedView type="backgroundSelected" style={styles.habitCard}>
              <IconStar size={24} color={theme.accent} />
              <ThemedText type="default" style={styles.habitText}>
                Most productive on <ThemedText type="default" style={{ fontWeight: '600' }}>{insights.bestDayOfWeek}</ThemedText>
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundSelected" style={styles.habitCard}>
              <IconFlame size={24} color={theme.notification} />
              <ThemedText type="default" style={styles.habitText}>
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
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    gap: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Spacing.two,
  },
  statCard: {
    width: '48%',
  },
  sectionCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
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
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  habitText: {
    flex: 1,
  },
});
