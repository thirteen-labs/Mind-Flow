import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  max?: number;
  showValues?: boolean;
}

export function BarChart({ data, height = 120, max, showValues = true }: BarChartProps) {
  const theme = useTheme();
  const chartMax = max ?? Math.max(...data.map((d) => d.value), 1);
  const labelSpace = showValues ? 14 : 0;
  const maxBarHeight = Math.max(height - labelSpace, 2);

  return (
    <View style={styles.container}>
      {data.map((point, i) => {
        const barHeight = point.value > 0 ? Math.max((point.value / chartMax) * maxBarHeight, 2) : 0;
        return (
          <View key={i} style={styles.barCol}>
            <View
              style={[
                styles.barArea,
                { height, borderBottomColor: theme.border },
              ]}
            >
              {showValues && point.value > 0 && (
                <ThemedText
                  type="small"
                  themeColor="textMuted"
                  style={styles.value}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {point.value}
                </ThemedText>
              )}
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: theme.primary,
                    opacity: point.value > 0 ? 0.85 : 0,
                  },
                ]}
              />
            </View>
            <View style={styles.labelRow}>
              {point.label ? (
                <ThemedText
                  type="small"
                  themeColor="textMuted"
                  style={styles.label}
                  numberOfLines={1}
                >
                  {point.label}
                </ThemedText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.half,
    paddingTop: Spacing.two,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barArea: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  value: {
    fontSize: 9,
    lineHeight: 12,
    marginBottom: 2,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '100%',
  },
  bar: {
    width: '70%',
    borderRadius: 3,
  },
  labelRow: {
    height: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },
});
