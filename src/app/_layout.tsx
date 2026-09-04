import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Component, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppLockGate } from '@/components/app-lock-gate';
import { ThemeProvider as MindFlowThemeProvider } from '@/components/theme-provider';
import { migrateDbIfNeeded } from '@/services/database';
import { NotificationService } from '@/services/notification-service';

SplashScreen.preventAutoHideAsync().catch(() => {});

function DbFallback() {
  return (
    <View style={fallbackStyles.container}>
      <ActivityIndicator size="large" color="#636366" />
    </View>
  );
}

const fallbackStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
});

class RootErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('RootErrorBoundary caught:', error.message, info.componentStack);
    // Ensure splash is hidden so user sees the error recovery UI instead of infinite splash
    SplashScreen.hideAsync().catch(() => {});
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>{this.state.error?.message ?? 'Unexpected error'}</Text>
          <Pressable style={errorStyles.button} onPress={this.handleRetry}>
            <Text style={errorStyles.buttonText}>Try again</Text>
          </Pressable>
          <Text style={errorStyles.hint}>If this keeps happening, reinstall the app. Your notes are preserved.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 24,
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#98989D',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#208AEF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  hint: {
    color: '#636366',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

function AppContent() {
  const db = useSQLiteContext();

  useEffect(() => {
    NotificationService.setup().catch(() => {});
    // Enforce FKs at runtime (also set during migration)
    db.execAsync('PRAGMA foreign_keys = ON').catch(() => {});
    SplashScreen.hideAsync().catch(() => {});
  }, [db]);

  return (
    <AppLockGate db={db}>
      <MindFlowThemeProvider>
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
    const t = setTimeout(() => setForceReady(true), 3500);
    return () => clearTimeout(t);
  }, []);

  const appReady = fontsLoaded || fontError || forceReady;

  if (fontError) {
    console.warn('Font loading error:', fontError);
  }

  // Hard safety net: if AppContent never mounts (DB fails to init), hide
  // the splash after a delay so the app doesn't stay stuck on it forever.
  // The primary splash hide lives in AppContent — this is just the fallback.
  useEffect(() => {
    if (!appReady) return;
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [appReady]);

  // While not ready, keep native splash covering the screen.
  if (!appReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <RootErrorBoundary>
          <Suspense fallback={<DbFallback />}>
            <SQLiteProvider databaseName="mindflow.db" onInit={migrateDbIfNeeded} useSuspense>
              <AppContent />
            </SQLiteProvider>
          </Suspense>
        </RootErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
