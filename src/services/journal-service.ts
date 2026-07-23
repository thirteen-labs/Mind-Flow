import type { SQLiteDatabase } from 'expo-sqlite';

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  word_count: number;
  mood: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalStats {
  entries: number;
  totalWords: number;
  streak: number;
  todayWordCount: number;
}

export interface Insights {
  totalEntries: number;
  totalWords: number;
  currentStreak: number;
  longestStreak: number;
  bestDayOfWeek: string;
}

export interface WordCountPoint {
  date: string;
  words: number;
}

export interface MonthlyActivity {
  month: string;
  entries: number;
  words: number;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function todayDate(): string {
  return dateString(new Date());
}

function dateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

export const JournalService = {
  async getTodayJournal(db: SQLiteDatabase): Promise<JournalEntry> {
    const date = todayDate();
    const existing = await db.getFirstAsync<JournalEntry>(
      'SELECT * FROM journals WHERE date = ?',
      date
    );
    if (existing) return existing;

    const id = generateId();
    const now = nowISO();
    await db.runAsync(
      'INSERT INTO journals (id, date, content, word_count, mood, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, date, '', 0, null, now, now
    );
    return { id, date, content: '', word_count: 0, mood: null, created_at: now, updated_at: now };
  },

  async saveJournal(db: SQLiteDatabase, id: string, content: string, wordCount: number): Promise<void> {
    await db.runAsync(
      'UPDATE journals SET content = ?, word_count = ?, updated_at = ? WHERE id = ?',
      content, wordCount, nowISO(), id
    );
  },

  async getJournalByDate(db: SQLiteDatabase, date: string): Promise<JournalEntry | null> {
    return db.getFirstAsync<JournalEntry>('SELECT * FROM journals WHERE date = ?', date);
  },

  async getJournalsByDateRange(db: SQLiteDatabase, from: string, to: string): Promise<JournalEntry[]> {
    return db.getAllAsync<JournalEntry>(
      'SELECT * FROM journals WHERE date >= ? AND date <= ? ORDER BY date DESC', from, to
    );
  },

  async getAllJournals(db: SQLiteDatabase): Promise<JournalEntry[]> {
    return db.getAllAsync<JournalEntry>('SELECT * FROM journals ORDER BY date DESC');
  },

  async getRecentJournals(db: SQLiteDatabase, limit = 10): Promise<JournalEntry[]> {
    return db.getAllAsync<JournalEntry>(
      'SELECT * FROM journals ORDER BY date DESC LIMIT ?', limit
    );
  },

  async searchJournals(db: SQLiteDatabase, query: string): Promise<JournalEntry[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const sanitized = trimmed
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/).filter(Boolean)
      .map((w) => `"${w}"*`).join(' ');
    if (!sanitized) return [];
    return db.getAllAsync<JournalEntry>(
      `SELECT j.* FROM journals j
       INNER JOIN journals_fts f ON j.rowid = f.rowid
       WHERE journals_fts MATCH ? ORDER BY rank`, sanitized
    );
  },

  async getJournalStats(db: SQLiteDatabase): Promise<JournalStats> {
    const { entries } = (await db.getFirstAsync<{ entries: number }>(
      'SELECT COUNT(*) as entries FROM journals'
    )) ?? { entries: 0 };

    const { totalWords } = (await db.getFirstAsync<{ totalWords: number }>(
      'SELECT COALESCE(SUM(word_count), 0) as totalWords FROM journals'
    )) ?? { totalWords: 0 };

    const today = todayDate();
    const todayEntry = await db.getFirstAsync<JournalEntry>(
      'SELECT * FROM journals WHERE date = ?', today
    );
    const todayWordCount = todayEntry?.word_count ?? 0;

    const rows = await db.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM journals WHERE content != \'\' ORDER BY date DESC LIMIT 365'
    );
    let streak = 0;
    const start = new Date();
    for (const row of rows) {
      if (row.date === dateString(start)) {
        streak++;
        start.setDate(start.getDate() - 1);
      } else break;
    }

    return { entries, totalWords, streak, todayWordCount };
  },

  async getInsights(db: SQLiteDatabase): Promise<Insights> {
    const stats = await JournalService.getJournalStats(db);
    let longestStreak = 0;
    let current = 0;
    const streakRows = await db.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM journals WHERE content != \'\' ORDER BY date ASC'
    );
    for (let i = 0; i < streakRows.length; i++) {
      if (i === 0) { current = 1; continue; }
      const prev = new Date(streakRows[i - 1].date + 'T00:00:00');
      const curr = new Date(streakRows[i].date + 'T00:00:00');
      if ((curr.getTime() - prev.getTime()) / 86400000 === 1) {
        current++;
      } else {
        longestStreak = Math.max(longestStreak, current);
        current = 1;
      }
    }
    longestStreak = Math.max(longestStreak, current);

    const bestDay = await db.getFirstAsync<{ day: string }>(
      `SELECT CASE CAST(strftime('%w', date) AS INTEGER)
        WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday'
        ELSE 'Saturday' END as day
       FROM journals WHERE word_count > 0
       GROUP BY strftime('%w', date)
       ORDER BY SUM(word_count) DESC LIMIT 1`
    );

    return {
      totalEntries: stats.entries,
      totalWords: stats.totalWords,
      currentStreak: stats.streak,
      longestStreak,
      bestDayOfWeek: bestDay?.day ?? '-',
    };
  },

  async getWordCountHistory(db: SQLiteDatabase, days = 30): Promise<WordCountPoint[]> {
    const start = new Date();
    const cutoff = dateString(new Date(start.getTime() - days * 86400000));
    const entries = await db.getAllAsync<{ date: string; word_count: number }>(
      'SELECT date, word_count FROM journals WHERE date >= ? ORDER BY date ASC', cutoff
    );
    const map = new Map(entries.map((e) => [e.date, e.word_count]));
    const result: WordCountPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(d.getDate() - i);
      const ds = dateString(d);
      result.push({ date: ds, words: map.get(ds) ?? 0 });
    }
    return result;
  },

  async getMonthlyActivity(db: SQLiteDatabase): Promise<MonthlyActivity[]> {
    return db.getAllAsync<MonthlyActivity>(
      `SELECT substr(date, 1, 7) as month,
              COUNT(*) as entries,
              SUM(word_count) as words
       FROM journals
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`
    );
  },
};
