import { useContext } from 'react';

import { ThemeContext } from '@/components/theme-provider';
import type { Theme } from '@/constants/themes';

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx.theme;
}

export function useThemeManager() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeManager must be used within a ThemeProvider');
  }
  return {
    themeId: ctx.themeId,
    setThemeId: ctx.setThemeId,
    availableThemes: ctx.availableThemes,
    followSystem: ctx.followSystem,
    setFollowSystem: ctx.setFollowSystem,
  };
}
