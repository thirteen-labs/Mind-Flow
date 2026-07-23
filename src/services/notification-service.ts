import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const MORNING_ID = 'mindflow-morning-reminder';
const EVENING_ID = 'mindflow-evening-reminder';
const STREAK_ID = 'mindflow-streak-reminder';

export const NotificationService = {
  async setup(): Promise<void> {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('mindflow-reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  },

  async requestPermissions(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: true },
    });
    return status === 'granted';
  },

  async scheduleMorning(hour: number, minute: number): Promise<void> {
    await NotificationService.cancelMorning();
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_ID,
      content: {
        title: 'Good morning',
        body: 'Take a moment to write in your journal.',
        sound: undefined,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  },

  async cancelMorning(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(MORNING_ID);
  },

  async scheduleEvening(hour: number, minute: number): Promise<void> {
    await NotificationService.cancelEvening();
    await Notifications.scheduleNotificationAsync({
      identifier: EVENING_ID,
      content: {
        title: 'Evening reflection',
        body: 'How was your day? Reflect in your journal.',
        sound: undefined,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  },

  async cancelEvening(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(EVENING_ID);
  },

  async scheduleStreak(): Promise<void> {
    await NotificationService.cancelStreak();
    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_ID,
      content: {
        title: 'Keep your streak',
        body: "You haven't written today. A single sentence is enough.",
        sound: undefined,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0 },
    });
  },

  async cancelStreak(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(STREAK_ID);
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(MORNING_ID);
    await Notifications.cancelScheduledNotificationAsync(EVENING_ID);
    await Notifications.cancelScheduledNotificationAsync(STREAK_ID);
  },
};
