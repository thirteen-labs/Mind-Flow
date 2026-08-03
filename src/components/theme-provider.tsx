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
  fontOverride: string | null;
  setFontOverride: (font: string | null) => void;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const db = useSQLiteContext();
  const isDark = systemScheme === 'dark';
  const [themeId, setThemeIdState] = useState<string>(getThemeByScheme(isDark).id);
  const [followSystem, setFollowSystemState] = useState(true);
  const [fontOverride, setFontOverrideState] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      db?.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'followSystemTheme'),
      db?.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'themeId'),
      db?.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'fontOverride'),
    ]).then(([themeRow, savedThemeId, fontRow]) => {
      if (themeRow?.value === 'false') {
        setFollowSystemState(false);
      }
      if (savedThemeId?.value) {
        setThemeIdState(savedThemeId.value);
      }
      if (fontRow?.value) {
        setFontOverrideState(fontRow.value);
      }
    }).catch(() => {});
  }, [db]);

  const effectiveThemeId = useMemo(() => {
    if (followSystem) return getThemeByScheme(isDark).id;
    return themeId;
  }, [followSystem, isDark, themeId]);

  const theme = useMemo(() => {
    const base = getThemeById(effectiveThemeId);
    if (!fontOverride) return base;
    return { ...base, fontFamily: fontOverride };
  }, [effectiveThemeId, fontOverride]);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    setFollowSystemState(false);
    db?.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 'followSystemTheme', 'false').catch(() => {});
    db?.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 'themeId', id).catch(() => {});
  }, [db]);

  const setFollowSystem = useCallback((v: boolean) => {
    setFollowSystemState(v);
    db?.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 'followSystemTheme', String(v)).catch(() => {});
  }, [db]);

  const setFontOverride = useCallback((font: string | null) => {
    setFontOverrideState(font);
    if (font) {
      db?.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', 'fontOverride', font).catch(() => {});
    } else {
      db?.runAsync('DELETE FROM settings WHERE key = ?', 'fontOverride').catch(() => {});
    }
  }, [db]);

  return (
    <ThemeContext.Provider
      value={{ theme, setThemeId, availableThemes: themeList, themeId: effectiveThemeId, followSystem, setFollowSystem, fontOverride, setFontOverride }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
