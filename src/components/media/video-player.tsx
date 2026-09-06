import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { IconPlayerPause, IconPlayerPlay, IconX } from '@tabler/icons-react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

interface VideoPlayerProps {
  uri: string;
}

export function VideoPlayer({ uri }: VideoPlayerProps) {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  if (expanded) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface, borderCurve: 'continuous' }]}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls
          contentFit="contain"
        />
        <View style={styles.bar}>
          <Pressable
            onPress={() => {
              if (isPlaying) { player.pause(); } else { player.play(); }
            }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
            hitSlop={8}
            style={[styles.barButton, { backgroundColor: theme.backgroundElement }]}
          >
            {isPlaying
              ? <IconPlayerPause color={theme.text} size={16} />
              : <IconPlayerPlay color={theme.text} size={16} />
            }
          </Pressable>
          <Pressable
            onPress={() => { player.pause(); setExpanded(false); }}
            accessibilityRole="button"
            accessibilityLabel="Close video"
            hitSlop={8}
            style={[styles.barButton, { backgroundColor: theme.backgroundElement }]}
          >
            <IconX color={theme.textSecondary} size={14} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => setExpanded(true)}
      accessibilityRole="button"
      accessibilityLabel="Play video"
      accessibilityHint="Opens video player"
      hitSlop={8}
      style={[styles.container, styles.thumbnail, { backgroundColor: theme.surface, borderCurve: 'continuous' }]}
    >
      <View style={[styles.playOverlay, { backgroundColor: theme.primary }]} accessible={false}>
        <IconPlayerPlay color={theme.background} size={20} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumbnail: {
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  barButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
