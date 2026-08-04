import { useCallback, useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { JournalService, type JournalEntry } from '@/services/journal-service';
import { WidgetDataService } from '@/services/widget-data-service';

const AUTOSAVE_DELAY = 800;

export function useJournal(date?: string) {
  const db = useSQLiteContext();
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journalRef = useRef<JournalEntry | null>(null);
  const loadVersionRef = useRef(0);
  const [retryCounter, setRetryCounter] = useState(0);

  const isToday = !date;

  useEffect(() => {
    const version = ++loadVersionRef.current;
    let mounted = true;
    (async () => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
      try {
        const entry = isToday
          ? await JournalService.getTodayJournal(db)
          : await JournalService.getJournalByDate(db, date!);
        if (!entry) throw new Error('Journal entry not found');
        if (!mounted || loadVersionRef.current !== version) return;
        setJournal(entry);
        journalRef.current = entry;
        setContent(entry.content);
        setTitle(entry.title);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load journal');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [db, date, isToday, retryCounter]);

  const save = useCallback(async () => {
    const entry = journalRef.current;
    if (!entry) return;
    try {
      const words = content.trim() ? content.trim().split(/\s+/).length : 0;
      await JournalService.saveJournal(db, entry.id, content, words, title);
      journalRef.current = {
        ...entry,
        title,
        content,
        word_count: words,
        updated_at: new Date().toISOString(),
      };
      WidgetDataService.updateFromDb(db).catch(() => {});
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

  const setMood = useCallback(async (mood: string | null) => {
    const entry = journalRef.current;
    if (!entry) return;
    try {
      await JournalService.updateMood(db, entry.id, mood);
      const updated = { ...entry, mood };
      journalRef.current = updated;
      setJournal(updated);
    } catch {
      // silently fail
    }
  }, [db]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const retry = useCallback(() => {
    setRetryCounter((c) => c + 1);
  }, []);

  return { journal, loading, error, content, setContent, title, setTitle, wordCount, save, retry, setMood, isToday };
}

export function useJournalStats() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<{
    entries: number;
    totalWords: number;
    streak: number;
    todayWordCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    JournalService.getJournalStats(db).then((result) => {
      if (!mounted) return;
      setStats(result);
      setLoading(false);
    }).catch((e) => {
      if (!mounted) return;
      setError(e instanceof Error ? e.message : 'Failed to load stats');
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [db]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    JournalService.getJournalStats(db).then((result) => {
      setStats(result);
      setLoading(false);
      WidgetDataService.updateFromDb(db).catch(() => {});
    }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
      setLoading(false);
    });
  }, [db]);

  return { stats, loading, error, retry };
}
