export type MediaType = 'image' | 'video' | 'audio' | 'voice' | 'pdf';

export interface Media {
  id: string;
  uri: string;
  type: MediaType;
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
