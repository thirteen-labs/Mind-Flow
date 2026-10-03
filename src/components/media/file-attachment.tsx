import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  IconDownload,
  IconFile,
  IconFileTypePdf,
  IconMusic,
  IconPlayerPlay,
} from '@tabler/icons-react-native';

import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Kind = 'pdf' | 'video' | 'audio' | 'image' | 'file';

/** Derives a displayable label, icon, and kind from a local attachment path. */
function describe(uri: string, label: string): { name: string; kind: Kind } {
  const lower = uri.toLowerCase().split('?')[0];
  const name = label || uri.split('/').pop() || 'Attachment';

  if (lower.endsWith('.pdf')) return { name, kind: 'pdf' };
  if (/\.(mp4|mov|webm|3gp|m4v)$/.test(lower)) return { name, kind: 'video' };
  if (/\.(mp3|m4a|wav|ogg|aac|flac|weba)$/.test(lower)) return { name, kind: 'audio' };
  if (/\.(png|jpe?g|gif|webp|heic|heif|avif|bmp|tiff?)$/.test(lower)) return { name, kind: 'image' };
  return { name, kind: 'file' };
}

const KIND_ICON = {
  pdf: IconFileTypePdf,
  video: IconPlayerPlay,
  audio: IconMusic,
  image: IconFile,
  file: IconFile,
} as const;

const KIND_LABEL: Record<Kind, string> = {
  pdf: 'PDF',
  video: 'Video',
  audio: 'Audio',
  image: 'Image',
  file: 'File',
};

/**
 * Renders a local file attachment inside a note.
 *
 * Local paths cannot be opened with `Linking.openURL` — that only works for
 * http(s) and registered custom schemes. Previous versions rendered every file
 * attachment as a plain link, so tapping it did nothing at all. This card
 * opens the file with the platform viewer (or shares it) instead, and always
 * offers Share as a guaranteed fallback.
 */
export function FileAttachment({ uri, label }: { uri: string; label: string }) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const { name, kind } = describe(uri, label);
  const IconEl = KIND_ICON[kind];

  const handleShare = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: name, url: uri });
        } else {
          await navigator.clipboard.writeText(uri);
        }
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { dialogTitle: name });
        return;
      }
      await Share.share({ url: uri, title: name });
    } catch (e) {
      // A user-cancelled share sheet rejects too — don't alarm them about it.
      if ((e as Error)?.name === 'AbortError') return;
      Alert.alert('Could not share', (e as Error)?.message ?? 'Sharing is unavailable for this file.');
    }
  }, [uri, name]);

  const handleOpen = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Reading the file first surfaces a clear error if it is missing.
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        Alert.alert('File missing', 'This attachment is no longer available on this device.');
        return;
      }

      if (Platform.OS === 'web') {
        // No native share sheet on web — hand the URL to the browser.
        window.open(uri, '_blank', 'noopener,noreferrer');
        return;
      }

      // On iOS/Android `shareAsync` routes the file to the viewer's
      // "Open with" flow, which is the supported way to preview a local file.
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          dialogTitle: name,
          UTI: kind === 'pdf' ? 'com.adobe.pdf' : undefined,
        });
        return;
      }
      await Share.share({ url: uri, title: name });
    } catch (e) {
      const message = (e as Error)?.message ?? 'This file type cannot be opened here.';
      Alert.alert('Could not open file', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share instead', onPress: () => void handleShare() },
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, uri, name, kind, handleShare]);

  return (
    <Pressable
      onPress={handleOpen}
      onLongPress={handleShare}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${KIND_LABEL[kind]}: ${name}`}
      accessibilityHint="Opens the file. Long press to share."
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      {kind === 'image' ? (
        // Images attached without `![alt]()` syntax still get a real preview.
        <Image
          source={{ uri }}
          style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]}
          contentFit="cover"
          transition={150}
          accessible={false}
        />
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(theme.primary, 0.14) }]}>
          <IconEl size={20} color={theme.primary} />
        </View>
      )}
      <View style={styles.text}>
        <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>{KIND_LABEL[kind]}</Text>
      </View>
      <IconDownload size={18} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
    // Inline nodes render inside <Text>; align them like block media.
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web' ? { maxWidth: '100%' as const } : null),
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  text: {
    flexShrink: 1,
    gap: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
  },
  meta: {
    fontSize: 12,
  },
});