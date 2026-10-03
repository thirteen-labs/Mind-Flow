import { useCallback } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Haptic = Haptics.ImpactFeedbackStyle | undefined;

interface IconButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  children: React.ReactNode;
  /** Visual state — drives the tinted background. */
  active?: boolean;
  /** Fills the button with the theme primary. Use for one primary action. */
  prominent?: boolean;
  disabled?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  haptic?: Haptic;
}

/**
 * Minimum 44x44 hit area on every icon-only control (WCAG / Apple HIG), with
 * a scale-down press state instead of an opacity flash so the tap feels
 * physical rather than glitchy.
 */
export function IconButton({
  onPress,
  accessibilityLabel,
  accessibilityHint,
  children,
  active = false,
  prominent = false,
  disabled = false,
  size = 44,
  style,
  hitSlop = 8,
  haptic = Haptics.ImpactFeedbackStyle.Light,
}: IconButtonProps) {
  const theme = useTheme();

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(haptic).catch(() => {});
    }
    onPress();
  }, [disabled, haptic, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={hitSlop}
      // 0.96 press scale, overridable via style's transform if a caller needs it.
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        prominent && { backgroundColor: theme.primary },
        !prominent && active && { backgroundColor: withAlpha(theme.primary, 0.16) },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  disabled: {
    opacity: 0.4,
  },
});