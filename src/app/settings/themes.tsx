import { ScrollView, StyleSheet } from 'react-native';

import { ThemePicker } from '@/components/theme-picker';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function ThemesScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <ThemedView style={styles.container}>
        <ThemePicker />
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
    paddingVertical: Spacing.four,
  },
});
