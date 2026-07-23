import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';

import { EmbedCard } from '@/components/embed-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { EmbedService, extractUrls, type EmbedData } from '@/services/embed-service';
import { useTheme } from '@/hooks/use-theme';

interface EmbedListProps {
  content: string;
}

export function EmbedList({ content }: EmbedListProps) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [embeds, setEmbeds] = useState<EmbedData[]>([]);

  const urls = useMemo(() => extractUrls(content), [content]);

  useEffect(() => {
    if (urls.length === 0) return;

    let mounted = true;

    Promise.all(urls.map((url) => EmbedService.getOrFetch(db, url)))
      .then((results) => {
        if (mounted) setEmbeds(results.filter((e): e is EmbedData => e !== null));
      })
      .catch(() => {
        if (mounted) setEmbeds([]);
      });

    return () => { mounted = false; };
  }, [db, urls]);

  if (urls.length === 0) return null;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <SymbolView name="link" size={14} tintColor={theme.textMuted} />
        <ThemedText type="small" themeColor="textMuted">
          {urls.length} {urls.length === 1 ? 'link' : 'links'}
        </ThemedText>
      </ThemedView>

      <View style={styles.list}>
        {embeds.map((embed) => (
          <EmbedCard
            key={embed.url}
            embed={embed}
            onPress={() => WebBrowser.openBrowserAsync(embed.url)}
          />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
});
