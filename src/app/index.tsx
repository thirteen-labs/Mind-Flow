import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';

import { useTheme } from '@/hooks/use-theme';

function getOnboardingFlagPath(): string | null {
  try {
    // Use new FileSystem API; fall back to null on web or if unavailable
    if (!Paths?.document?.uri) return null;
    return `${Paths.document.uri}.onboarded`;
  } catch {
    return null;
  }
}

const ONBOARDING_FLAG = getOnboardingFlagPath();

async function checkFlagExists(path: string): Promise<boolean> {
  try {
    const f = new File(path);
    return f.exists;
  } catch {
    return false;
  }
}

export default function Index() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [checked, setChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) setChecked(true);
    }, 2500);
    (async () => {
      try {
        const row = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM settings WHERE key = ?", 'onboarded'
        ).catch(() => null as any);
        if (!mounted) return;
        if (row?.value === '1') {
          setOnboarded(true);
        } else if (ONBOARDING_FLAG) {
          const exists = await checkFlagExists(ONBOARDING_FLAG);
          if (mounted) setOnboarded(exists);
        }
      } catch {
        if (mounted) setOnboarded(false);
      }
      if (mounted) setChecked(true);
      clearTimeout(timeout);
    })();
    return () => { mounted = false; clearTimeout(timeout); };
  }, [db]);

  if (!checked) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator
          size="large"
          color={theme.textMuted}
          accessibilityLabel="Loading app"
        />
        <Text
          style={[styles.loadingText, { color: theme.textMuted }]}
          accessibilityLiveRegion="polite"
        >
          Loading…
        </Text>
      </View>
    );
  }

  if (!onboarded) {
    return <Redirect href="/onboarding" />
  }

  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor resolved from theme at runtime
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
});
