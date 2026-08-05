import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatCard({ icon, value, label, color, style }: StatCardProps) {
  const theme = useTheme();
  const tint = color ?? theme.tint;
  const iconNode = isValidElement(icon)
    ? cloneElement(icon as ReactElement<{ color?: string }>, { color: tint })
    : icon;

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.card,
        { borderColor: theme.border },
        style,
      ]}
    >
      <ThemedView style={[styles.iconBubble, { backgroundColor: withAlpha(tint, 0.14) }]}>
        {iconNode}
      </ThemedView>
      <ThemedText
        style={styles.value}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  value: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
});
