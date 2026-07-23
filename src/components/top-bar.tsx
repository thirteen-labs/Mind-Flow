import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TopBar() {
  const theme = useTheme();
  const logoSource = theme.isDark
    ? require('@/assets/images/name-white.png')
    : require('@/assets/images/name-black.png');

  return (
    <ThemedView type="background" style={styles.container}>
      <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/(tabs)/search')}>
          <SymbolView name="magnifyingglass" size={22} tintColor={theme.textSecondary} />
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/settings')}>
          <SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} size={22} tintColor={theme.textSecondary} />
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
  },
  logo: {
    height: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
