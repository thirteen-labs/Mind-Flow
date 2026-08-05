import { useCallback, useEffect, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { JournalService, type JournalEntry, type JournalEntryType } from '@/services/journal-service';
import { WidgetDataService } from '@/services/widget-data-service';

const AUTOSAVE_DELAY = 800;

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

export interface UseJournalOptions {
  entryId?: string;
  type?: JournalEntryType;
  date?: string;
  sessionKey?: string;
}

export function useJournal({ entryId, type = 'note', date, sessionKey }: UseJournalOptions = {}) {
  const db = useSQLiteContext();
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journalRef = useRef<JournalEntry | null>(null);
  const persistedRef = useRef<string | null>(null);
  const moodRef = useRef<string | null>(null);
  const loadVersionRef = useRef(0);
  const [retryCounter, setRetryCounter] = useState(0);

  const isToday = !date;

  useEffect(() => {
    const version = ++loadVersionRef.current;
    let mounted = true;
    persistedRef.current = null;
    moodRef.current = null;
    (async () => {
      setLoading(true);
      setError(null);
      setContent('');
      setTitle(null);
      try {
        if (entryId) {
          const existing = await JournalService.getJournalById(db, entryId);
          if (!existing) throw new Error('Journal entry not found');
          if (!mounted || loadVersionRef.current !== version) return;
          persistedRef.current = existing.id;
          moodRef.current = existing.mood;
          journalRef.current = existing;
          setJournal(existing);
          setContent(existing.content);
          setTitle(existing.title);
        } else {
          const draft: JournalEntry = {
            id: `draft_${sessionKey ?? Date.now()}`,
            date: date ?? todayDate(),
            title: null,
            content: '',
            word_count: 0,
            mood: null,
            is_favorited: 0,
            is_pinned: 0,
            is_hidden: 0,
            entry_type: type,
            created_at: nowISO(),
            updated_at: nowISO(),
          };
          if (!mounted || loadVersionRef.current !== version) return;
          journalRef.current = draft;
          setJournal(draft);
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load journal');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [db, entryId, type, date, sessionKey, retryCounter]);

  const save = useCallback(async () => {
    const entry = journalRef.current;
    if (!entry) return;
    try {
      const words = content.trim() ? content.trim().split(/\s+/).length : 0;
      const persistedId = persistedRef.current;
      if (persistedId) {
        await JournalService.saveJournal(db, persistedId, content, words, title);
        journalRef.current = { ...entry, title, content, word_count: words, updated_at: nowISO() };
      } else if (content.trim()) {
        const created = await JournalService.createJournalEntry(db, {
          date: entry.date,
          type: entry.entry_type,
          title,
          content,
          mood: moodRef.current,
        });
        persistedRef.current = created.id;
        journalRef.current = { ...created, mood: moodRef.current };
        setJournal({ ...created, mood: moodRef.current });
      }
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
    moodRef.current = mood;
    const updated = { ...entry, mood };
    journalRef.current = updated;
    setJournal(updated);
    const persistedId = persistedRef.current;
    if (persistedId) {
      try {
        await JournalService.updateMood(db, persistedId, mood);
      } catch {
        // silently fail
      }
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
