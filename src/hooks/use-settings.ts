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
      setSettings((prev) => (prev ? { ...prev, ...updates } : prev));

      if (updates.morningReminderEnabled !== undefined) {
        if (updates.morningReminderEnabled && settings) {
          const h = updates.morningReminderHour ?? settings.morningReminderHour ?? 7;
          const m = updates.morningReminderMinute ?? settings.morningReminderMinute ?? 0;
          await NotificationService.scheduleMorning(h, m);
        } else {
          await NotificationService.cancelMorning();
        }
      }
      if (updates.morningReminderHour !== undefined || updates.morningReminderMinute !== undefined) {
        const s = { ...settings, ...updates };
        if (s.morningReminderEnabled) {
          await NotificationService.scheduleMorning(
            s.morningReminderHour ?? 7,
            s.morningReminderMinute ?? 0
          );
        }
      }
      if (updates.eveningReminderEnabled !== undefined) {
        if (updates.eveningReminderEnabled && settings) {
          const h = updates.eveningReminderHour ?? settings.eveningReminderHour ?? 18;
          const m = updates.eveningReminderMinute ?? settings.eveningReminderMinute ?? 0;
          await NotificationService.scheduleEvening(h, m);
        } else {
          await NotificationService.cancelEvening();
        }
      }
      if (updates.eveningReminderHour !== undefined || updates.eveningReminderMinute !== undefined) {
        const s = { ...settings, ...updates };
        if (s.eveningReminderEnabled) {
          await NotificationService.scheduleEvening(
            s.eveningReminderHour ?? 18,
            s.eveningReminderMinute ?? 0
          );
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
