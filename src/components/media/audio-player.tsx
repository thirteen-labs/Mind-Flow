import { useState, useEffect, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { IconMusic, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { MediaService } from '@/services/media-service';
import { Spacing } from '@/constants/theme';

interface AudioPlayerProps {
  uri: string;
  title?: string;
  artworkUri?: string | null;
  durationSeconds?: number | null;
}

export function AudioPlayer({ uri, title, artworkUri, durationSeconds }: AudioPlayerProps) {
  const theme = useTheme();
  const player = useAudioPlayer({ uri });
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, isPlaying]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsPlaying(player.playing);
    }, 200);
    return () => clearInterval(interval);
  }, [player]);

  return (
    <View style={[styles.card, { backgroundColor: `${theme.accent}15`, borderColor: `${theme.accent}30` }]}>
      <View style={[styles.artworkWrap, { backgroundColor: `${theme.accent}20` }]}>
        {artworkUri ? (
          <Image
            source={{ uri: artworkUri }}
            style={styles.artwork}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholderIcon}>
            <IconMusic color={theme.accent} size={32} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <ThemedText
          type="small"
          style={[styles.title, { color: theme.text }]}
          numberOfLines={1}
        >
          {title ?? 'Untitled'}
        </ThemedText>

        {durationSeconds ? (
          <ThemedText
            type="small"
            style={styles.duration}
          >
            {MediaService.getDurationLabel(durationSeconds)}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={togglePlay}
          style={[styles.playButton, { backgroundColor: theme.accent }]}
        >
          {isPlaying
            ? <IconPlayerPause color={theme.background} size={18} />
            : <IconPlayerPlay color={theme.background} size={18} />
          }
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  artworkWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  placeholderIcon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.one,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
  },
  duration: {
    fontSize: 12,
    opacity: 0.6,
  },
  controls: {
    paddingTop: Spacing.one,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
