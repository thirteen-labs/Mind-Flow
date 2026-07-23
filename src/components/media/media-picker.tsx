import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useMedia } from '@/hooks/use-media';

export function MediaPicker({ onMediaSelected }: { onMediaSelected?: () => void }) {
  const { pickImage, pickVideo, takePhoto, loading } = useMedia();

  const options = [
    { label: 'Photo from Library', icon: '🖼', action: pickImage },
    { label: 'Video from Library', icon: '🎬', action: pickVideo },
    { label: 'Take Photo', icon: '📷', action: takePhoto },
  ] as const;

  return (
    <ThemedView style={styles.container}>
      {options.map((opt) => (
        <Pressable
          key={opt.label}
          onPress={() => {
            opt.action();
            onMediaSelected?.();
          }}
          disabled={loading}
        >
          <ThemedView style={styles.option}>
            <ThemedText style={styles.icon}>{opt.icon}</ThemedText>
            <ThemedText>{opt.label}</ThemedText>
          </ThemedView>
        </Pressable>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.three,
  },
  icon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
});
