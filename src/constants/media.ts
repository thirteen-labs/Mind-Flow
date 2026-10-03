export type MediaType = 'image' | 'video' | 'audio' | 'voice' | 'pdf' | 'file';

export interface Media {
  id: string;
  uri: string;
  type: MediaType;
  /**
   * Original filename as provided by the picker, preserved for display and for
   * markdown link text. The on-disk name may be a slug of this.
   */
  filename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  thumbnailUri: string | null;
  createdAt: string;
}

export interface MediaPickerOptions {
  type: MediaType;
  allowsEditing?: boolean;
  quality?: number;
}

export const MEDIA_DIRECTORY = 'mindflow/media';
export const THUMBNAIL_DIRECTORY = 'mindflow/thumbnails';

/** Human-readable label for a media type, used by attachment cards. */
export const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  voice: 'Voice note',
  pdf: 'PDF',
  file: 'File',
};