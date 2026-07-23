import { useCallback, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';

import FormattingSheet from './formatting-sheet';
import {
  createUndoStack,
  insertBlockquote,
  insertBulletList,
  insertChecklist,
  insertCodeBlock,
  insertDivider,
  insertHeading,
  insertImage,
  insertLink,
  insertNumberedList,
  insertTable,
  toggleBold,
  toggleInlineCode,
  toggleItalic,
  toggleStrikethrough,
} from './formatting';

import { MediaService } from '@/services/media-service';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MarkdownEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const inputRef = useRef<TextInput>(null);
  const linkInputRef = useRef<TextInput>(null);
  const undoStack = useRef(createUndoStack());
  const lastTextRef = useRef(value);
  const sheetRef = useRef<any>(null);
  const theme = useTheme();

  const apply = useCallback((result: { text: string; cursor: number }) => {
    undoStack.current.push({
      text: lastTextRef.current,
      selection: { start: selection.start, end: selection.end },
    });
    onChange(result.text);
    lastTextRef.current = result.text;
    setSelection({ start: result.cursor, end: result.cursor });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [onChange, selection]);

  const handleAction = useCallback((key: string) => {
    const { start, end } = selection;
    const text = lastTextRef.current;

    switch (key) {
      case 'undo': {
        const entry = undoStack.current.undo();
        if (entry) {
          onChange(entry.text);
          lastTextRef.current = entry.text;
          setSelection(entry.selection);
        }
        return;
      }
      case 'redo': {
        const entry = undoStack.current.redo();
        if (entry) {
          onChange(entry.text);
          lastTextRef.current = entry.text;
          setSelection(entry.selection);
        }
        return;
      }
      case 'bold': apply(toggleBold(text, start, end)); return;
      case 'italic': apply(toggleItalic(text, start, end)); return;
      case 'strikethrough': apply(toggleStrikethrough(text, start, end)); return;
      case 'code': apply(toggleInlineCode(text, start, end)); return;
      case 'quote': apply(insertBlockquote(text, start)); return;
      case 'list': apply(insertBulletList(text, start)); return;
      case 'checklist': apply(insertChecklist(text, start)); return;
      case 'divider': apply(insertDivider(text, start)); return;
      case 'codeblock': {
        const lang = '';
        apply(insertCodeBlock(text, start, lang));
        return;
      }
      case 'heading1': apply(insertHeading(text, start, 1)); return;
      case 'heading2': apply(insertHeading(text, start, 2)); return;
      case 'heading3': apply(insertHeading(text, start, 3)); return;
      case 'numberedlist': apply(insertNumberedList(text, start)); return;
      case 'table': apply(insertTable(text, start)); return;
      case 'link': {
        setShowLinkInput(true);
        setTimeout(() => linkInputRef.current?.focus(), 100);
        return;
      }
      case 'media': {
        Alert.alert('Attach Media', 'Choose a source', [
          {
            text: 'Photo Library',
            onPress: async () => {
              const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!granted) return;
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
              });
              if (result.canceled || !result.assets?.[0]) return;
              const media = await MediaService.importMedia(result.assets[0].uri, 'image');
              apply(insertImage(lastTextRef.current, start, end, media.uri));
            },
          },
          {
            text: 'Take Photo',
            onPress: async () => {
              const { granted } = await ImagePicker.requestCameraPermissionsAsync();
              if (!granted) return;
              const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
              if (result.canceled || !result.assets?.[0]) return;
              const media = await MediaService.importMedia(result.assets[0].uri, 'image');
              apply(insertImage(lastTextRef.current, start, end, media.uri));
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }
      default: return;
    }
  }, [selection, apply, onChange]);

  const openSheet = useCallback(() => {
    Keyboard.dismiss();
    setTimeout(() => sheetRef.current?.snapToIndex(0), 200);
  }, []);

  const handleLinkSubmit = useCallback(() => {
    if (linkUrl.trim()) {
      apply(insertLink(lastTextRef.current, selection.start, selection.end, linkUrl.trim()));
      setLinkUrl('');
      setShowLinkInput(false);
    }
  }, [linkUrl, selection, apply]);

  const handleTextChange = useCallback((text: string) => {
    lastTextRef.current = text;
    onChange(text);
  }, [onChange]);

  return (
    <View style={styles.container}>
      <View style={styles.editorArea}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleTextChange}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          placeholder={placeholder ?? 'Start writing...'}
          placeholderTextColor={theme.textMuted}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            { color: theme.text },
          ]}
          scrollEnabled={false}
        />
      </View>

      {showLinkInput && (
        <View style={[styles.linkBar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
          <TextInput
            ref={linkInputRef}
            value={linkUrl}
            onChangeText={setLinkUrl}
            placeholder="Paste link URL..."
            placeholderTextColor={theme.textMuted}
            style={[styles.linkInput, { color: theme.text, backgroundColor: theme.surface }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleLinkSubmit}
          />
          <Pressable onPress={handleLinkSubmit} style={styles.linkDone}>
            <SymbolView name="checkmark" tintColor={theme.tint} size={18} />
          </Pressable>
          <Pressable onPress={() => { setShowLinkInput(false); setLinkUrl(''); }} style={styles.linkDone}>
            <SymbolView name="xmark" tintColor={theme.textSecondary} size={18} />
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={openSheet}
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        <SymbolView name="textformat" tintColor="#FFFFFF" size={22} />
      </Pressable>

      <FormattingSheet sheetRef={sheetRef} onAction={handleAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  linkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    borderTopWidth: 1,
  },
  linkInput: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
  },
  linkDone: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
