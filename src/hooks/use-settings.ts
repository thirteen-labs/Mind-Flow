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
      // Update settings state first
      setSettings((prev) => {
        if (!prev) return prev;
        return { ...prev, ...updates };
      });
      // Read fresh settings from DB after state update to avoid stale closures
      const fresh = await SettingsService.getAll(db);
      if (!fresh) return;

      if (updates.morningReminderEnabled !== undefined) {
        if (fresh.morningReminderEnabled) {
          await NotificationService.scheduleMorning(fresh.morningReminderHour ?? 7, fresh.morningReminderMinute ?? 0);
        } else {
          await NotificationService.cancelMorning();
        }
      } else if (updates.morningReminderHour !== undefined || updates.morningReminderMinute !== undefined) {
        if (fresh.morningReminderEnabled) {
          await NotificationService.scheduleMorning(fresh.morningReminderHour ?? 7, fresh.morningReminderMinute ?? 0);
        }
      }
      if (updates.eveningReminderEnabled !== undefined) {
        if (fresh.eveningReminderEnabled) {
          await NotificationService.scheduleEvening(fresh.eveningReminderHour ?? 18, fresh.eveningReminderMinute ?? 0);
        } else {
          await NotificationService.cancelEvening();
        }
      } else if (updates.eveningReminderHour !== undefined || updates.eveningReminderMinute !== undefined) {
        if (fresh.eveningReminderEnabled) {
          await NotificationService.scheduleEvening(fresh.eveningReminderHour ?? 18, fresh.eveningReminderMinute ?? 0);
        }
      }
      if (updates.streakReminderEnabled !== undefined) {
        if (fresh.streakReminderEnabled) {
          await NotificationService.scheduleStreak();
        } else {
          await NotificationService.cancelStreak();
        }
      }
    },
    [db]
  );

  return { settings, loading, update };
}
