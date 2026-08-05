import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { IconX } from '@tabler/icons-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export interface ModalHeaderProps {
  title: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  style?: ViewStyle;
  rightElement?: React.ReactNode;
}

export function ModalHeader({
  title,
  onClose,
  showCloseButton = true,
  style,
  rightElement,
}: ModalHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ThemedText type="subtitle" style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>
      {rightElement}
      {showCloseButton && onClose && (
        <Pressable
          onPress={onClose}
          style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}
          hitSlop={8}
        >
          <IconX size={20} color={theme.text} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
