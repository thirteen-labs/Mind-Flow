import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TagService, type Tag } from '@/services/tag-service';

const TAG_COLORS = ['#208AEF', '#FF6B6B', '#51CF66', '#FF922B', '#9775FA', '#F06595', '#20C997', '#FFD43B'];

interface TagInputProps {
  journalId: string;
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}

export function TagInput({ journalId, selectedTags, onTagsChange }: TagInputProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    TagService.getAll(db).then(setAllTags).catch(() => {});
  }, [db]);

  const selectedIds = new Set(selectedTags.map((t) => t.id));

  const toggleTag = useCallback(async (tag: Tag) => {
    const next = selectedIds.has(tag.id)
      ? selectedTags.filter((t) => t.id !== tag.id)
      : [...selectedTags, tag];
    onTagsChange(next);
    await TagService.setJournalTags(db, journalId, next.map((t) => t.id)).catch(() => {});
  }, [db, journalId, selectedTags, selectedIds, onTagsChange]);

  const createAndAdd = useCallback(async () => {
    const name = newTagName.trim();
    if (!name) return;
    const color = TAG_COLORS[allTags.length % TAG_COLORS.length];
    try {
      const tag = await TagService.create(db, name, color);
      setAllTags((prev) => [...prev, tag]);
      onTagsChange([...selectedTags, tag]);
      await TagService.setJournalTags(db, journalId, [...selectedTags.map((t) => t.id), tag.id]).catch(() => {});
      setNewTagName('');
      setShowNew(false);
    } catch {
      // tag may already exist
    }
  }, [db, journalId, newTagName, allTags.length, selectedTags, onTagsChange]);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {allTags.map((tag) => (
          <Pressable
            key={tag.id}
            onPress={() => toggleTag(tag)}
            style={[
              styles.chip,
              {
                backgroundColor: selectedIds.has(tag.id) ? tag.color : theme.backgroundElement,
                borderColor: selectedIds.has(tag.id) ? tag.color : theme.border,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: selectedIds.has(tag.id) ? '#FFFFFF' : theme.text }}
            >
              {tag.name}
            </ThemedText>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setShowNew(true)}
          style={[styles.addChip, { borderColor: theme.border }]}
        >
          <ThemedText type="small" themeColor="textMuted">+</ThemedText>
        </Pressable>
      </ScrollView>

      {showNew && (
        <View style={[styles.newRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <TextInput
            value={newTagName}
            onChangeText={setNewTagName}
            placeholder="Tag name..."
            placeholderTextColor={theme.textMuted}
            style={[styles.newInput, { color: theme.text }]}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={createAndAdd}
          />
          <Pressable onPress={createAndAdd} style={styles.newDone}>
            <ThemedText type="default" themeColor="tint">Add</ThemedText>
          </Pressable>
          <Pressable onPress={() => { setShowNew(false); setNewTagName(''); }}>
            <ThemedText type="default" themeColor="textMuted">Cancel</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.two,
  },
  scroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  addChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.two,
  },
  newInput: {
    flex: 1,
    fontSize: 14,
    height: 32,
    paddingHorizontal: Spacing.two,
  },
  newDone: {
    paddingHorizontal: Spacing.two,
  },
});
