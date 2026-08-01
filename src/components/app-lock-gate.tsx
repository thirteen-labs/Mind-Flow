import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { SymbolView } from 'expo-symbols';

import { Spacing } from '@/constants/theme';
import { getThemeById } from '@/constants/themes';
import { SettingsService } from '@/services/settings-service';
import type { SQLiteDatabase } from 'expo-sqlite';

interface AppLockGateProps {
  db: SQLiteDatabase;
  children: React.ReactNode;
}

export function AppLockGate({ db, children }: AppLockGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const settings = await SettingsService.getAll(db);
        if (!settings.appLockEnabled) {
          if (mounted) setUnlocked(true);
          return;
        }
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) {
          if (mounted) setUnlocked(true);
          return;
        }
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          Alert.alert(
            'No biometrics set up',
            'Please enroll in biometric authentication in your device settings.',
            [{ text: 'OK', onPress: () => { if (mounted) setUnlocked(true); } }]
          );
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock MindFlow',
          fallbackLabel: 'Enter passcode',
          cancelLabel: 'Exit',
        });
        if (mounted) setUnlocked(result.success);
      } catch {
        if (mounted) setUnlocked(true);
      }
    })();
    return () => { mounted = false; };
  }, [db]);

  if (unlocked) return <>{children}</>;

  const theme = getThemeById('midnight');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SymbolView name="lock.fill" size={48} tintColor={theme.textMuted} />
      <Text style={[styles.text, { color: theme.text }]}>MindFlow</Text>
      <Text style={[styles.subtext, { color: theme.textMuted }]}>
        {checking ? 'Checking...' : 'Authenticate to continue'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
  },
  text: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 16,
  },
});
