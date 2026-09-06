import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { contrastText, Spacing } from '@/constants/theme';
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
      accessibilityRole="radiogroup"
      accessibilityLabel="Mood options"
    >
      <Pressable
        onPress={() => onSelect(null)}
        accessibilityRole="radio"
        accessibilityLabel="Clear mood"
        accessibilityHint="Clears the selected mood"
        accessibilityState={{ checked: !selected }}
        hitSlop={8}
        style={[
          styles.mood,
          { borderColor: theme.border, backgroundColor: !selected ? theme.primary : theme.backgroundElement },
        ]}
      >
        <View style={styles.emojiWrap} accessible={false}>
          <Text style={[styles.clearText, { color: !selected ? contrastText(theme.primary) : theme.text }]}>✕</Text>
        </View>
      </Pressable>
      {MOODS.map((mood) => (
        <Pressable
          key={mood.value}
          onPress={() => onSelect(mood.value === selected ? null : mood.value)}
          accessibilityRole="radio"
          accessibilityLabel={`Mood: ${mood.label}`}
          accessibilityHint={`Selects ${mood.label} mood`}
          accessibilityState={{ checked: selected === mood.value }}
          hitSlop={8}
          style={[
            styles.mood,
            {
              borderColor: selected === mood.value ? theme.primary : theme.border,
              backgroundColor: selected === mood.value ? theme.backgroundSelected : theme.backgroundElement,
            },
          ]}
        >
          <Text style={styles.emoji} accessible={false}>{mood.emoji}</Text>
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
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  emojiWrap: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
