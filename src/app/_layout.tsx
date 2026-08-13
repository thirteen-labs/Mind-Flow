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

  // Once the React tree has committed its first frame (lock screen or app),
  // hide the native splash. The AnimatedSplashOverlay handles the branded
  // blue transition on top independently, so this is safe to do here.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
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

  // While not ready, render nothing so the native splash stays covering the
  // screen. We only reveal the app (which hides the native splash itself via
  // AnimatedSplashOverlay) once fonts are actually available.
  if (!appReady) return null;

  return (
    <SQLiteProvider databaseName="mindflow.db" onInit={migrateDbIfNeeded} onError={onDatabaseError}>
      <AppContent />
    </SQLiteProvider>
  );
}
