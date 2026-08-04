import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { IconChevronLeft, IconCheck, IconEraser, IconPencil, IconTrash } from '@tabler/icons-react-native';
import RNSketchCanvas from '@sourcetoad/react-native-sketch-canvas';
import * as Haptics from 'expo-haptics';
import { Directory, File, Paths } from 'expo-file-system';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MediaService } from '@/services/media-service';
import { openJournal } from '@/services/journal-nav';

const PEN_SIZES = [2, 4, 8, 16];
const COLORS = ['#000000', '#666666', '#999999', '#208AEF', '#FF453A', '#30D158', '#FF9F0A'];

export default function CanvasScreen() {
  const theme = useTheme();
  const canvasRef = useRef<RNSketchCanvas>(null);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [penSize, setPenSize] = useState(4);
  const [penColor, setPenColor] = useState('#000000');
  const [pathsCount, setPathsCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const pendingBase64Ref = useRef<string | null>(null);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pathsCount > 0) {
      Alert.alert('Discard sketch?', 'You have unsaved changes.', [
        { text: 'Keep drawing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }, [pathsCount]);

  const handleUndo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    canvasRef.current?.undo();
  }, []);

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Clear canvas', 'Remove all strokes?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => canvasRef.current?.clear() },
    ]);
  }, []);

  const handleGenerateBase64 = useCallback(async (result: { base64: string }) => {
    if (!result.base64) return;
    pendingBase64Ref.current = result.base64;

    if (!saving) {
      try {
        setSaving(true);
        const timestamp = Date.now();
        const filename = `sketch-${timestamp}.png`;
        const dir = new Directory(Paths.document, 'media');
        if (!dir.exists) {
          dir.create({ intermediates: true, idempotent: true });
        }
        const file = new File(dir, filename);
        file.write(result.base64, { encoding: 'base64' });
        const filePath = file.uri;

        const media = await MediaService.importMedia(filePath, 'image');
        Alert.alert('Sketch saved', 'Add it to your note?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to note',
            onPress: () => {
              router.dismiss();
              openJournal({ sketchUri: media.uri });
            },
          },
        ]);
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not save sketch');
      } finally {
        setSaving(false);
      }
    }
  }, [saving]);

  const handleSave = useCallback(() => {
    if (pathsCount === 0) {
      Alert.alert('Empty canvas', 'Draw something first.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    canvasRef.current?.getBase64('png', false, true, false, true);
  }, [pathsCount]);

  const currentStrokeColor = tool === 'eraser' ? theme.background : penColor;
  const currentStrokeWidth = tool === 'eraser' ? penSize * 4 : penSize;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={handleBack} style={styles.headerAction}>
          <IconChevronLeft size={20} color={theme.tint} />
          <ThemedText type="default" themeColor="tint">Back</ThemedText>
        </Pressable>
        <ThemedText type="default" style={styles.headerTitle}>Sketch</ThemedText>
        <Pressable onPress={handleSave} style={styles.headerAction} disabled={saving}>
          <IconCheck size={20} color={saving ? theme.textMuted : theme.tint} />
          <ThemedText type="default" themeColor={saving ? 'textMuted' : 'tint'}>
            {saving ? 'Saving...' : 'Save'}
          </ThemedText>
        </Pressable>
      </ThemedView>

      {/* Canvas */}
      <View style={[styles.canvasContainer, { backgroundColor: theme.background }]}>
        <RNSketchCanvas
          ref={canvasRef}
          containerStyle={styles.canvas}
          strokeColors={[{ color: currentStrokeColor }]}
          defaultStrokeWidth={currentStrokeWidth}
          onPathsChange={(count: number) => setPathsCount(count)}
          onGenerateBase64={handleGenerateBase64}
        />
      </View>

      {/* Toolbar */}
      <ThemedView style={[styles.toolbar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {/* Tool toggle */}
        <View style={styles.toolGroup}>
          <Pressable
            onPress={() => setTool('pen')}
            style={[styles.toolButton, tool === 'pen' && { backgroundColor: theme.primary }]}
          >
            <IconPencil size={18} color={tool === 'pen' ? '#FFFFFF' : theme.text} />
          </Pressable>
          <Pressable
            onPress={() => setTool('eraser')}
            style={[styles.toolButton, tool === 'eraser' && { backgroundColor: theme.primary }]}
          >
            <IconEraser size={18} color={tool === 'eraser' ? '#FFFFFF' : theme.text} />
          </Pressable>
        </View>

        {/* Pen sizes */}
        {tool === 'pen' && (
          <View style={styles.toolGroup}>
            {PEN_SIZES.map((size) => (
              <Pressable
                key={size}
                onPress={() => setPenSize(size)}
                style={[styles.sizeButton, penSize === size && { borderColor: theme.primary, borderWidth: 2 }]}
              >
                <View style={[styles.sizeDot, { width: size + 4, height: size + 4, backgroundColor: penColor }]} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Colors */}
        {tool === 'pen' && (
          <View style={styles.toolGroup}>
            {COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => setPenColor(color)}
                style={[styles.colorButton, penColor === color && { borderColor: theme.primary, borderWidth: 2 }]}
              >
                <View style={[styles.colorDot, { backgroundColor: color }]} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.toolGroup}>
          <Pressable onPress={handleUndo} style={styles.toolButton}>
            <ThemedText type="small">Undo</ThemedText>
          </Pressable>
          <Pressable onPress={handleClear} style={styles.toolButton}>
            <IconTrash size={18} color={theme.error} />
          </Pressable>
        </View>
      </ThemedView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  toolButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  sizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sizeDot: {
    borderRadius: 99,
  },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
