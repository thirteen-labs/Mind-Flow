import { StyleSheet, View, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppTabs from '@/components/app-tabs';
import NotesSidebar from '@/components/notes-sidebar';
import TopBar from '@/components/top-bar';
import { useTheme } from '@/hooks/use-theme';
import { useSidebar } from '@/store/sidebar';

function LayoutContent() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isOpen, close } = useSidebar();

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <TopBar />
      <AppTabs />
      <NotesSidebar visible={isOpen} onClose={close} />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LayoutContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});