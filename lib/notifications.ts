import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Show alerts while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PERMISSION_ASKED_KEY = '@notification_permission_asked';

export async function hasAskedForPermission(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
  return val === 'true';
}

export async function requestPermissions(): Promise<boolean> {
  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');

  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    const granted = await requestPermissions();
    if (!granted) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();

    await supabase
      .from('profiles')
      .update({ push_token: token.data })
      .eq('user_id', userId);

    return token.data;
  } catch {
    return null;
  }
}

// ─── Local notifications (in-app) ────────────────────────────────────────────

export async function schedulePushNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {} },
    trigger: null,
  });
}

// ─── Database notifications ───────────────────────────────────────────────────

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>,
) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data: data ?? {},
  });
  if (error) console.warn('createNotification error:', error.message);
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllNotificationsRead(userId: string) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

// ─── RPC-backed helpers ───────────────────────────────────────────────────────

/**
 * Notify the owner of a trip (e.g. when someone likes or saves it).
 * Uses the notify_trip_owner RPC (SECURITY DEFINER) to bypass RLS.
 * Silently no-ops if the trip has no authenticated owner or the caller IS the owner.
 */
export async function notifyTripOwner(
  tripId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>,
) {
  await supabase.rpc('notify_trip_owner', {
    p_trip_id: tripId,
    p_type: type,
    p_title: title,
    p_body: body,
    p_data: data ?? {},
  });
}

/**
 * After a trip is saved, check if the user hit a count milestone (1/5/10/25/50)
 * and fire a milestone notification via RPC.
 */
export async function checkMilestone(userId: string) {
  await supabase.rpc('check_trip_milestone', { p_user_id: userId });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'trip_saved'
  | 'badge_earned'
  | 'trip_liked'
  | 'comment_added'
  | 'user_followed'
  | 'milestone'
  | 'weekly_recap';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}
