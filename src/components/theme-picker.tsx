import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { themeList, type Theme } from '@/constants/themes';
import { useThemeManager } from '@/hooks/use-theme';

function ThemeCard({ theme, isSelected }: { theme: Theme; isSelected: boolean }) {
  return (
    <Pressable>
      <ThemedView
        style={[
          styles.card,
          {
            borderColor: isSelected ? theme.primary : 'transparent',
            borderWidth: 2,
          },
        ]}
      >
        <View style={[styles.previewRow]}>
          <View style={[styles.previewCircle, { backgroundColor: theme.primary }]} />
          <View style={[styles.previewCircle, { backgroundColor: theme.secondary }]} />
          <View style={[styles.previewCircle, { backgroundColor: theme.accent }]} />
        </View>
        <View
          style={[
            styles.previewBar,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <View
            style={[styles.previewDot, { backgroundColor: theme.tabActive }]}
          />
          <View
            style={[
              styles.previewDot,
              { backgroundColor: theme.tabInactive },
            ]}
          />
        </View>
        <View style={styles.cardFooter}>
          <View
            style={[
              styles.previewLine,
              { backgroundColor: theme.tint },
              { width: '60%' },
            ]}
          />
          <View
            style={[
              styles.previewLine,
              { backgroundColor: theme.textSecondary },
              { width: '40%' },
            ]}
          />
        </View>
        <ThemedText
          style={[styles.cardLabel, { color: theme.text }]}
          type="small"
        >
          {theme.name}
        </ThemedText>
        {theme.isDark && (
          <ThemedView
            style={[
              styles.darkBadge,
              { backgroundColor: theme.surfaceVariant },
            ]}
          >
            <ThemedText
              style={[styles.darkBadgeText, { color: theme.textMuted }]}
              type="small"
            >
              Dark
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </Pressable>
  );
}

export function ThemePicker() {
  const { themeId, setThemeId } = useThemeManager();

  return (
    <ThemedView>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Theme
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.sectionSubtitle}>
        Choose your visual style
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {themeList.map((t) => (
          <Pressable key={t.id} onPress={() => setThemeId(t.id)}>
            <ThemeCard theme={t} isSelected={t.id === themeId} />
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.one,
  },
  sectionSubtitle: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  card: {
    width: 140,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
    overflow: 'hidden',
  },
  previewRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  previewCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  previewBar: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardFooter: {
    gap: Spacing.half,
  },
  previewLine: {
    height: 4,
    borderRadius: 2,
  },
  cardLabel: {
    marginTop: Spacing.one,
    fontWeight: '600',
  },
  darkBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  darkBadgeText: {
    fontSize: 10,
  },
});
