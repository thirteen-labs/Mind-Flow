import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

import type { Media, MediaType } from '@/constants/media';
import { MEDIA_DIRECTORY } from '@/constants/media';

const MEDIA_BASE = `${(FileSystem as any).documentDirectory}${MEDIA_DIRECTORY}`;

function uuid(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function extFromUri(uri: string): string {
  const match = uri.match(/\.(\w+)(\?|$)/);
  return match ? match[1].toLowerCase() : 'bin';
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav',
    ogg: 'audio/ogg', pdf: 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}

function typeFromMime(mime: string): MediaType {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf')) return 'pdf';
  return 'image';
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MEDIA_BASE);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_BASE, { intermediates: true });
  }
}

export const MediaService = {
  async importMedia(sourceUri: string, type?: MediaType): Promise<Media> {
    await ensureDir();
    const ext = extFromUri(sourceUri);
    const id = uuid();
    const filename = `${id}.${ext}`;
    const dest = `${MEDIA_BASE}/${filename}`;

    if (sourceUri !== dest) {
      await FileSystem.copyAsync({ from: sourceUri, to: dest });
    }

    const fileInfo: any = await FileSystem.getInfoAsync(dest);
    const mimeType = mimeFromExt(ext);
    const resolvedType = type ?? typeFromMime(mimeType);

    return {
      id,
      uri: dest,
      type: resolvedType,
      mimeType,
      sizeBytes: fileInfo.exists ? (fileInfo as any).size ?? null : null,
      durationSeconds: null,
      width: null,
      height: null,
      thumbnailUri: null,
      createdAt: new Date().toISOString(),
    };
  },

  async deleteMedia(uri: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  },

  async getMediaInfo(uri: string): Promise<{ size: number } | null> {
    const info: any = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    return { size: (info as any).size ?? 0 };
  },

  async pickImage(): Promise<Media | null> {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return this.importMedia(result.assets[0].uri, 'image');
  },

  async pickVideo(): Promise<Media | null> {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return this.importMedia(result.assets[0].uri, 'video');
  },

  async takePhoto(): Promise<Media | null> {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return this.importMedia(result.assets[0].uri, 'image');
  },

  async recordVideo(): Promise<Media | null> {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return this.importMedia(result.assets[0].uri, 'video');
  },

  getFileSizeLabel(bytes: number | null): string {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  },

  getDurationLabel(seconds: number | null): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },
};

export async function scanAllMedia(): Promise<Media[]> {
  try {
    const dir = `${(FileSystem as any).documentDirectory}${MEDIA_DIRECTORY}`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) return [];

    const files = await FileSystem.readDirectoryAsync(dir);
    const items: Media[] = [];

    for (const file of files) {
      const uri = `${dir}/${file}`;
      const ext = extFromUri(file);
      const mimeType = mimeFromExt(ext);
      const mediaType = typeFromMime(mimeType);
      const id = file.replace(/\.[^.]+$/, '');

      const fileInfo: any = await FileSystem.getInfoAsync(uri);

      items.push({
        id,
        uri,
        type: mediaType,
        mimeType,
        sizeBytes: fileInfo.exists ? (fileInfo as any).size ?? null : null,
        durationSeconds: null,
        width: null,
        height: null,
        thumbnailUri: null,
        createdAt: new Date().toISOString(),
      });
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  } catch {
    return [];
  }
}

export async function requestMediaPermissions() {
  if (Platform.OS === 'web') return true;
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return granted;
}
