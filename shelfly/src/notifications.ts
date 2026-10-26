import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isoIn, fromISO } from './dates';
import { Item, Recipe } from './data/types';
import { digestFor } from './digestText';

const DAYS_AHEAD = 7;
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function notificationsAllowed(ask: boolean): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!supported) return 'denied';
  let { status } = await Notifications.getPermissionsAsync();
  if (status === 'undetermined' && ask) ({ status } = await Notifications.requestPermissionsAsync());
  return status;
}

// Local notifications only: one per morning for the next week, written from today's inventory.
// Called again whenever the inventory or digest settings change, so the text stays current.
export async function scheduleDigest(items: Item[], recipes: Recipe[], on: boolean, minutes: number) {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!on || (await notificationsAllowed(false)) !== 'granted') return;
  const now = Date.now();
  for (let day = 0; day < DAYS_AHEAD; day++) {
    const at = fromISO(isoIn(day));
    at.setHours(Math.floor(minutes / 60), minutes % 60);
    if (at.getTime() <= now) continue;
    const msg = digestFor(items, day, recipes);
    if (!msg) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: msg.title, body: msg.body, data: { url: '/' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}
