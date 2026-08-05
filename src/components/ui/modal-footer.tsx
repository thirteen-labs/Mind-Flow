import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { contrastText } from '@/constants/theme';

export interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
}

export interface ModalFooterProps {
  actions: ModalAction[];
  style?: ViewStyle;
}

export function ModalFooter({ actions, style }: ModalFooterProps) {
  const theme = useTheme();

  const getButtonStyle = (variant?: string): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: theme.primary };
      case 'destructive':
        return { backgroundColor: theme.error };
      case 'secondary':
      default:
        return { backgroundColor: theme.backgroundElement };
    }
  };

  const getTextColor = (variant?: string): string => {
    switch (variant) {
      case 'primary':
        return contrastText(theme.primary);
      case 'destructive':
        return '#FFFFFF';
      case 'secondary':
      default:
        return theme.text;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {actions.map((action, index) => (
        <Pressable
          key={index}
          onPress={action.onPress}
          disabled={action.disabled}
          style={[
            styles.button,
            getButtonStyle(action.variant),
            action.disabled && styles.disabled,
          ]}
        >
          <ThemedText
            type="default"
            style={[
              styles.buttonText,
              { color: getTextColor(action.variant) },
            ]}
          >
            {action.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
