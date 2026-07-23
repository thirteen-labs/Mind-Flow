import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import * as FileSystem from 'expo-file-system';

const ONBOARDING_FLAG = `${(FileSystem as any).documentDirectory}.onboarded`;

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(ONBOARDING_FLAG);
        setOnboarded(info.exists);
      } catch {
        setOnboarded(false);
      }
      setChecked(true);
    })();
  }, []);

  if (!checked) return null;

  if (!onboarded) {
    return <Redirect href="/onboarding" />
  }

  return <Redirect href="/(tabs)/home" />;
}
