import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  max?: number;
}

export function BarChart({ data, height = 120, max }: BarChartProps) {
  const theme = useTheme();
  const chartMax = max ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.container}>
      {data.map((point, i) => {
        const barHeight = (point.value / chartMax) * height;
        return (
          <View key={i} style={styles.barCol}>
            <View style={[styles.barWrapper, { height }]}>
              <ThemedText type="small" themeColor="textMuted" style={styles.value}>
                {point.value > 0 ? point.value : ''}
              </ThemedText>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(barHeight, 2),
                    backgroundColor: theme.primary,
                    opacity: point.value > 0 ? 0.8 : 0.15,
                  },
                ]}
              />
            </View>
            <ThemedText
              type="small"
              themeColor="textMuted"
              style={styles.label}
              numberOfLines={1}
            >
              {point.label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <ThemedView type="backgroundElement" style={statStyles.card}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
    paddingTop: Spacing.three,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  value: {
    fontSize: 9,
    marginBottom: 2,
  },
  bar: {
    width: '60%',
    borderRadius: 3,
  },
  label: {
    fontSize: 8,
    marginTop: Spacing.one,
    textAlign: 'center',
  },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
});
