import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Media, MediaType } from '@/constants/media';
import { MEDIA_DIRECTORY } from '@/constants/media';

function getMediaDir(): Directory {
  return new Directory(Paths.document, ...MEDIA_DIRECTORY.split('/'));
}

function uuid(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extracts a lowercase extension from a filename or URI.
 *
 * Deliberately rejects anything that does not look like a real extension so
 * that names like "report.v2" or "archive.2024" do not produce a bogus "v2"
 * extension — those become extension-less files instead.
 */
function extFromName(name: string): string {
  const clean = name.split('?')[0].split('#')[0];
  const match = clean.match(/\.([A-Za-z0-9]{1,8})$/);
  return match ? match[1].toLowerCase() : '';
}

/** Strips directories and unsafe characters from a user-supplied filename. */
function sanitizeFilename(name: string | null | undefined, fallbackExt: string): string {
  const base = (name ?? '')
    .split(/[\\/]/)
    .pop()!
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\.+/, '')
    .slice(0, 80);
  const safe = base.length > 0 ? base : 'attachment';
  return extFromName(safe) ? safe : `${safe}.${fallbackExt}`;
}

/**
 * Returns a File handle that does not clobber an existing attachment.
 *
 * Two different files can share a display name (e.g. two "notes.pdf" from
 * different folders). Without this, the second import would silently destroy
 * the first — and any note linking to it.
 */
function uniqueDest(dir: Directory, filename: string): File {
  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : '';
  let candidate = new File(dir, filename);
  let n = 1;
  while (candidate.exists) {
    n += 1;
    if (n > 100) {
      candidate = new File(dir, `${stem}_${uuid()}${ext}`);
      break;
    }
    candidate = new File(dir, `${stem} (${n})${ext}`);
  }
  return candidate;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
  'image/avif': 'avif', 'image/bmp': 'bmp', 'image/tiff': 'tiff',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'video/3gpp': '3gp', 'video/x-m4v': 'm4v',
  'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav',
  'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/aac': 'aac',
  'audio/flac': 'flac', 'audio/webm': 'weba',
  'application/pdf': 'pdf',
  'text/plain': 'txt', 'text/markdown': 'md', 'text/csv': 'csv',
  'text/html': 'html', 'text/css': 'css', 'application/json': 'json',
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
  heif: 'image/heif', avif: 'image/avif', bmp: 'image/bmp', tiff: 'image/tiff',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  '3gp': 'video/3gpp', m4v: 'video/x-m4v',
  m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav',
  ogg: 'audio/ogg', aac: 'audio/aac', flac: 'audio/flac', weba: 'audio/webm',
  pdf: 'application/pdf',
  txt: 'text/plain', md: 'text/markdown', csv: 'text/csv',
  html: 'text/html', css: 'text/css', json: 'application/json',
};

function extFromMime(mime: string): string {
  return MIME_TO_EXT[mime.split(';')[0].trim().toLowerCase()] ?? '';
}

