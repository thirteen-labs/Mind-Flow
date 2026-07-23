import { useCallback, useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { JournalService, type JournalEntry } from '@/services/journal-service';

const AUTOSAVE_DELAY = 800;

export function useTodayJournal() {
  const db = useSQLiteContext();
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journalRef = useRef<JournalEntry | null>(null);

  useEffect(() => {
    let mounted = true;
    JournalService.getTodayJournal(db).then((entry) => {
      if (!mounted) return;
      setJournal(entry);
      journalRef.current = entry;
      setContent(entry.content);
      setLoading(false);
    }).catch((e) => {
      if (!mounted) return;
      setError(e instanceof Error ? e.message : 'Failed to load journal');
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [db]);

  const save = useCallback(async () => {
    const entry = journalRef.current;
    if (!entry) return;
    try {
      const words = content.trim() ? content.trim().split(/\s+/).length : 0;
      await JournalService.saveJournal(db, entry.id, content, words);
      journalRef.current = {
        ...entry,
        content,
        word_count: words,
        updated_at: new Date().toISOString(),
      };
    } catch {
      // silently fail — next auto-save will retry
    }
  }, [db, content]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, AUTOSAVE_DELAY);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [save]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    JournalService.getTodayJournal(db).then((entry) => {
      setJournal(entry);
      journalRef.current = entry;
      setContent(entry.content);
      setLoading(false);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load journal');
      setLoading(false);
    });
  }, [db]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return { journal, loading, error, content, setContent, wordCount, save, retry };
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
    }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
      setLoading(false);
    });
  }, [db]);

  return { stats, loading, error, retry };
}
