import type { SQLiteDatabase } from 'expo-sqlite';

export interface Template {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

export const TemplateService = {
  async getAllTemplates(db: SQLiteDatabase): Promise<Template[]> {
    return db.getAllAsync<Template>(
      'SELECT * FROM templates ORDER BY updated_at DESC'
    );
  },

  async getTemplateById(db: SQLiteDatabase, id: string): Promise<Template | null> {
    return db.getFirstAsync<Template>('SELECT * FROM templates WHERE id = ?', id);
  },

  async createTemplate(db: SQLiteDatabase, title: string, content: string): Promise<Template> {
    const id = generateId();
    const now = nowISO();
    await db.runAsync(
      'INSERT INTO templates (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      id, title, content, now, now
    );
    return { id, title, content, created_at: now, updated_at: now };
  },

  async updateTemplate(db: SQLiteDatabase, id: string, title: string, content: string): Promise<void> {
    await db.runAsync(
      'UPDATE templates SET title = ?, content = ?, updated_at = ? WHERE id = ?',
      title, content, nowISO(), id
    );
  },

  async deleteTemplate(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync('DELETE FROM templates WHERE id = ?', id);
  },
};
