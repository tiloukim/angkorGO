// Register for Expo push notifications and persist the token to push_tokens.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert is the legacy field name; banner/list are the SDK 52+
    // replacements. Include all three so the handler type-checks across the
    // installed expo-notifications typings.
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return; // simulators can't get a push token

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !token) return;

  await supabase.from('push_tokens').upsert(
    { user_id: user.id, token, platform: Platform.OS, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,token' },
  );
}
