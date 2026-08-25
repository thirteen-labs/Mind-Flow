import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { NotificationService } from '@/services/notification-service';
import { SettingsService, type AppSettings } from '@/services/settings-service';

export function useSettings() {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    SettingsService.getAll(db).then((s) => {
      if (mounted) {
        setSettings(s);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [db]);

  const update = useCallback(
    async (updates: Partial<AppSettings>) => {
      await SettingsService.setMany(db, updates);
      let nextSettings: AppSettings | null = null;
      setSettings((prev) => {
        if (!prev) return prev;
        nextSettings = { ...prev, ...updates };
        return nextSettings;
      });
      // Use fresh state for notification scheduling to avoid stale closure
      const s = nextSettings ?? (settings ? { ...settings, ...updates } : null);
      if (!s) return;

      if (updates.morningReminderEnabled !== undefined) {
        if (updates.morningReminderEnabled) {
          await NotificationService.scheduleMorning(s.morningReminderHour ?? 7, s.morningReminderMinute ?? 0);
        } else {
          await NotificationService.cancelMorning();
        }
      } else if (updates.morningReminderHour !== undefined || updates.morningReminderMinute !== undefined) {
        if (s.morningReminderEnabled) {
          await NotificationService.scheduleMorning(s.morningReminderHour ?? 7, s.morningReminderMinute ?? 0);
        }
      }
      if (updates.eveningReminderEnabled !== undefined) {
        if (updates.eveningReminderEnabled) {
          await NotificationService.scheduleEvening(s.eveningReminderHour ?? 18, s.eveningReminderMinute ?? 0);
        } else {
          await NotificationService.cancelEvening();
        }
      } else if (updates.eveningReminderHour !== undefined || updates.eveningReminderMinute !== undefined) {
        if (s.eveningReminderEnabled) {
          await NotificationService.scheduleEvening(s.eveningReminderHour ?? 18, s.eveningReminderMinute ?? 0);
        }
      }
      if (updates.streakReminderEnabled !== undefined) {
        if (updates.streakReminderEnabled) {
          await NotificationService.scheduleStreak();
        } else {
          await NotificationService.cancelStreak();
        }
      }
    },
    [db, settings]
  );

  return { settings, loading, update };
}
