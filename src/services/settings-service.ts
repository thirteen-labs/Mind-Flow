import type { SQLiteDatabase } from 'expo-sqlite';

export interface AppSettings {
  morningReminderEnabled: boolean;
  morningReminderHour: number;
  morningReminderMinute: number;
  eveningReminderEnabled: boolean;
  eveningReminderHour: number;
  eveningReminderMinute: number;
  streakReminderEnabled: boolean;
}

const DEFAULTS: AppSettings = {
  morningReminderEnabled: false,
  morningReminderHour: 9,
  morningReminderMinute: 0,
  eveningReminderEnabled: false,
  eveningReminderHour: 20,
  eveningReminderMinute: 0,
  streakReminderEnabled: false,
};

function encode(val: boolean | number): string {
  return String(val);
}

function decodeBool(val: string | null): boolean {
  return val === 'true';
}

function decodeNum(val: string | null, fallback: number): number {
  if (val === null || val === '') return fallback;
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

export const SettingsService = {
  async getAll(db: SQLiteDatabase): Promise<AppSettings> {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      morningReminderEnabled: decodeBool(map.get('morningReminderEnabled') ?? null),
      morningReminderHour: decodeNum(map.get('morningReminderHour') ?? null, DEFAULTS.morningReminderHour),
      morningReminderMinute: decodeNum(map.get('morningReminderMinute') ?? null, DEFAULTS.morningReminderMinute),
      eveningReminderEnabled: decodeBool(map.get('eveningReminderEnabled') ?? null),
      eveningReminderHour: decodeNum(map.get('eveningReminderHour') ?? null, DEFAULTS.eveningReminderHour),
      eveningReminderMinute: decodeNum(map.get('eveningReminderMinute') ?? null, DEFAULTS.eveningReminderMinute),
      streakReminderEnabled: decodeBool(map.get('streakReminderEnabled') ?? null),
    };
  },

  async set(db: SQLiteDatabase, key: string, value: boolean | number): Promise<void> {
    await db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      key,
      encode(value)
    );
  },

  async setMany(db: SQLiteDatabase, updates: Partial<AppSettings>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await SettingsService.set(db, key, value);
      }
    }
  },
};
