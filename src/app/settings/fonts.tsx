import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme, useThemeManager } from '@/hooks/use-theme';

const FONT_OPTIONS = [
  { id: null as string | null, name: 'Theme Default', family: 'Inter', description: 'Use the font that comes with your selected theme' },
  { id: 'Inter', name: 'Inter', family: 'Inter', description: 'Clean, modern sans-serif. Great for everyday writing.' },
  { id: 'Playfair Display', name: 'Playfair Display', family: 'Playfair Display', description: 'Elegant serif. Perfect for a premium reading feel.' },
  { id: 'JetBrains Mono', name: 'JetBrains Mono', family: 'JetBrains Mono', description: 'Monospace. Ideal for focused writing and code.' },
] as const;

export default function FontsScreen() {
  const theme = useTheme();
  const { fontOverride, setFontOverride } = useThemeManager();

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <SymbolView name="chevron.left" size={18} tintColor={theme.text} />
        </Pressable>
        <ThemedText type="title">Fonts</ThemedText>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="small" themeColor="textMuted" style={styles.description}>
          Choose a font for the entire app. This overrides the font set by your current theme.
        </ThemedText>

        <View style={styles.options}>
          {FONT_OPTIONS.map((option) => {
            const selected = fontOverride === option.id;
            return (
              <Pressable
                key={option.id ?? 'default'}
                onPress={() => setFontOverride(option.id)}
                style={[
                  styles.card,
                  {
                    backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <ThemedText
                    type="default"
                    style={[styles.fontName, { fontFamily: option.family }]}
                  >
                    {option.name}
                  </ThemedText>
                  {selected && (
                    <SymbolView name="checkmark.circle.fill" size={20} tintColor={theme.primary} />
                  )}
                </View>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={[styles.preview, { fontFamily: option.family }]}
                >
                  {option.description}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textMuted"
                  style={[styles.previewText, { fontFamily: option.family }]}
                  numberOfLines={1}
                >
                  The quick brown fox jumps over the lazy dog.
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  description: {
    lineHeight: 20,
  },
  options: {
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fontName: {
    fontSize: 20,
    fontWeight: '600',
  },
  preview: {
    lineHeight: 20,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
