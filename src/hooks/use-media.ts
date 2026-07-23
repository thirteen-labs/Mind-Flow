import { useState, useCallback } from 'react';

import type { Media, MediaType } from '@/constants/media';
import { MediaService } from '@/services/media-service';

export function useMedia() {
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = useCallback(async () => {
    setLoading(true);
    try {
      const media = await MediaService.pickImage();
      if (media) {
        setMediaItems((prev) => [...prev, media]);
      }
      return media;
    } finally {
      setLoading(false);
    }
  }, []);

  const pickVideo = useCallback(async () => {
    setLoading(true);
    try {
      const media = await MediaService.pickVideo();
      if (media) {
        setMediaItems((prev) => [...prev, media]);
      }
      return media;
    } finally {
      setLoading(false);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    setLoading(true);
    try {
      const media = await MediaService.takePhoto();
      if (media) {
        setMediaItems((prev) => [...prev, media]);
      }
      return media;
    } finally {
      setLoading(false);
    }
  }, []);

  const importMedia = useCallback(async (uri: string, type?: MediaType) => {
    setLoading(true);
    try {
      const media = await MediaService.importMedia(uri, type);
      setMediaItems((prev) => [...prev, media]);
      return media;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeMedia = useCallback(async (id: string) => {
    const item = mediaItems.find((m) => m.id === id);
    if (item) {
      await MediaService.deleteMedia(item.uri);
      setMediaItems((prev) => prev.filter((m) => m.id !== id));
    }
  }, [mediaItems]);

  const clearMedia = useCallback(() => {
    setMediaItems([]);
  }, []);

  return {
    mediaItems,
    loading,
    pickImage,
    pickVideo,
    takePhoto,
    importMedia,
    removeMedia,
    clearMedia,
  };
}
