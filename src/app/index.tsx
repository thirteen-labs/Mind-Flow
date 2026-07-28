import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

const ONBOARDING_FLAG = (() => {
  try {
    return `${FileSystem.documentDirectory}.onboarded`;
  } catch {
    return null;
  }
})();

export default function Index() {
  const db = useSQLiteContext();
  const [checked, setChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const row = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM settings WHERE key = ?", 'onboarded'
        );
        if (row?.value === '1') {
          setOnboarded(true);
        } else if (ONBOARDING_FLAG) {
          const info = await FileSystem.getInfoAsync(ONBOARDING_FLAG);
          setOnboarded(info.exists);
        }
      } catch {
        setOnboarded(false);
      }
      setChecked(true);
    })();
  }, [db]);

  if (!checked) return null;

  if (!onboarded) {
    return <Redirect href="/onboarding" />
  }

  return <Redirect href="/(tabs)/home" />;
}
