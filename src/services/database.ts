import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'mindflow.db';

async function hasColumn(db: SQLiteDatabase, table: string, column: string): Promise<boolean> {
  try {
    const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    return rows.some((r) => r.name === column);
  } catch {
    return false;
  }
}

async function safeExec(db: SQLiteDatabase, sql: string): Promise<void> {
  try {
    await db.execAsync(sql);
  } catch (e) {
    // Log but never throw — migration must be idempotent and survive partial states
    console.warn('[DB migrate] exec failed:', (e as Error)?.message ?? e);
  }
}

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  try {
    const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    let currentDbVersion = result?.user_version ?? 0;
    // Self-heal: if tables already upgraded but user_version lagged, bump it
    try {
      if (currentDbVersion < 9 && (await hasColumn(db, 'journals', 'entry_type'))) {
        currentDbVersion = 9;
      }
      if (currentDbVersion < 10 && (await hasColumn(db, 'journals', 'is_hidden'))) {
        currentDbVersion = 10;
      }
    } catch {}

    if (currentDbVersion < 1) {
      await safeExec(db, `
PRAGMA journal_mode = 'wal';
CREATE TABLE IF NOT EXISTS journals (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  mood TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_journals_date ON journals(date DESC);
`);
      currentDbVersion = 1;
    }

    if (currentDbVersion < 2) {
      await safeExec(db, `
CREATE VIRTUAL TABLE IF NOT EXISTS journals_fts USING fts5(
  content, date UNINDEXED,
  content='journals',
  content_rowid='rowid'
);
INSERT INTO journals_fts(rowid, content, date) SELECT rowid, content, date FROM journals;
CREATE TRIGGER IF NOT EXISTS journals_fts_ai AFTER INSERT ON journals BEGIN
  INSERT INTO journals_fts(rowid, content, date) VALUES (new.rowid, new.content, new.date);
END;
CREATE TRIGGER IF NOT EXISTS journals_fts_ad AFTER DELETE ON journals BEGIN
  INSERT INTO journals_fts(journals_fts, rowid, content, date) VALUES('delete', old.rowid, old.content, old.date);
END;
CREATE TRIGGER IF NOT EXISTS journals_fts_au AFTER UPDATE ON journals BEGIN
  INSERT INTO journals_fts(journals_fts, rowid, content, date) VALUES('delete', old.rowid, old.content, old.date);
  INSERT INTO journals_fts(rowid, content, date) VALUES (new.rowid, new.content, new.date);
END;
`);
      currentDbVersion = 2;
    }

    if (currentDbVersion < 3) {
      await safeExec(db, `
CREATE TABLE IF NOT EXISTS embeds (
  url TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL DEFAULT 'link',
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  author_name TEXT,
  html TEXT,
  cached_at TEXT NOT NULL
);
`);
      currentDbVersion = 3;
    }

    if (currentDbVersion < 4) {
      await safeExec(db, `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`);
      currentDbVersion = 4;
    }

    if (currentDbVersion < 5) {
      await safeExec(db, `
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#208AEF'
);
CREATE TABLE IF NOT EXISTS journal_tags (
  journal_id TEXT NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (journal_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_journal_tags_journal ON journal_tags(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_tags_tag ON journal_tags(tag_id);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY NOT NULL,
  uri TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image',
  filename TEXT,
  mime_type TEXT,
  file_size INTEGER,
  created_at TEXT NOT NULL,
  journal_id TEXT REFERENCES journals(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_media_journal ON media(journal_id);
`);
      currentDbVersion = 5;
    }

    if (currentDbVersion < 6) {
      await safeExec(db, `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  notes TEXT,
  color TEXT,
  repeat TEXT NOT NULL DEFAULT 'never',
  reminder INTEGER,
  journal_id TEXT REFERENCES journals(id) ON DELETE SET NULL,
  notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_journal ON events(journal_id);
`);
      currentDbVersion = 6;
    }

    if (currentDbVersion < 7) {
      // ALTER may fail if column already exists — safeExec handles it
      await safeExec(db, `ALTER TABLE journals ADD COLUMN is_favorited INTEGER NOT NULL DEFAULT 0;`);
      await safeExec(db, `ALTER TABLE journals ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;`);
      await safeExec(db, `CREATE INDEX IF NOT EXISTS idx_journals_favorited ON journals(is_favorited);`);
      await safeExec(db, `CREATE INDEX IF NOT EXISTS idx_journals_pinned ON journals(is_pinned);`);
      currentDbVersion = 7;
    }

    if (currentDbVersion < 8) {
      await safeExec(db, `ALTER TABLE journals ADD COLUMN title TEXT;`);
      currentDbVersion = 8;
    }

    if (currentDbVersion < 9) {
      // If already migrated (entry_type exists) skip heavy rebuild
      const already = await hasColumn(db, 'journals', 'entry_type');
      if (!already) {
        await safeExec(db, `
DROP TABLE IF EXISTS journals_fts;
DROP TABLE IF EXISTS journals_old;
ALTER TABLE journals RENAME TO journals_old;
CREATE TABLE journals (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  mood TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_favorited INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  entry_type TEXT NOT NULL DEFAULT 'note'
);
CREATE INDEX IF NOT EXISTS idx_journals_date ON journals(date DESC);
CREATE INDEX IF NOT EXISTS idx_journals_favorited ON journals(is_favorited);
CREATE INDEX IF NOT EXISTS idx_journals_pinned ON journals(is_pinned);
CREATE INDEX IF NOT EXISTS idx_journals_type ON journals(entry_type);
INSERT INTO journals (id, date, content, word_count, mood, created_at, updated_at, is_favorited, is_pinned, title)
  SELECT id, date, content, word_count, mood, created_at, updated_at, is_favorited, is_pinned, title FROM journals_old;
DROP TABLE journals_old;
CREATE VIRTUAL TABLE IF NOT EXISTS journals_fts USING fts5(
  content, date UNINDEXED,
  content='journals',
  content_rowid='rowid'
);
INSERT INTO journals_fts(rowid, content, date) SELECT rowid, content, date FROM journals;
CREATE TRIGGER IF NOT EXISTS journals_fts_ai AFTER INSERT ON journals BEGIN
  INSERT INTO journals_fts(rowid, content, date) VALUES (new.rowid, new.content, new.date);
END;
CREATE TRIGGER IF NOT EXISTS journals_fts_ad AFTER DELETE ON journals BEGIN
  INSERT INTO journals_fts(journals_fts, rowid, content, date) VALUES('delete', old.rowid, old.content, old.date);
END;
CREATE TRIGGER IF NOT EXISTS journals_fts_au AFTER UPDATE ON journals BEGIN
  INSERT INTO journals_fts(journals_fts, rowid, content, date) VALUES('delete', old.rowid, old.content, old.date);
  INSERT INTO journals_fts(rowid, content, date) VALUES (new.rowid, new.content, new.date);
END;
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_templates_updated ON templates(updated_at DESC);
`);
      }
      currentDbVersion = 9;
    }

    if (currentDbVersion < 10) {
      await safeExec(db, `ALTER TABLE journals ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0;`);
      await safeExec(db, `CREATE INDEX IF NOT EXISTS idx_journals_hidden ON journals(is_hidden);`);
      currentDbVersion = 10;
    }

    // Ensure foreign keys are enforced for journal_tags / media / events cascades
    try {
      await db.execAsync('PRAGMA foreign_keys = ON');
    } catch {}
    try {
      await db.execAsync(`PRAGMA user_version = ${currentDbVersion}`);
    } catch {}
  } catch (e) {
    console.warn('[DB migrate] fatal:', (e as Error)?.message ?? e);
    // Never re-throw — allow app to continue with whatever schema exists
    try {
      await db.execAsync('PRAGMA foreign_keys = ON');
    } catch {}
  }
}
