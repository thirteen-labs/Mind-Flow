import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { IconChevronLeft, IconCopy, IconFileText, IconPlus, IconTrash } from '@tabler/icons-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TemplateService, type Template } from '@/services/template-service';
import { openJournal } from '@/services/journal-nav';

export default function TemplatesScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await TemplateService.getAllTemplates(db);
      setTemplates(list);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleEdit = useCallback((template: Template) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openJournal({ type: 'template', templateId: template.id });
  }, []);

  const handleUse = useCallback((template: Template) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openJournal({ type: 'note', content: template.content });
  }, []);

  const handleDelete = useCallback((template: Template) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Template',
      `Delete "${template.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await TemplateService.deleteTemplate(db, template.id);
              await load();
            } catch {
              Alert.alert('Error', 'Could not delete template');
            }
          },
        },
      ]
    );
  }, [db, load]);

  const renderItem = useCallback(({ item, index }: { item: Template; index: number }) => {
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
        <Pressable
          onPress={() => handleEdit(item)}
          onLongPress={() => handleDelete(item)}
          delayLongPress={400}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={[styles.cardIcon, { backgroundColor: withAlpha(theme.secondary, 0.14) }]}>
            <IconFileText size={18} color={theme.secondary} />
          </View>
          <View style={styles.cardBody}>
            <ThemedText type="default" numberOfLines={1} style={styles.cardTitle}>
              {item.title || 'Untitled Template'}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted" numberOfLines={2}>
              {item.content.trim() || 'Empty template'}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => handleUse(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.useButton,
              { backgroundColor: withAlpha(theme.tint, 0.12) },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconCopy size={18} color={theme.tint} />
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconTrash size={18} color={theme.textMuted} />
          </Pressable>
        </Pressable>
      </Animated.View>
    );
  }, [theme, handleEdit, handleUse, handleDelete]);

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconChevronLeft size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="title">Templates</ThemedText>
        </ThemedView>
      </Animated.View>

      <FlashList
        data={templates}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: withAlpha(theme.secondary, 0.14) }]}>
                <IconFileText size={40} color={theme.secondary} />
              </View>
              <ThemedText type="default" themeColor="textSecondary">
                No templates yet
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Create reusable content for your journal
              </ThemedText>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  openJournal({ type: 'template' });
                }}
                style={[styles.createBtn, { backgroundColor: theme.secondary }]}
              >
                <IconPlus size={16} color={theme.background} />
                <ThemedText type="default" style={{ color: theme.background, fontWeight: '600' }}>New Template</ThemedText>
              </Pressable>
            </Animated.View>
          ) : null
        }
      />

      {/* FAB */}
      {templates.length > 0 && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              openJournal({ type: 'template' });
            }}
            style={[styles.fab, { backgroundColor: theme.secondary }]}
          >
            <IconPlus size={24} color={theme.background} />
          </Pressable>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderCurve: 'continuous',
    marginBottom: Spacing.two,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardTitle: {
    fontWeight: '600',
  },
  useButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderCurve: 'continuous',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
});
