import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FormattingSheetProps {
  sheetRef: React.RefObject<any>;
  onAction: (key: string) => void;
}

interface ToolItem {
  key: string;
  icon: string;
  label: string;
}

const sections: { title: string; tools: ToolItem[] }[] = [
  {
    title: 'Text',
    tools: [
      { key: 'bold', icon: 'bold', label: 'Bold' },
      { key: 'italic', icon: 'italic', label: 'Italic' },
      { key: 'strikethrough', icon: 'strikethrough', label: 'Strike' },
      { key: 'code', icon: 'chevron.left.forwardslash.chevron.right', label: 'Code' },
    ],
  },
  {
    title: 'Headings',
    tools: [
      { key: 'heading1', icon: 'textformat.size', label: 'H1' },
      { key: 'heading2', icon: 'textformat.size', label: 'H2' },
      { key: 'heading3', icon: 'textformat.size', label: 'H3' },
    ],
  },
  {
    title: 'Blocks',
    tools: [
      { key: 'quote', icon: 'text.quote', label: 'Quote' },
      { key: 'list', icon: 'list.bullet', label: 'List' },
      { key: 'numberedlist', icon: 'list.number', label: 'Numbered' },
      { key: 'checklist', icon: 'checklist', label: 'Checklist' },
      { key: 'codeblock', icon: 'curlybraces', label: 'Code Block' },
      { key: 'divider', icon: 'minus', label: 'Divider' },
      { key: 'table', icon: 'tablecells', label: 'Table' },
    ],
  },
  {
    title: 'Insert',
    tools: [
      { key: 'link', icon: 'link', label: 'Link' },
      { key: 'media', icon: 'photo.on.rectangle', label: 'Media' },
    ],
  },
];

export default function FormattingSheet({ sheetRef, onAction }: FormattingSheetProps) {
  const theme = useTheme();
  const snapPoints = useMemo(() => [360], []);

  const handleAction = useCallback((key: string) => {
    onAction(key);
    sheetRef.current?.close();
  }, [onAction, sheetRef]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.background }}
      handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
    >
      <ThemedView style={styles.container}>
        {sections.map((section) => (
          <ThemedView key={section.title} style={styles.section}>
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <View style={styles.toolsRow}>
              {section.tools.map((tool) => (
                <Pressable
                  key={tool.key}
                  onPress={() => handleAction(tool.key)}
                  style={[styles.toolButton, { backgroundColor: theme.backgroundElement }]}
                >
                  <SymbolView name={tool.icon as any} tintColor={theme.text} size={20} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {tool.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </ThemedView>
        ))}
      </ThemedView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
});
