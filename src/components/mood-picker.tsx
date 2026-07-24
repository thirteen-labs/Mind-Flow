import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MOODS = [
  { emoji: '😊', label: 'Happy', value: 'happy' },
  { emoji: '😌', label: 'Calm', value: 'calm' },
  { emoji: '🥰', label: 'Grateful', value: 'grateful' },
  { emoji: '🤔', label: 'Thoughtful', value: 'thoughtful' },
  { emoji: '😢', label: 'Sad', value: 'sad' },
  { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
  { emoji: '😰', label: 'Anxious', value: 'anxious' },
  { emoji: '🤩', label: 'Excited', value: 'excited' },
  { emoji: '🥱', label: 'Tired', value: 'tired' },
  { emoji: '🤒', label: 'Sick', value: 'sick' },
];

interface MoodPickerProps {
  selected: string | null;
  onSelect: (mood: string | null) => void;
}

export function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <Pressable
        onPress={() => onSelect(null)}
        style={[
          styles.mood,
          { borderColor: theme.border, backgroundColor: !selected ? theme.primary : theme.backgroundElement },
        ]}
      >
        <View style={styles.emojiWrap}>
          <Text style={styles.clearText}>✕</Text>
        </View>
      </Pressable>
      {MOODS.map((mood) => (
        <Pressable
          key={mood.value}
          onPress={() => onSelect(mood.value === selected ? null : mood.value)}
          style={[
            styles.mood,
            {
              borderColor: selected === mood.value ? theme.primary : theme.border,
              backgroundColor: selected === mood.value ? theme.backgroundSelected : theme.backgroundElement,
            },
          ]}
        >
          <Text style={styles.emoji}>{mood.emoji}</Text>
          <Text
            style={[
              styles.label,
              { color: selected === mood.value ? theme.primary : theme.textSecondary },
            ]}
          >
            {mood.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  mood: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  emojiWrap: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
