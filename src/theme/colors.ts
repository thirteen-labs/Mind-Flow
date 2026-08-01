import { Platform } from 'react-native';
import { Color } from 'expo-router';

export const colors = {
  // Labels
  label: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: '#000000',
  })!,
  
  secondaryLabel: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#3c3c43',
  })!,
  
  tertiaryLabel: Platform.select({
    ios: Color.ios.tertiaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#3c3c4380',
  })!,
  
  quaternaryLabel: Platform.select({
    ios: Color.ios.quaternaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#3c3c4340',
  })!,
  
  // System Backgrounds
  systemBackground: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: '#ffffff',
  })!,
  
  secondarySystemBackground: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceVariant,
    default: '#f2f2f7',
  })!,
  
  tertiarySystemBackground: Platform.select({
    ios: Color.ios.tertiarySystemBackground,
    android: Color.android.dynamic.surfaceVariant,
    default: '#ffffff',
  })!,
  
  // Separators
  separator: Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: '#c6c6c8',
  })!,
  
  opaqueSeparator: Platform.select({
    ios: Color.ios.opaqueSeparator,
    android: Color.android.dynamic.outlineVariant,
    default: '#c6c6c8',
  })!,
  
  // System Colors
  systemBlue: Platform.select({
    ios: Color.ios.systemBlue,
    android: Color.android.dynamic.primary,
    default: '#007aff',
  })!,
  
  systemGreen: Platform.select({
    ios: Color.ios.systemGreen,
    android: Color.android.dynamic.primary,
    default: '#34c759',
  })!,
  
  systemIndigo: Platform.select({
    ios: Color.ios.systemIndigo,
    android: Color.android.dynamic.primary,
    default: '#5856d6',
  })!,
  
  systemOrange: Platform.select({
    ios: Color.ios.systemOrange,
    android: Color.android.dynamic.tertiary,
    default: '#ff9500',
  })!,
  
  systemPink: Platform.select({
    ios: Color.ios.systemPink,
    android: Color.android.dynamic.error,
    default: '#ff2d55',
  })!,
  
  systemPurple: Platform.select({
    ios: Color.ios.systemPurple,
    android: Color.android.dynamic.primary,
    default: '#af52de',
  })!,
  
  systemRed: Platform.select({
    ios: Color.ios.systemRed,
    android: Color.android.dynamic.error,
    default: '#ff3b30',
  })!,
  
  systemTeal: Platform.select({
    ios: Color.ios.systemTeal,
    android: Color.android.dynamic.primary,
    default: '#5ac8fa',
  })!,
  
  systemYellow: Platform.select({
    ios: Color.ios.systemYellow,
    android: Color.android.dynamic.tertiary,
    default: '#ffcc00',
  })!,
  
  // Fill Colors
  systemFill: Platform.select({
    ios: Color.ios.systemFill,
    android: Color.android.dynamic.surfaceVariant,
    default: '#78788033',
  })!,
  
  secondarySystemFill: Platform.select({
    ios: Color.ios.secondarySystemFill,
    android: Color.android.dynamic.surfaceVariant,
    default: '#78788028',
  })!,
  
  tertiarySystemFill: Platform.select({
    ios: Color.ios.tertiarySystemFill,
    android: Color.android.dynamic.surfaceVariant,
    default: '#7676801e',
  })!,
  
  quaternarySystemFill: Platform.select({
    ios: Color.ios.quaternarySystemFill,
    android: Color.android.dynamic.surfaceVariant,
    default: '#74748014',
  })!,
  
  // Placeholder
  placeholder: Platform.select({
    ios: Color.ios.placeholder,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#3c3c4399',
  })!,
  
  // Tint (accent color)
  tint: Platform.select({
    ios: Color.ios.systemBlue,
    android: Color.android.dynamic.primary,
    default: '#007aff',
  })!,
} as const;

export type ColorName = keyof typeof colors;
