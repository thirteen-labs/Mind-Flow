import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Media, MediaType } from '@/constants/media';
import { MEDIA_DIRECTORY } from '@/constants/media';

const MEDIA_DIR = new Directory(Paths.document, ...MEDIA_DIRECTORY.split('/'));

function uuid(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function extFromUri(uri: string): string {
  const match = uri.match(/\.(\w+)(\?|$)/);
  return match ? match[1].toLowerCase() : '';
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
    'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
    'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav',
    'audio/ogg': 'ogg', 'application/pdf': 'pdf',
  };
  return map[mime] ?? '';
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
    heif: 'image/heif', mp4: 'video/mp4', mov: 'video/quicktime',
    webm: 'video/webm', m4a: 'audio/mp4', mp3: 'audio/mpeg',
    wav: 'audio/wav', ogg: 'audio/ogg', pdf: 'application/pdf',
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
  if (!MEDIA_DIR.exists) {
    MEDIA_DIR.create({ intermediates: true, idempotent: true });
  }
}

function fileForUri(uri: string): File {
  return new File(uri);
}

export const MediaService = {
  async importMedia(sourceUri: string, type?: MediaType, source?: { fileName?: string | null; mimeType?: string | null }): Promise<Media> {
    await ensureDir();

    let ext = source?.fileName ? extFromUri(source.fileName) : extFromUri(sourceUri);
    let mimeType = source?.mimeType ?? mimeFromExt(ext);

    if (!ext && mimeType && mimeType !== 'application/octet-stream') {
      ext = extFromMime(mimeType);
    }
    if (!ext) ext = 'bin';

    const id = uuid();
    const filename = `${id}.${ext}`;
    const dest = new File(MEDIA_DIR, filename);

    const src = fileForUri(sourceUri);
    if (src.uri !== dest.uri) {
      await src.copy(dest, { overwrite: true });
    }

    const resolvedType = type ?? typeFromMime(mimeType);

    return {
      id,
      uri: dest.uri,
      type: resolvedType,
      mimeType,
      sizeBytes: dest.exists ? dest.size || null : null,
      durationSeconds: null,
      width: null,
      height: null,
      thumbnailUri: null,
      createdAt: new Date().toISOString(),
    };
  },

  async deleteMedia(uri: string): Promise<void> {
    const file = fileForUri(uri);
    if (file.exists) {
      file.delete();
    }
  },

  async getMediaInfo(uri: string): Promise<{ size: number } | null> {
    const file = fileForUri(uri);
    if (!file.exists) return null;
    return { size: file.size };
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
    const asset = result.assets[0];
    return this.importMedia(asset.uri, 'image', { fileName: asset.fileName, mimeType: asset.mimeType });
  },

  async pickVideo(): Promise<Media | null> {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return this.importMedia(asset.uri, 'video', { fileName: asset.fileName, mimeType: asset.mimeType });
  },

  async takePhoto(): Promise<Media | null> {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return this.importMedia(asset.uri, 'image', { fileName: asset.fileName, mimeType: asset.mimeType });
  },

  async recordVideo(): Promise<Media | null> {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
    });

    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return this.importMedia(asset.uri, 'video', { fileName: asset.fileName, mimeType: asset.mimeType });
  },

  async saveMediaRecord(db: SQLiteDatabase, media: Media, journalId?: string): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO media (id, uri, type, filename, mime_type, file_size, created_at, journal_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      media.id,
      media.uri,
      media.type,
      media.uri.split('/').pop() ?? media.id,
      media.mimeType,
      media.sizeBytes,
      media.createdAt,
      journalId ?? null
    );
  },

  async getJournalMedia(db: SQLiteDatabase, journalId: string): Promise<Media[]> {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM media WHERE journal_id = ? ORDER BY created_at ASC',
      journalId
    );
    return rows.map((r: any) => ({
      id: r.id,
      uri: r.uri,
      type: r.type,
      mimeType: r.mime_type,
      sizeBytes: r.file_size,
      durationSeconds: null,
      width: null,
      height: null,
      thumbnailUri: null,
      createdAt: r.created_at,
    }));
  },

  async deleteMediaRecord(db: SQLiteDatabase, id: string): Promise<void> {
    const row = await db.getFirstAsync<{ uri: string }>('SELECT uri FROM media WHERE id = ?', id);
    if (row) {
      await this.deleteMedia(row.uri);
    }
    await db.runAsync('DELETE FROM media WHERE id = ?', id);
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
    if (!MEDIA_DIR.exists) return [];

    const files = MEDIA_DIR.list();
    const items: Media[] = [];

    for (const entry of files) {
      if (entry instanceof Directory) continue;
      const file = entry as File;
      const ext = extFromUri(file.name);
      const mimeType = mimeFromExt(ext);
      const mediaType = typeFromMime(mimeType);
      const id = file.name.replace(/\.[^.]+$/, '');
      const created = file.creationTime ? new Date(file.creationTime).toISOString() : new Date().toISOString();

      items.push({
        id,
        uri: file.uri,
        type: mediaType,
        mimeType,
        sizeBytes: file.exists ? file.size || null : null,
        durationSeconds: null,
        width: null,
        height: null,
        thumbnailUri: null,
        createdAt: created,
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
