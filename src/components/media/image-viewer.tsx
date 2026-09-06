import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { IconX } from '@tabler/icons-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { CustomModal } from '@/components/ui/modal';

interface ImageViewerProps {
  uri: string;
  aspectRatio?: number;
}

export function ImageViewer({ uri, aspectRatio }: ImageViewerProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  return (
    <>
      <Pressable
        onPress={() => setFullscreen(true)}
        style={[styles.wrap, { borderCurve: 'continuous' }]}
        accessibilityRole="button"
        accessibilityLabel="View image fullscreen"
        accessibilityHint="Opens the image in fullscreen viewer"
        hitSlop={8}
      >
        <Image
          source={{ uri }}
          style={[styles.image, { height: windowHeight * 0.35 }, aspectRatio ? { aspectRatio } : undefined]}
          contentFit="cover"
          transition={200}
          accessibilityLabel="Journal image"
        />
      </Pressable>

      <CustomModal visible={fullscreen} onDismiss={() => setFullscreen(false)} variant="fullscreen">
        <View style={[styles.overlay, { backgroundColor: theme.background }]}>
          <Pressable
            onPress={() => setFullscreen(false)}
            style={[styles.closeButton, { backgroundColor: theme.surface, top: insets.top + 12 }]}
            accessibilityRole="button"
            accessibilityLabel="Close fullscreen image"
            accessibilityHint="Returns to the note"
            hitSlop={8}
          >
            <IconX color={theme.text} size={18} />
          </Pressable>

          <Pressable
            onPress={() => setFullscreen(false)}
            style={styles.imageArea}
            accessibilityLabel="Fullscreen image, tap to close"
            accessibilityRole="image"
          >
            <Image
              source={{ uri }}
              style={[styles.fullImage, { width: windowWidth, height: windowHeight * 0.85 }]}
              contentFit="contain"
              accessibilityLabel="Fullscreen journal image"
            />
          </Pressable>
        </View>
      </CustomModal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '94%',
    alignSelf: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.four,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  fullImage: {
    width: '100%',
  },
});
