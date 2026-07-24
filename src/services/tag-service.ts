import type { SQLiteDatabase } from 'expo-sqlite';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export const TagService = {
  async getAll(db: SQLiteDatabase): Promise<Tag[]> {
    return db.getAllAsync<Tag>('SELECT * FROM tags ORDER BY name ASC');
  },

  async create(db: SQLiteDatabase, name: string, color: string): Promise<Tag> {
    const id = generateId();
    await db.runAsync(
      'INSERT INTO tags (id, name, color) VALUES (?, ?, ?)',
      id, name.trim(), color
    );
    return { id, name: name.trim(), color };
  },

  async delete(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync('DELETE FROM tags WHERE id = ?', id);
  },

  async getJournalTags(db: SQLiteDatabase, journalId: string): Promise<Tag[]> {
    return db.getAllAsync<Tag>(
      `SELECT t.* FROM tags t
       INNER JOIN journal_tags jt ON t.id = jt.tag_id
       WHERE jt.journal_id = ?
       ORDER BY t.name ASC`,
      journalId
    );
  },

  async setJournalTags(db: SQLiteDatabase, journalId: string, tagIds: string[]): Promise<void> {
    await db.runAsync('DELETE FROM journal_tags WHERE journal_id = ?', journalId);
    for (const tagId of tagIds) {
      await db.runAsync(
        'INSERT OR IGNORE INTO journal_tags (journal_id, tag_id) VALUES (?, ?)',
        journalId, tagId
      );
    }
  },

  async getJournalsByTag(db: SQLiteDatabase, tagId: string): Promise<string[]> {
    const rows = await db.getAllAsync<{ journal_id: string }>(
      'SELECT journal_id FROM journal_tags WHERE tag_id = ? ORDER BY journal_id DESC',
      tagId
    );
    return rows.map((r) => r.journal_id);
  },
};
