import { ScrollView, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function PlannerScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title">Planner</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          Visual thinking space
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.empty}>
        <SymbolView
          name="square.grid.3x3.topleft.filled"
          size={56}
          tintColor={theme.textMuted}
        />
        <ThemedText type="default" themeColor="textSecondary">
          Infinite Canvas
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.emptyBody}>
          Plan projects, connect ideas, and organize your thoughts visually. Coming soon.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.one,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  emptyBody: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});
