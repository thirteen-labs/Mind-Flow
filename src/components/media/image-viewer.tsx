import { useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface ImageViewerProps {
  uri: string;
  aspectRatio?: number;
}

const SCREEN = Dimensions.get('window');

export function ImageViewer({ uri, aspectRatio }: ImageViewerProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const theme = useTheme();

  return (
    <>
      <Pressable
        onPress={() => setFullscreen(true)}
        style={[styles.wrap, { borderCurve: 'continuous' }]}
      >
        <Image
          source={{ uri }}
          style={[styles.image, aspectRatio ? { aspectRatio } : undefined]}
          contentFit="cover"
          transition={200}
        />
      </Pressable>

      <Modal visible={fullscreen} transparent animationType="fade">
        <View style={[styles.overlay, { backgroundColor: theme.background }]}>
          <Pressable
            onPress={() => setFullscreen(false)}
            style={[styles.closeButton, { backgroundColor: theme.surface }]}
          >
            <SymbolView name="xmark" tintColor={theme.text} size={18} />
          </Pressable>

          <Pressable onPress={() => setFullscreen(false)} style={styles.imageArea}>
            <Image
              source={{ uri }}
              style={styles.fullImage}
              contentFit="contain"
            />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    minHeight: 140,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: SCREEN.width,
    height: SCREEN.height,
  },
});
