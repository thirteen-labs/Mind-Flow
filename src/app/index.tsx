import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { documentDirectory, getInfoAsync } from 'expo-file-system/legacy';

const ONBOARDING_FLAG = (() => {
  try {
    return `${documentDirectory}.onboarded`;
  } catch {
    return null;
  }
})();

export default function Index() {
  const db = useSQLiteContext();
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
        );
        if (!mounted) return;
        if (row?.value === '1') {
          setOnboarded(true);
        } else if (ONBOARDING_FLAG) {
          const info = await getInfoAsync(ONBOARDING_FLAG);
          if (mounted) setOnboarded(info.exists);
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#636366" />
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
    backgroundColor: '#000000',
  },
});
