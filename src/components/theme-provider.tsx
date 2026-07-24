import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { getThemeByScheme, getThemeById, themeList, type Theme } from '@/constants/themes';

export type ThemeContextType = {
  theme: Theme;
  setThemeId: (id: string) => void;
  availableThemes: Theme[];
  themeId: string;
  followSystem: boolean;
  setFollowSystem: (v: boolean) => void;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const db = useSQLiteContext();
  const isDark = systemScheme === 'dark';
  const [themeId, setThemeIdState] = useState<string>(getThemeByScheme(isDark).id);
  const [followSystem, setFollowSystemState] = useState(true);

  useEffect(() => {
    db?.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'followSystemTheme').then((row) => {
      if (row?.value === 'false') {
        setFollowSystemState(false);
      }
    }).catch(() => {});
  }, [db]);

  const effectiveThemeId = useMemo(() => {
    if (followSystem) return getThemeByScheme(isDark).id;
    return themeId;
  }, [followSystem, isDark, themeId]);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    setFollowSystemState(false);
    db?.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 'followSystemTheme', 'false').catch(() => {});
  }, [db]);

  const setFollowSystem = useCallback((v: boolean) => {
    setFollowSystemState(v);
    db?.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 'followSystemTheme', String(v)).catch(() => {});
  }, [db]);

  const theme = getThemeById(effectiveThemeId);

  return (
    <ThemeContext.Provider
      value={{ theme, setThemeId, availableThemes: themeList, themeId: effectiveThemeId, followSystem, setFollowSystem }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
