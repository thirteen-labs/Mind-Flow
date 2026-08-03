import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconQuote,
  IconList,
  IconListNumbers,
  IconCheckbox,
  IconBraces,
  IconMinus,
  IconTable,
  IconLink,
  IconPhoto,
  IconUnderline,
  IconHighlight,
  type Icon,
} from '@tabler/icons-react-native';

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
  icon: Icon;
  label: string;
}

const sections: { title: string; tools: ToolItem[] }[] = [
  {
    title: 'Text',
    tools: [
      { key: 'bold', icon: IconBold, label: 'Bold' },
      { key: 'italic', icon: IconItalic, label: 'Italic' },
      { key: 'underline', icon: IconUnderline, label: 'Underline' },
      { key: 'strikethrough', icon: IconStrikethrough, label: 'Strike' },
      { key: 'highlight', icon: IconHighlight, label: 'Highlight' },
      { key: 'code', icon: IconCode, label: 'Code' },
    ],
  },
  {
    title: 'Headings',
    tools: [
      { key: 'heading1', icon: IconH1, label: 'H1' },
      { key: 'heading2', icon: IconH2, label: 'H2' },
      { key: 'heading3', icon: IconH3, label: 'H3' },
    ],
  },
  {
    title: 'Blocks',
    tools: [
      { key: 'quote', icon: IconQuote, label: 'Quote' },
      { key: 'list', icon: IconList, label: 'List' },
      { key: 'numberedlist', icon: IconListNumbers, label: 'Numbered' },
      { key: 'checklist', icon: IconCheckbox, label: 'Checklist' },
      { key: 'codeblock', icon: IconBraces, label: 'Code Block' },
      { key: 'divider', icon: IconMinus, label: 'Divider' },
      { key: 'table', icon: IconTable, label: 'Table' },
    ],
  },
  {
    title: 'Insert',
    tools: [
      { key: 'link', icon: IconLink, label: 'Link' },
      { key: 'media', icon: IconPhoto, label: 'Media' },
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
                  <tool.icon size={20} color={theme.text} />
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
