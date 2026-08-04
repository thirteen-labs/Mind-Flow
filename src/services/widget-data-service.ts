import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import { JournalService } from '@/services/journal-service';

const APP_GROUP = 'group.com.mindflow.app';
const WIDGET_DATA_FILE = 'widget-data.json';

interface WidgetData {
  streak: number;
  totalEntries: number;
  totalWords: number;
  todayWritten: boolean;
  lastEntryDate: string | null;
  updatedAt: string;
}

function getWidgetDir(): Directory | null {
  if (Platform.OS === 'ios') {
    const container = Paths.appleSharedContainers[APP_GROUP];
    if (!container) return null;
    return new Directory(container, 'Library');
  }
  return new Directory(Paths.cache, 'widgets');
}

export const WidgetDataService = {
  async updateWidgetData(data: Omit<WidgetData, 'updatedAt'>): Promise<void> {
    try {
      const full: WidgetData = { ...data, updatedAt: new Date().toISOString() };
      const dir = getWidgetDir();
      if (!dir) return;
      if (!dir.exists) {
        dir.create({ intermediates: true, idempotent: true });
      }

      // Write JSON for both platforms to read
      const jsonFile = new File(dir, WIDGET_DATA_FILE);
      jsonFile.write(JSON.stringify(full));

      // Also write as SharedPreferences-compatible key-value file for Android
      if (Platform.OS === 'android') {
        const prefsFile = new File(Paths.cache, 'widget_prefs.txt');
        const lines = [
          `streak=${data.streak}`,
          `totalEntries=${data.totalEntries}`,
          `totalWords=${data.totalWords}`,
          `todayWritten=${data.todayWritten}`,
          `lastEntryDate=${data.lastEntryDate ?? ''}`,
        ];
        prefsFile.write(lines.join('\n'));
      }
    } catch {
      // silently fail — widget will show stale data
    }
  },

  async updateFromDb(db: SQLiteDatabase): Promise<void> {
    try {
      const stats = await JournalService.getJournalStats(db);
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = await JournalService.getJournalByDate(db, today);
      const lastEntry = await JournalService.getRecentJournals(db, 1);

      await this.updateWidgetData({
        streak: stats.streak,
        totalEntries: stats.entries,
        totalWords: stats.totalWords,
        todayWritten: todayEntry ? todayEntry.content.trim().length > 0 : false,
        lastEntryDate: lastEntry[0]?.date ?? null,
      });
    } catch {
      // silently fail
    }
  },

  async getWidgetData(): Promise<WidgetData | null> {
    try {
      if (Platform.OS !== 'ios') return null;
      const dir = getWidgetDir();
      if (!dir) return null;
      const file = new File(dir, WIDGET_DATA_FILE);
      if (!file.exists) return null;
      const raw = await file.text();
      return JSON.parse(raw) as WidgetData;
    } catch {
      return null;
    }
  },
};
