import { Tabs } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

const HIDE_TAB_BAR = () => null;

/**
 * Keeps a real `Tabs` navigator for the three primary destinations so each one
 * preserves its own scroll position and — critically — the writer's unsaved
 * buffer when the user detours to Home or Library and comes back.
 *
 * The tab bar itself renders nothing: navigation is driven from the top bar
 * (`TopBar`) and the sidebar (`NotesSidebar`).
 */
export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
      }}
      tabBar={HIDE_TAB_BAR}
      backBehavior="history"
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="writer" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}