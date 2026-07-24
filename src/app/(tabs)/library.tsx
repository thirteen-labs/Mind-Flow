import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Media } from '@/constants/media';
import { useTheme } from '@/hooks/use-theme';
import { MediaService, scanAllMedia } from '@/services/media-service';

const SCREEN = Dimensions.get('window');
const COLUMNS = 3;
const GAP = Spacing.two;
const CELL_SIZE = (SCREEN.width - Spacing.four * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

export default function LibraryScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Media | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await scanAllMedia();
    setItems(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await scanAllMedia();
      if (!cancelled) {
        setItems(result);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = useCallback((media: Media) => {
    Alert.alert('Delete', 'Remove this media from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await MediaService.deleteMedia(media.uri);
          setItems((prev) => prev.filter((m) => m.id !== media.id));
          setPreview(null);
        },
      },
    ]);
  }, []);

  const handleImport = useCallback(async (action: () => Promise<Media | null>) => {
    setShowImport(false);
    setImporting(true);
    try {
      const media = await action();
      if (media) {
        setItems((prev) => [media, ...prev]);
      }
    } finally {
      setImporting(false);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Media }) => (
      <Pressable
        onPress={() => setPreview(item)}
        onLongPress={() => handleDelete(item)}
        style={styles.cell}
      >
        {item.type === 'image' ? (
          <Image
            source={{ uri: item.uri }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <ThemedView type="backgroundElement" style={styles.placeholder}>
            <SymbolView
              name={item.type === 'video' ? 'play.rectangle' : 'music.note'}
              size={24}
              tintColor={theme.textSecondary}
            />
          </ThemedView>
        )}
        {item.type !== 'image' && (
          <ThemedView type="surface" style={styles.typeBadge}>
            <ThemedText type="small" themeColor="textSecondary">
              {item.type === 'video' ? 'VIDEO' : 'AUDIO'}
            </ThemedText>
          </ThemedView>
        )}
      </Pressable>
    ),
    [theme, handleDelete]
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerRow}>
          <ThemedText type="title">Library</ThemedText>
          <Pressable onPress={() => setShowImport(true)} style={[styles.importBtn, { backgroundColor: theme.primary }]}>
            <SymbolView name="plus" size={18} tintColor="#FFFFFF" />
          </Pressable>
        </ThemedView>
        <ThemedText type="default" themeColor="textSecondary">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </ThemedText>
      </ThemedView>

      <FlatList
        data={items}
        numColumns={COLUMNS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        onRefresh={refresh}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <ThemedView style={styles.empty}>
              <SymbolView name="photo.on.rectangle" size={48} tintColor={theme.textMuted} />
              <ThemedText type="default" themeColor="textSecondary">
                No media yet
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Add images, videos, or audio to your notes
              </ThemedText>
            </ThemedView>
          ) : null
        }
      />

      <Modal visible={!!preview} transparent animationType="fade">
        <View style={[styles.overlay, { backgroundColor: theme.background }]}>
          <Pressable
            onPress={() => setPreview(null)}
            style={[styles.closeButton, { backgroundColor: theme.surface }]}
          >
            <SymbolView name="xmark" tintColor={theme.text} size={18} />
          </Pressable>

          {preview?.type === 'image' && (
            <Pressable onPress={() => setPreview(null)} style={styles.previewArea}>
              <Image
                source={{ uri: preview.uri }}
                style={styles.previewImage}
                contentFit="contain"
              />
            </Pressable>
          )}

          {preview?.type === 'video' && (
            <ThemedView style={styles.previewInfo}>
              <SymbolView name="play.rectangle" size={48} tintColor={theme.text} />
              <ThemedText type="title">Video</ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.previewUri}>
                {preview.uri.split('/').pop()}
              </ThemedText>
            </ThemedView>
          )}

          {preview?.type === 'audio' && (
            <ThemedView style={styles.previewInfo}>
              <SymbolView name="music.note" size={48} tintColor={theme.text} />
              <ThemedText type="title">Audio</ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.previewUri}>
                {preview.uri.split('/').pop()}
              </ThemedText>
            </ThemedView>
          )}

          {preview && (
            <Pressable
              onPress={() => handleDelete(preview)}
              style={[styles.deleteButton, { backgroundColor: theme.error }]}
            >
              <SymbolView name="trash" tintColor="#FFFFFF" size={16} />
              <ThemedText style={styles.deleteText}>Delete</ThemedText>
            </Pressable>
          )}
        </View>
      </Modal>

      {importing && (
        <View style={[styles.importingOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      <Modal visible={showImport} transparent animationType="fade">
        <Pressable style={styles.sheetOverlay} onPress={() => setShowImport(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <ThemedText type="default" style={styles.sheetTitle}>Import Media</ThemedText>
            <Pressable
              onPress={() => handleImport(() => MediaService.pickImage())}
              style={[styles.sheetOption, { borderBottomColor: theme.border }]}
            >
              <SymbolView name="photo" size={22} tintColor={theme.text} />
              <ThemedText type="default">Image from Library</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleImport(() => MediaService.takePhoto())}
              style={[styles.sheetOption, { borderBottomColor: theme.border }]}
            >
              <SymbolView name="camera" size={22} tintColor={theme.text} />
              <ThemedText type="default">Take Photo</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleImport(() => MediaService.pickVideo())}
              style={[styles.sheetOption, { borderBottomColor: theme.border }]}
            >
              <SymbolView name="video" size={22} tintColor={theme.text} />
              <ThemedText type="default">Video from Library</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleImport(() => MediaService.recordVideo())}
              style={styles.sheetOption}
            >
              <SymbolView name="video.badge.plus" size={22} tintColor={theme.text} />
              <ThemedText type="default">Record Video</ThemedText>
            </Pressable>
            <Pressable onPress={() => setShowImport(false)} style={[styles.sheetCancel, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="default" themeColor="textMuted">Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  importBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: Spacing.one,
    left: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: Spacing.three,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.four,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  previewImage: {
    width: SCREEN.width,
    height: SCREEN.height,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  previewUri: {
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.three,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  importingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  sheetTitle: {
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
});
