import { useCallback, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { IconCheck, IconPaperclip, IconPencil, IconSearch, IconTypography, IconX, IconBold, IconItalic, IconUnderline, IconStrikethrough, IconHighlight, IconList, IconListNumbers, IconLink, IconH1, IconH2, IconH3, IconCheckbox } from '@tabler/icons-react-native';

import FormattingSheet from './formatting-sheet';
import {
  createUndoStack,
  insertBlockquote,
  insertBulletList,
  insertChecklist,
  insertCodeBlock,
  insertDivider,
  insertFile,
  insertHeading,
  insertImage,
  insertLink,
  insertNumberedList,
  insertTable,
  insertVideo,
  insertAudio,
  toggleBold,
  toggleInlineCode,
  toggleItalic,
  toggleStrikethrough,
  toggleUnderline,
  toggleHighlight,
} from './formatting';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { MediaService } from '@/services/media-service';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MarkdownEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function MarkdownEditor({ value, onChange, placeholder, readOnly = false }: MarkdownEditorProps) {
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [preview, setPreview] = useState(false);
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

  const attachImage = useCallback(async (start: number, end: number) => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const media = await MediaService.importMedia(asset.uri, 'image', { fileName: asset.fileName, mimeType: asset.mimeType });
    apply(insertImage(lastTextRef.current, start, end, media.uri));
  }, [apply]);

  const attachVideo = useCallback(async (start: number, end: number) => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const media = await MediaService.importMedia(asset.uri, 'video', { fileName: asset.fileName, mimeType: asset.mimeType });
    apply(insertVideo(lastTextRef.current, start, end, media.uri));
  }, [apply]);

  const attachAudio = useCallback(async (start: number, end: number) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const media = await MediaService.importMedia(asset.uri, 'audio', { fileName: asset.name, mimeType: asset.mimeType });
    const title = asset.name?.replace(/\.[^/.]+$/, '') || 'audio';
    apply(insertAudio(lastTextRef.current, start, end, media.uri, title));
  }, [apply]);

  const attachFile = useCallback(async (start: number, end: number) => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const media = await MediaService.importMedia(asset.uri, undefined, { fileName: asset.name, mimeType: asset.mimeType });
    const title = asset.name?.replace(/\.[^/.]+$/, '') || 'file';
    apply(insertFile(lastTextRef.current, start, end, media.uri, title));
  }, [apply]);

  const showAttachOptions = useCallback((includeSketch: boolean) => {
    const { start, end } = selection;
    const options: {
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }[] = [
      { text: 'Image', onPress: () => attachImage(start, end) },
      { text: 'Video', onPress: () => attachVideo(start, end) },
      { text: 'Audio', onPress: () => attachAudio(start, end) },
      { text: 'File', onPress: () => attachFile(start, end) },
    ];
    if (includeSketch) {
      options.push({ text: 'Sketch', onPress: () => router.push('/canvas' as any) });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Attach Media', 'Choose a media type', options);
  }, [selection, attachImage, attachVideo, attachAudio, attachFile]);

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
      case 'underline': apply(toggleUnderline(text, start, end)); return;
      case 'strikethrough': apply(toggleStrikethrough(text, start, end)); return;
      case 'highlight': apply(toggleHighlight(text, start, end)); return;
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
        showAttachOptions(false);
        return;
      }
      default: return;
    }
  }, [selection, apply, onChange, showAttachOptions]);

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

  const togglePreview = useCallback(() => {
    Keyboard.dismiss();
    setPreview((p) => !p);
  }, []);

  const handleAttach = useCallback(() => {
    showAttachOptions(true);
  }, [showAttachOptions]);

  return (
    <View style={styles.container}>
      {readOnly ? (
        <ScrollView
          style={styles.previewArea}
          contentContainerStyle={styles.previewContent}
          showsVerticalScrollIndicator={false}
        >
          <MarkdownRenderer content={value || ''} />
        </ScrollView>
      ) : (
        <>
      <View style={styles.modeBar}>
        <Pressable
          onPress={handleAttach}
          style={[styles.modeButton, { backgroundColor: theme.backgroundElement }]}
        >
          <IconPaperclip size={16} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={togglePreview}
          style={[styles.modeButton, preview && { backgroundColor: theme.primary }]}
        >
          <IconSearch size={16} color={preview ? '#FFFFFF' : theme.text} />
        </Pressable>
        <Pressable
          onPress={() => { setPreview(false); inputRef.current?.focus(); }}
          style={[styles.modeButton, !preview && { backgroundColor: theme.primary }]}
        >
          <IconPencil size={16} color={!preview ? '#FFFFFF' : theme.text} />
        </Pressable>
      </View>

      {preview ? (
        <ScrollView
          style={styles.previewArea}
          contentContainerStyle={styles.previewContent}
          showsVerticalScrollIndicator={false}
        >
          <MarkdownRenderer content={value || ''} />
        </ScrollView>
      ) : (
        <>
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
              scrollEnabled
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
                <IconCheck color={theme.tint} size={18} />
              </Pressable>
              <Pressable onPress={() => { setShowLinkInput(false); setLinkUrl(''); }} style={styles.linkDone}>
                <IconX color={theme.textSecondary} size={18} />
              </Pressable>
            </View>
          )}
        </>
      )}

      {!preview && (
        <View style={[styles.toolbar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <Pressable onPress={() => handleAction('bold')} style={styles.toolbarButton}>
            <IconBold size={18} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('italic')} style={styles.toolbarButton}>
            <IconItalic size={18} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('underline')} style={styles.toolbarButton}>
            <IconUnderline size={18} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('strikethrough')} style={styles.toolbarButton}>
            <IconStrikethrough size={18} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('highlight')} style={styles.toolbarButton}>
            <IconHighlight size={18} color={theme.text} />
          </Pressable>
          <View style={[styles.toolbarDivider, { backgroundColor: theme.border }]} />
          <Pressable onPress={() => handleAction('heading1')} style={styles.toolbarButton}>
            <IconH1 size={18} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('heading2')} style={styles.toolbarButton}>
            <IconH2 size={18} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('heading3')} style={styles.toolbarButton}>
            <IconH3 size={18} color={theme.text} />
          </Pressable>
          <View style={[styles.toolbarDivider, { backgroundColor: theme.border }]} />
          <Pressable onPress={() => handleAction('list')} style={styles.toolbarButton}>
            <IconList size={18} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('numberedlist')} style={styles.toolbarButton}>
            <IconListNumbers size={18} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => handleAction('checklist')} style={styles.toolbarButton}>
            <IconCheckbox size={18} color={theme.text} />
          </Pressable>
          <View style={[styles.toolbarDivider, { backgroundColor: theme.border }]} />
          <Pressable onPress={() => handleAction('link')} style={styles.toolbarButton}>
            <IconLink size={18} color={theme.text} />
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={preview ? togglePreview : openSheet}
        style={[styles.fab, { backgroundColor: theme.primary }]}
      >
        {preview
          ? <IconPencil color="#FFFFFF" size={22} />
          : <IconTypography color="#FFFFFF" size={22} />
        }
      </Pressable>

      <FormattingSheet sheetRef={sheetRef} onAction={handleAction} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  modeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorArea: {
    flex: 1,
    paddingTop: Spacing.three,
  },
  previewArea: {
    flex: 1,
    paddingTop: Spacing.three,
  },
  previewContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: 0,
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
    bottom: Spacing.five,
    right: Spacing.five,
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    gap: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    marginHorizontal: Spacing.one,
  },
});
