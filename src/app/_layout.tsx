import { useEffect, useState } from 'react';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppLockGate } from '@/components/app-lock-gate';
import { ThemeProvider as MindFlowThemeProvider } from '@/components/theme-provider';
import { migrateDbIfNeeded } from '@/services/database';
import { NotificationService } from '@/services/notification-service';

SplashScreen.preventAutoHideAsync();

function onDatabaseError(e: Error) {
  console.warn('Database init failed:', e.message);
}

function AppContent() {
  const db = useSQLiteContext();

  useEffect(() => {
    NotificationService.setup();
  }, []);

  return (
    <AppLockGate db={db}>
      <MindFlowThemeProvider>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="onboarding"
            options={{ animation: 'fade', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="daily-notes"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="note-viewer"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="backup-restore"
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="insights"
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="reading"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="templates"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="export"
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="calendar/index"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="event/[id]"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="calendar/[date]"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings/fonts"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings/index"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings/about"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="search"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="canvas"
            options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
          />
        </Stack>
      </MindFlowThemeProvider>
    </AppLockGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter': require('../../assets/fonts/Inter-VariableFont_opsz,wght.ttf'),
    'JetBrains Mono': require('../../assets/fonts/JetBrainsMono-VariableFont_wght.ttf'),
    'Playfair Display': require('../../assets/fonts/PlayfairDisplay-VariableFont_wght.ttf'),
  });

  // Safety net: if fonts never resolve (or error), proceed with fallback
  // fonts rather than staying stuck on the native splash indefinitely.
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceReady(true), 10000);
    return () => clearTimeout(t);
  }, []);

  const appReady = fontsLoaded || fontError || forceReady;

  // Guaranteed native splash hide. Once the app tree is ready we hide the
  // native splash immediately, and as a hard safety net we ALSO hide it after
  // a short delay no matter what the subtree does (slow/failed DB init, app
  // lock screen, a thrown render error, etc.). This is the single source of
  // truth for hiding the native splash so the app can never get stuck on it.
  useEffect(() => {
    if (!appReady) return;
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      SplashScreen.hideAsync().catch(() => {});
    };
    hide();
    const t = setTimeout(hide, 4000);
    return () => clearTimeout(t);
  }, [appReady]);

  // While not ready, render nothing so the native splash stays covering the
  // screen. We only reveal the app once fonts are actually available.
  if (!appReady) return null;

  return (
    <SQLiteProvider databaseName="mindflow.db" onInit={migrateDbIfNeeded} onError={onDatabaseError}>
      <AppContent />
    </SQLiteProvider>
  );
}
