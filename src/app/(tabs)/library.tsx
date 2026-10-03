import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import {
  IconCamera,
  IconFile,
  IconFileTypePdf,
  IconMusic,
  IconPhoto,
  IconPlayerPlay,
  IconPlus,
  IconTrash,
  IconVideo,
  IconVideoPlus,
  IconX,
} from '@tabler/icons-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AudioPlayer } from '@/components/media/audio-player';
import { VideoPlayer } from '@/components/media/video-player';
import { CustomModal } from '@/components/ui/modal';
import { Spacing } from '@/constants/theme';
import type { Media } from '@/constants/media';
import { useTheme } from '@/hooks/use-theme';
import { MediaService, scanAllMedia } from '@/services/media-service';

const COLUMNS = 3;
const GAP = Spacing.two;
const GRID_PADDING = Spacing.three;

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const CELL_SIZE = (screenWidth - GRID_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Media | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { const result = await scanAllMedia(); setItems(result); } catch { /* keep previous items, surface via empty state */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await scanAllMedia();
        if (!cancelled) { setItems(result); }
      } catch { /* show empty/permission hint via list empty */ }
      finally { if (!cancelled) setLoading(false); }
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
    ({ item }: { item: Media[] }) => (
      <View style={styles.row}>
        {item.map((media) => {
          // Non-media attachments (documents, archives, code) get a generic
          // placeholder instead of being force-rendered as a broken image.
          const previewable = media.type === 'image' || media.type === 'video' || media.type === 'audio';
          const label = media.filename ?? `${media.type} file`;
          return (
            <Pressable
              key={media.uri}
              onPress={() => setPreview(media)}
              onLongPress={() => handleDelete(media)}
              accessibilityRole="button"
              accessibilityLabel={`${media.type}: ${label}`}
              accessibilityHint="Tap to preview, long press to delete"
              hitSlop={8}
              style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}
            >
              {media.type === 'image' ? (
                <Image
                  source={{ uri: media.uri }}
                  style={styles.thumb}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.placeholder, { backgroundColor: theme.backgroundElement }]}>
                  {media.type === 'video' ? (
                    <IconPlayerPlay size={24} color={theme.textSecondary} />
                  ) : media.type === 'audio' ? (
                    <IconMusic size={24} color={theme.textSecondary} />
                  ) : media.type === 'pdf' ? (
                    <IconFileTypePdf size={24} color={theme.textSecondary} />
                  ) : (
                    <IconFile size={24} color={theme.textSecondary} />
                  )}
                </View>
              )}
              {!previewable && (
                <View style={[styles.typeBadge, { backgroundColor: theme.surface }]}>
                  <Text
                    numberOfLines={1}
                    style={[styles.typeBadgeText, { color: theme.textSecondary }]}
                  >
                    {(media.filename?.split('.').pop() ?? media.type).toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    ),
    [theme, handleDelete, CELL_SIZE]
  );

  const rows = useMemo(() => {
    const result: Media[][] = [];
    for (let i = 0; i < items.length; i += COLUMNS) {
      result.push(items.slice(i, i + COLUMNS));
    }
    return result;
  }, [items]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText style={styles.pageTitle}>Library</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => setShowImport(true)}
            accessibilityRole="button"
            accessibilityLabel="Import media"
            accessibilityHint="Choose media to add to your library"
            hitSlop={8}
            style={({ pressed }) => [styles.importBtn, { backgroundColor: theme.primary }, pressed && { opacity: 0.85 }]}
          >
            <IconPlus size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <FlashList
        data={rows}
        keyExtractor={(row, index) => row[0]?.uri ?? `row-${index}`}
        renderItem={renderItem}
        contentContainerStyle={[styles.grid, { paddingBottom: Spacing.five + insets.bottom }]}
        ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        onRefresh={refresh}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <ThemedView style={styles.empty}>
              <IconPhoto size={48} color={theme.textMuted} />
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

      <CustomModal visible={!!preview} onDismiss={() => setPreview(null)} variant="fullscreen">
        <View style={[styles.overlay, { backgroundColor: theme.background }]}>
          <Pressable
            onPress={() => setPreview(null)}
            style={[styles.closeButton, { backgroundColor: theme.surface, top: insets.top + Spacing.four }]}
          >
            <IconX size={18} color={theme.text} />
          </Pressable>

          {preview?.type === 'image' && (
            <Pressable onPress={() => setPreview(null)} style={styles.previewArea}>
              <Image
                source={{ uri: preview.uri }}
                style={[styles.previewImage, { width: screenWidth, height: screenWidth * 0.75 }]}
                contentFit="contain"
              />
            </Pressable>
          )}

          {preview?.type === 'video' && (
            <View style={[styles.previewMedia, { width: screenWidth - Spacing.four * 2 }]}>
              <VideoPlayer uri={preview.uri} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.previewUri}>
                {preview.filename ?? preview.uri.split('/').pop()}
              </ThemedText>
            </View>
          )}

          {preview?.type === 'audio' && (
            <View style={[styles.previewMedia, { width: screenWidth - Spacing.four * 2 }]}>
              <AudioPlayer uri={preview.uri} title={preview.filename ?? undefined} />
            </View>
          )}

          {preview && !['image', 'video', 'audio'].includes(preview.type) && (
            <View style={[styles.previewInfo, { top: insets.top + Spacing.four * 2 }]} pointerEvents="none">
              {preview.type === 'pdf' ? (
                <IconFileTypePdf size={48} color={theme.text} />
              ) : (
                <IconFile size={48} color={theme.text} />
              )}
              <ThemedText type="title">{preview.filename ?? 'Attachment'}</ThemedText>
            </View>
          )}

          {preview && (
            <Pressable
              onPress={() => handleDelete(preview)}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${preview.filename ?? 'this attachment'}`}
              style={[styles.deleteButton, { backgroundColor: theme.error, bottom: insets.bottom + Spacing.four }]}
            >
              <IconTrash size={16} color="#FFFFFF" />
              <ThemedText style={styles.deleteText}>Delete</ThemedText>
            </Pressable>
          )}
        </View>
      </CustomModal>

      {importing && (
        <View style={[styles.importingOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      <CustomModal
        visible={showImport}
        onDismiss={() => setShowImport(false)}
        variant="sheet"
        title="Import Media"
      >
        <View style={styles.sheetInner}>
          <Pressable
            onPress={() => handleImport(() => MediaService.pickImage())}
            style={[styles.sheetOption, { borderBottomColor: theme.border }]}
          >
            <IconPhoto size={22} color={theme.text} />
            <ThemedText type="default">Image from Library</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleImport(() => MediaService.takePhoto())}
            style={[styles.sheetOption, { borderBottomColor: theme.border }]}
          >
            <IconCamera size={22} color={theme.text} />
            <ThemedText type="default">Take Photo</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleImport(() => MediaService.pickVideo())}
            style={[styles.sheetOption, { borderBottomColor: theme.border }]}
          >
            <IconVideo size={22} color={theme.text} />
            <ThemedText type="default">Video from Library</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleImport(() => MediaService.recordVideo())}
            style={styles.sheetOption}
          >
            <IconVideoPlus size={22} color={theme.text} />
            <ThemedText type="default">Record Video</ThemedText>
          </Pressable>
          <Pressable onPress={() => setShowImport(false)} style={[styles.sheetCancel, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="default" themeColor="textMuted">Cancel</ThemedText>
          </Pressable>
        </View>
      </CustomModal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 6,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 30,
  },
  importBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: Spacing.five,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  rowSeparator: {
    height: GAP,
  },
  cell: {
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
    maxWidth: '80%',
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    top: Spacing.four,
    right: Spacing.four,
    zIndex: 10,
    width: 44,
    height: 44,
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
    width: '100%',
    aspectRatio: 1,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  previewMedia: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  previewUri: {
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute',
    bottom: Spacing.four,
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
  sheetInner: {
    padding: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
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
