import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { EmbedData } from '@/services/embed-service';
import { useTheme } from '@/hooks/use-theme';

interface EmbedCardProps {
  embed: EmbedData;
  onPress?: () => void;
}

function typeIcon(type: string): 'play.rectangle' | 'music.note' | 'chevron.left.forwardslash.chevron.right' | 'link' {
  switch (type) {
    case 'youtube': return 'play.rectangle';
    case 'spotify': return 'music.note';
    case 'github': return 'chevron.left.forwardslash.chevron.right';
    default: return 'link';
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'youtube': return 'YouTube';
    case 'spotify': return 'Spotify';
    case 'github': return 'GitHub';
    default: return '';
  }
}

export function EmbedCard({ embed, onPress }: EmbedCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress}>
      <ThemedView
        type="surface"
        style={[styles.card, { borderColor: theme.border }]}
      >
        {embed.thumbnail_url ? (
          <Image
            source={{ uri: embed.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <ThemedView type="backgroundElement" style={styles.iconBox}>
            <SymbolView
              name={typeIcon(embed.type)}
              size={28}
              tintColor={theme.textSecondary}
            />
          </ThemedView>
        )}

        <View style={styles.body}>
          <View style={styles.header}>
            {typeLabel(embed.type) && (
              <ThemedText type="small" themeColor="tint">
                {typeLabel(embed.type)}
              </ThemedText>
            )}
            <SymbolView
              name="arrow.up.right"
              size={12}
              tintColor={theme.textMuted}
            />
          </View>

          {embed.title && (
            <ThemedText type="default" numberOfLines={2} style={styles.title}>
              {embed.title}
            </ThemedText>
          )}

          {embed.description && (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={2}
              style={styles.description}
            >
              {embed.description}
            </ThemedText>
          )}

          {embed.author_name && (
            <ThemedText type="small" themeColor="textMuted">
              {embed.author_name}
            </ThemedText>
          )}

          <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
            {embed.url}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumbnail: {
    width: 100,
    height: 100,
  },
  iconBox: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
  },
  description: {
    lineHeight: 18,
  },
});
