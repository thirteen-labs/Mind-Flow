import { useCallback, useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { TemplateService, type Template } from '@/services/template-service';

const AUTOSAVE_DELAY = 800;

export function useTemplate(options?: { templateId?: string; sessionKey?: string }) {
  const db = useSQLiteContext();
  const [template, setTemplate] = useState<Template | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateRef = useRef<Template | null>(null);
  const persistedRef = useRef<string | null>(null);
  const loadVersionRef = useRef(0);
  const [retryCounter, setRetryCounter] = useState(0);

  useEffect(() => {
    const version = ++loadVersionRef.current;
    let mounted = true;
    persistedRef.current = null;
    (async () => {
      setLoading(true);
      setError(null);
      setContent('');
      setTitle('');
      try {
        if (options?.templateId) {
          const existing = await TemplateService.getTemplateById(db, options.templateId);
          if (!existing) throw new Error('Template not found');
          if (!mounted || loadVersionRef.current !== version) return;
          persistedRef.current = existing.id;
          templateRef.current = existing;
          setTemplate(existing);
          setContent(existing.content);
          setTitle(existing.title);
        } else {
          const draft: Template = {
            id: `draft_${options?.sessionKey ?? Date.now()}`,
            title: '',
            content: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          if (!mounted || loadVersionRef.current !== version) return;
          templateRef.current = draft;
          setTemplate(draft);
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load template');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [db, options?.templateId, options?.sessionKey, retryCounter]);

  const save = useCallback(async () => {
    const current = templateRef.current;
    if (!current) return;
    try {
      const trimmedTitle = title.trim();
      const persistedId = persistedRef.current;
      if (persistedId) {
        await TemplateService.updateTemplate(db, persistedId, trimmedTitle, content);
        templateRef.current = { ...current, title: trimmedTitle, content, updated_at: new Date().toISOString() };
      } else if (content.trim() || trimmedTitle) {
        const created = await TemplateService.createTemplate(db, trimmedTitle, content);
        persistedRef.current = created.id;
        templateRef.current = created;
        setTemplate(created);
      }
    } catch {
      // silently fail — next auto-save will retry
    }
  }, [db, content, title]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, AUTOSAVE_DELAY);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [save]);

  const latestSaveRef = useRef(save);
  useEffect(() => {
    latestSaveRef.current = save;
  }, [save]);

  useEffect(() => {
    return () => {
      latestSaveRef.current();
    };
  }, []);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const retry = useCallback(() => {
    setRetryCounter((c) => c + 1);
  }, []);

  return { template, loading, error, content, setContent, title, setTitle, wordCount, save, retry };
}
