import type { SQLiteDatabase } from 'expo-sqlite';

export type RepeatType = 'never' | 'daily' | 'weekly' | 'monthly';

export interface PlannerEvent {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  location: string | null;
  notes: string | null;
  color: string | null;
  repeat: RepeatType;
  reminder: number | null;
  journalId: string | null;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
}

function uuid(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export const PlannerService = {
  async getEventsByDate(db: SQLiteDatabase, date: string): Promise<PlannerEvent[]> {
    const rows = await db.getAllAsync<PlannerEvent>(
      'SELECT * FROM events WHERE date = ? ORDER BY start_time ASC',
      date
    );
    return rows;
  },

  async getEventsByDateRange(db: SQLiteDatabase, startDate: string, endDate: string): Promise<PlannerEvent[]> {
    const rows = await db.getAllAsync<PlannerEvent>(
      'SELECT * FROM events WHERE date >= ? AND date <= ? ORDER BY date ASC, start_time ASC',
      startDate, endDate
    );
    return rows;
  },

  async getEventById(db: SQLiteDatabase, id: string): Promise<PlannerEvent | null> {
    const row = await db.getFirstAsync<PlannerEvent>(
      'SELECT * FROM events WHERE id = ?',
      id
    );
    return row ?? null;
  },

  async createEvent(db: SQLiteDatabase, event: Omit<PlannerEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlannerEvent> {
    const id = uuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO events (id, title, date, start_time, end_time, is_all_day, location, notes, color, repeat, reminder, journal_id, notification_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      event.title,
      event.date,
      event.startTime,
      event.endTime,
      event.isAllDay ? 1 : 0,
      event.location,
      event.notes,
      event.color,
      event.repeat,
      event.reminder,
      event.journalId,
      event.notificationId,
      now,
      now
    );
    return { ...event, id, createdAt: now, updatedAt: now };
  },

  async updateEvent(db: SQLiteDatabase, id: string, updates: Partial<Omit<PlannerEvent, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.date !== undefined) { fields.push('date = ?'); values.push(updates.date); }
    if (updates.startTime !== undefined) { fields.push('start_time = ?'); values.push(updates.startTime); }
    if (updates.endTime !== undefined) { fields.push('end_time = ?'); values.push(updates.endTime); }
    if (updates.isAllDay !== undefined) { fields.push('is_all_day = ?'); values.push(updates.isAllDay ? 1 : 0); }
    if (updates.location !== undefined) { fields.push('location = ?'); values.push(updates.location); }
    if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
    if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
    if (updates.repeat !== undefined) { fields.push('repeat = ?'); values.push(updates.repeat); }
    if (updates.reminder !== undefined) { fields.push('reminder = ?'); values.push(updates.reminder); }
    if (updates.journalId !== undefined) { fields.push('journal_id = ?'); values.push(updates.journalId); }
    if (updates.notificationId !== undefined) { fields.push('notification_id = ?'); values.push(updates.notificationId); }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
      ...values
    );
  },

  async deleteEvent(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync('DELETE FROM events WHERE id = ?', id);
  },

  async deleteEventsByDate(db: SQLiteDatabase, date: string): Promise<void> {
    await db.runAsync('DELETE FROM events WHERE date = ?', date);
  },

  async getEventsWithJournals(db: SQLiteDatabase, startDate: string, endDate: string): Promise<(PlannerEvent & { journalContent?: string })[]> {
    const rows = await db.getAllAsync<PlannerEvent & { journalContent?: string }>(
      `SELECT e.*, j.content as journalContent
       FROM events e
       LEFT JOIN journals j ON e.journal_id = j.id
       WHERE e.date >= ? AND e.date <= ?
       ORDER BY e.date ASC, e.start_time ASC`,
      startDate, endDate
    );
    return rows;
  },
};
