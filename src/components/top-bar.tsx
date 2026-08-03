import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { IconCalendar, IconSearch, IconSettings2 } from '@tabler/icons-react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TopBar() {
  const theme = useTheme();

  return (
    <ThemedView type="background" style={styles.container}>
      <ThemedText type="default" style={styles.appName}>MindFlow</ThemedText>
      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/calendar')}>
          <IconCalendar size={22} color={theme.textSecondary} />
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/search')}>
          <IconSearch size={22} color={theme.textSecondary} />
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/settings')}>
          <IconSettings2 size={22} color={theme.textSecondary} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    zIndex: 10,
    elevation: 10,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
