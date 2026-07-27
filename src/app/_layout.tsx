import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppLockGate } from '@/components/app-lock-gate';
import { ThemeProvider as MindFlowThemeProvider } from '@/components/theme-provider';
import { migrateDbIfNeeded } from '@/services/database';
import { NotificationService } from '@/services/notification-service';

function onDatabaseError(e: Error) {
  console.warn('Database init failed:', e.message);
}

SplashScreen.preventAutoHideAsync();

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
            name="insights"
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="reading"
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
            name="calendar/[date]"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings/fonts"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
          <Stack.Screen
            name="settings/about"
            options={{ animation: 'slide_from_right', presentation: 'card' }}
          />
        </Stack>
      </MindFlowThemeProvider>
    </AppLockGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter': require('../../assets/fonts/Inter-VariableFont_opsz,wght.ttf'),
    'JetBrains Mono': require('../../assets/fonts/JetBrainsMono-VariableFont_wght.ttf'),
    'Playfair Display': require('../../assets/fonts/PlayfairDisplay-VariableFont_wght.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SQLiteProvider databaseName="mindflow.db" onInit={migrateDbIfNeeded} onError={onDatabaseError}>
      <AppContent />
    </SQLiteProvider>
  );
}
