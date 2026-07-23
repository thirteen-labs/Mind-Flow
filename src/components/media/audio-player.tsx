import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

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

  useEffect(() => {
    const sub = player.addListener('playingChange', (e) => {
      setIsPlaying(e.isPlaying);
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderCurve: 'continuous' }]}>
      <View style={[styles.artworkWrap, { backgroundColor: theme.backgroundElement }]}>
        {artworkUri ? (
          <Image
            source={{ uri: artworkUri }}
            style={styles.artwork}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholderIcon}>
            <SymbolView name="music.note" tintColor={theme.textMuted} size={32} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <ThemedText
          type="small"
          style={styles.title}
          numberOfLines={1}
        >
          {title ?? 'Untitled'}
        </ThemedText>

        {durationSeconds ? (
          <ThemedText
            type="small"
            themeColor="textMuted"
            style={styles.duration}
          >
            {MediaService.getDurationLabel(durationSeconds)}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => { if (isPlaying) { player.pause(); } else { player.play(); } }}
          style={[styles.playButton, { backgroundColor: theme.primary }]}
        >
          <SymbolView
            name={isPlaying ? 'pause.fill' : 'play.fill'}
            tintColor={theme.background}
            size={18}
          />
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
