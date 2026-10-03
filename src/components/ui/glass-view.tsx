import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView as NativeGlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Cross-platform "glass" surface.
 *
 * Follows the ECC `liquid-glass-design` direction, layered by capability:
 *   1. iOS 26+  -> native `GlassView` (real UIVisualEffectView liquid glass)
 *   2. BlurView -> translucent blur fallback (older iOS, Android)
 *   3. plain    -> themed translucent surface (web, or reduce-transparency)
 *
 * Anti-patterns avoided: never nest glass inside glass, never put an opaque
 * background behind a glass surface (that defeats the translucency).
 */
export type GlassTier = 'regular' | 'clear' | 'none';

interface GlassViewProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Blur strength. Lower = clearer, higher = frosted. */
  intensity?: number;
  /** `regular` = frosted, `clear` = mostly transparent, `none` = flat tint. */
  tier?: GlassTier;
  /** True for controls that respond to touch — lets the material deform. */
  interactive?: boolean;
  /** Optional accent tint applied to the material. */
  tintColor?: string;
  /** Adds a hairline border. Defaults to the theme border. */
  bordered?: boolean;
  radius?: number;
}

/**
 * `GlassView` silently degrades on unsupported platforms, but the native
 * effect itself is gated on iOS 26 + Liquid Glass being compiled in. We keep
 * the detection in one place so callers never branch on platform.
 */
function supportsLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    // isLiquidGlassAvailable: component compiled in.
    // isGlassEffectAPIAvailable: runtime API present (some 26 betas lacked it,
    // and calling into it there could crash).
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

export function GlassView({
  children,
  style,
  intensity = 60,
  tier = 'regular',
  interactive = false,
  tintColor,
  bordered = false,
  radius,
}: GlassViewProps) {
  const theme = useTheme();
  const effectiveTier = tier === 'none' ? 'none' : tier;

  const flatStyle: StyleProp<ViewStyle> = [
    styles.base,
    radius != null ? { borderRadius: radius } : null,
    bordered ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border } : null,
    // Only paint an opaque-ish fill when there is no real material behind it.
    effectiveTier === 'none' ? { backgroundColor: theme.surface } : null,
    style,
  ];

  if (supportsLiquidGlass()) {
    return (
      <NativeGlassView
        style={[
          styles.base,
          radius != null ? { borderRadius: radius } : null,
          style,
        ]}
        glassEffectStyle={effectiveTier as 'regular' | 'clear' | 'none'}
        colorScheme={theme.isDark ? 'dark' : 'light'}
        isInteractive={interactive}
        tintColor={tintColor ?? undefined}
      >
        {children}
      </NativeGlassView>
    );
  }

  if (Platform.OS === 'web') {
    // No BlurView on web in a way that composites reliably against a scrolling
    // list, so use a tinted translucency plus backdrop blur where supported.
    return (
      <View
        style={[
          flatStyle,
          effectiveTier !== 'none' && {
            backgroundColor: tintColor ? withAlpha(tintColor, 0.16) : theme.surface,
            ...(Platform.OS === 'web' ? webBackdrop() : null),
          },
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      tint={theme.isDark ? 'dark' : 'light'}
      intensity={intensity}
      style={[
        styles.base,
        radius != null ? { borderRadius: radius } : null,
        bordered ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border } : null,
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

function webBackdrop(): ViewStyle {
  // react-native-web forwards unknown style keys to CSS.
  return { backdropFilter: 'blur(24px)' } as ViewStyle;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});