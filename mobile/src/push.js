import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

/**
 * Push notifications (missed workout, coach messages).
 *
 * Remote push needs a development / production build with an EAS projectId:
 *   - Not supported on web.
 *   - Not supported in Expo Go on Android (since SDK 53), so we skip quietly there.
 * expo-notifications is required lazily so the web bundle and Expo Go never touch it when unsupported.
 */
const isExpoGo = Constants.executionEnvironment === 'storeClient';
export const pushSupported = Platform.OS !== 'web' && !(isExpoGo && Platform.OS === 'android');

let N = null;
let currentToken = null;
const lib = () => {
  if (!pushSupported) return null;
  if (!N) {
    N = require('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
      }),
    });
  }
  return N;
};

async function ensureChannels(n) {
  if (Platform.OS !== 'android') return;
  await n.setNotificationChannelAsync('missed', {
    name: 'Missed workouts', importance: n.AndroidImportance.HIGH, vibrationPattern: [0, 250, 150, 250], lightColor: '#FF5A36',
  });
  await n.setNotificationChannelAsync('messages', { name: 'Coach messages', importance: n.AndroidImportance.HIGH });
  await n.setNotificationChannelAsync('reminders', { name: 'Reminders', importance: n.AndroidImportance.DEFAULT });
}

/** Ask permission, get this device's Expo push token and save it on the server. Returns the token or null. */
export async function registerForPush() {
  const n = lib();
  if (!n) return null;
  try {
    await ensureChannels(n); // Android 13+: channel must exist before the permission prompt
    let { status } = await n.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await n.requestPermissionsAsync());
    if (status !== 'granted') return null;
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      console.warn('[push] No EAS projectId. Run `npx eas-cli@latest init` to enable push notifications.');
      return null;
    }
    const { data } = await n.getExpoPushTokenAsync({ projectId });
    currentToken = data;
    await api('/push/register/', { method: 'POST', body: { token: data, platform: Platform.OS } });
    return data;
  } catch (e) {
    console.warn('[push] registration failed:', e.message);
    return null;
  }
}

export const getPushToken = () => currentToken;

/** Call onOpen(data) when the user taps a notification (also for the tap that launched the app). */
export function onNotificationTap(onOpen) {
  const n = lib();
  if (!n) return () => {};
  const last = n.getLastNotificationResponse?.();
  if (last?.notification) {
    onOpen(last.notification.request.content.data || {});
    n.clearLastNotificationResponse?.();
  }
  const sub = n.addNotificationResponseReceivedListener((r) => onOpen(r.notification.request.content.data || {}));
  return () => sub.remove();
}