function mimeFromExt(ext: string): string {
  return EXT_TO_MIME[ext.toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Maps a MIME type to a media type.
 *
 * Anything we do not specifically recognise is a generic `file` — previously
 * this fell back to `'image'`, which caused non-media attachments (documents,
 * archives, code) to be rendered as broken images in the library.
 */
function typeFromMime(mime: string): MediaType {
  const base = mime.split(';')[0].trim().toLowerCase();
  if (base.startsWith('image/')) return 'image';
  if (base.startsWith('video/')) return 'video';
  if (base.startsWith('audio/')) return 'audio';
  if (base === 'application/pdf') return 'pdf';
  return 'file';
}

async function ensureDir(): Promise<void> {
  try {
    const dir = getMediaDir();
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }
  } catch {}
}

/** Reads a file's size without letting a filesystem error abort the import. */
function safeSize(file: File): number | null {
  try {
    return file.exists && file.size ? file.size : null;
  } catch {
    return null;
  }
}

export const MediaService = {
  /**
   * Copies a picked asset into the app's media directory.
   *
   * The original filename is preserved in the returned `Media` and used as the
   * on-disk name (sanitised), so attachments remain identifiable in the
   * library instead of appearing as opaque UUIDs.
   */
  async importMedia(
    sourceUri: string,
    type?: MediaType,
    source?: { fileName?: string | null; mimeType?: string | null; fileSize?: number | null }
  ): Promise<Media> {
    await ensureDir();

    const mimeFromSource = source?.mimeType?.split(';')[0].trim().toLowerCase() ?? null;

    let ext = extFromName(source?.fileName ?? '') || extFromName(sourceUri);
    if (!ext && mimeFromSource) ext = extFromMime(mimeFromSource);
    if (!ext) ext = 'bin';

    const mimeType = mimeFromSource ?? mimeFromExt(ext);
    const id = uuid();
    const filename = sanitizeFilename(source?.fileName, ext);

    const dest = uniqueDest(getMediaDir(), filename);

    const src = new File(sourceUri);
    if (src.uri !== dest.uri) {
      await src.copy(dest, { overwrite: true });
    }

    const resolvedType = type ?? typeFromMime(mimeType);

    return {
      id,
      uri: dest.uri,
      type: resolvedType,
      filename: dest.name,
      mimeType,
      sizeBytes: source?.fileSize ?? safeSize(dest),
      durationSeconds: null,
      width: null,
      height: null,
      thumbnailUri: null,
      createdAt: new Date().toISOString(),
    };
  },

  async deleteMedia(uri: string): Promise<void> {
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Deleting an already-missing file is not an error worth surfacing.
    }
  },

  async getMediaInfo(uri: string): Promise<{ size: number } | null> {
    try {
      const file = new File(uri);
      if (!file.exists) return null;
      return { size: file.size };
    } catch {
      return null;
    }
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
    return this.importMedia(asset.uri, 'image', {
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize ?? null,
    });
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
    return this.importMedia(asset.uri, 'video', {
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize ?? null,
    });
  },

  async takePhoto(): Promise<Media | null> {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return this.importMedia(asset.uri, 'image', {
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize ?? null,
    });
  },

  async recordVideo(): Promise<Media | null> {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
    });

    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return this.importMedia(asset.uri, 'video', {
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize ?? null,
    });
  },

  async saveMediaRecord(db: SQLiteDatabase, media: Media, journalId?: string): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO media (id, uri, type, filename, mime_type, file_size, created_at, journal_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      media.id,
      media.uri,
      media.type,
      media.filename,
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
    return rows.map(rowToMedia);
  },

  async getAllMedia(db: SQLiteDatabase): Promise<Media[]> {
    const rows = await db.getAllAsync<any>('SELECT * FROM media ORDER BY created_at DESC');
    return rows.map(rowToMedia);
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

function rowToMedia(r: any): Media {
  return {
    id: r.id,
    uri: r.uri,
    type: r.type,
    filename: r.filename ?? null,
    mimeType: r.mime_type,
    sizeBytes: r.file_size,
    durationSeconds: null,
    width: null,
    height: null,
    thumbnailUri: null,
    createdAt: r.created_at,
  };
}

/**
 * Rebuilds the library listing from disk.
 *
 * The filesystem is the source of truth because attachments created before the
 * `media` table existed (and sketches saved directly to disk) have no DB row.
 * The filename is derived from the file itself rather than the UUID.
 */
export async function scanAllMedia(): Promise<Media[]> {
  try {
    const dir = getMediaDir();
    if (!dir.exists) return [];

    const files = dir.list();
    const items: Media[] = [];

    for (const entry of files) {
      if (entry instanceof Directory) continue;
      const file = entry as File;
      const ext = extFromName(file.name);
      const mimeType = mimeFromExt(ext);
      const mediaType = typeFromMime(mimeType);
      const id = file.name.replace(/\.[^.]+$/, '');
      const created = file.creationTime
        ? new Date(file.creationTime).toISOString()
        : new Date().toISOString();

      items.push({
        id,
        uri: file.uri,
        type: mediaType,
        filename: file.name,
        mimeType,
        sizeBytes: safeSize(file),
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
