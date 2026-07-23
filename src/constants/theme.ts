import { Platform } from 'react-native';

import type { Theme } from '@/constants/themes';

export type ThemeColor = keyof Pick<
  Theme,
  | 'text'
  | 'textSecondary'
  | 'textMuted'
  | 'background'
  | 'backgroundElement'
  | 'backgroundSelected'
  | 'surface'
  | 'surfaceVariant'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'border'
  | 'card'
  | 'error'
  | 'success'
  | 'warning'
  | 'notification'
  | 'tint'
  | 'tabActive'
  | 'tabInactive'
>;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
