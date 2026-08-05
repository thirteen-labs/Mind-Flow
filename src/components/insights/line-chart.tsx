import { StyleSheet, View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { withAlpha, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  max?: number;
  showValues?: boolean;
}

export function LineChart({ data, height = 120, max, showValues = true }: LineChartProps) {
  const theme = useTheme();
  const chartMax = max ?? Math.max(...data.map((d) => d.value), 1);
  const labelSpace = showValues ? 14 : 0;
  const chartHeight = Math.max(height - labelSpace - 8, 10);
  const chartWidth = 100;
  const padding = 4;

  const points = data.map((point, i) => {
    const x = data.length === 1
      ? chartWidth / 2
      : padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
    const y = point.value > 0
      ? chartHeight - padding - ((point.value / chartMax) * (chartHeight - padding * 2))
      : chartHeight - padding;
    return { x, y };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points[0]?.x ?? 0},${chartHeight - padding} ${linePoints} ${points[points.length - 1]?.x ?? 0},${chartHeight - padding}`;

  const showLabels = data.length <= 12;

  return (
    <View style={styles.container}>
      <View style={[styles.chartArea, { height: chartHeight }]}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
          <Polyline
            points={areaPoints}
            fill={withAlpha(theme.primary, 0.08)}
            stroke="none"
          />
          <Polyline
            points={linePoints}
            fill="none"
            stroke={theme.primary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={data.length > 30 ? 0 : 2.5}
              fill={theme.primary}
            />
          ))}
        </Svg>
        {showValues && data.length <= 14 && points.map((p, i) => {
          if (data[i].value === 0) return null;
          return (
            <ThemedText
              key={i}
              type="small"
              themeColor="textMuted"
              style={[
                styles.value,
                {
                  position: 'absolute',
                  left: `${(p.x / chartWidth) * 100}%`,
                  top: p.y - 14,
                  transform: [{ translateX: -10 }],
                },
              ]}
              numberOfLines={1}
            >
              {data[i].value}
            </ThemedText>
          );
        })}
      </View>
      {showLabels && (
        <View style={styles.labelRow}>
          {data.map((point, i) => (
            <View key={i} style={styles.labelCol}>
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
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.two,
  },
  chartArea: {
    position: 'relative',
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  value: {
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    width: 20,
  },
  labelRow: {
    flexDirection: 'row',
    height: 14,
    marginTop: 2,
  },
  labelCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },
});
