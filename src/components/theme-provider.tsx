import { createContext, useCallback, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getThemeByScheme, getThemeById, themeList, type Theme } from '@/constants/themes';

export type ThemeContextType = {
  theme: Theme;
  setThemeId: (id: string) => void;
  availableThemes: Theme[];
  themeId: string;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
  const [themeId, setThemeIdState] = useState<string>(
    getThemeByScheme(isDark).id,
  );

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
  }, []);

  const theme = getThemeById(themeId);

  return (
    <ThemeContext.Provider
      value={{ theme, setThemeId, availableThemes: themeList, themeId }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
