import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { notifyTripOwner } from './notifications';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithApple() {
  if (Platform.OS !== 'ios') throw new Error('Apple Sign In is only available on iOS');
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('No identity token from Apple');
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'scrollaway' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('No OAuth URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;

  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('No code in redirect URL');

  const { data: session, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
  if (sessionError) throw sessionError;
  return session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}

// ─── Discovery feed ───────────────────────────────────────────────────────────

export async function getPublicFeedTrips(page = 0, limit = 20) {
  const { data, error } = await supabase.rpc('get_feed_trips', {
    page_offset: page * limit,
    page_limit: limit,
  });
  if (error) throw error;
  return data ?? [];
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function likeTrip(tripId: string, deviceId: string) {
  const { error } = await supabase
    .from('trip_likes')
    .insert({ trip_id: tripId, device_id: deviceId });
  if (error) throw error;
  await supabase.rpc('increment_like_count', { trip_id_arg: tripId }).throwOnError();
  // Notify trip owner (fire-and-forget; no-ops if owner has no account)
  notifyTripOwner(tripId, 'trip_liked', 'Someone liked your trip!', 'Your trip is getting love.', { trip_id: tripId }).catch(() => {});
}

export async function unlikeTrip(tripId: string, deviceId: string) {
  const { error } = await supabase
    .from('trip_likes')
    .delete()
    .eq('trip_id', tripId)
    .eq('device_id', deviceId);
  if (error) throw error;
  await supabase.rpc('decrement_like_count', { trip_id_arg: tripId });
}

export async function hasLikedTrip(tripId: string, deviceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('trip_likes')
    .select('id')
    .eq('trip_id', tripId)
    .eq('device_id', deviceId)
    .maybeSingle();
  return data !== null;
}

// ─── Saves ────────────────────────────────────────────────────────────────────

export async function saveTrip(tripId: string, deviceId: string) {
  const { error } = await supabase
    .from('trip_saves')
    .insert({ trip_id: tripId, device_id: deviceId });
  if (error) throw error;
  await supabase.rpc('increment_save_count', { trip_id_arg: tripId });
  // Notify trip owner (fire-and-forget; no-ops if owner has no account)
  notifyTripOwner(tripId, 'trip_saved', 'Someone saved your trip!', 'Your trip was added to their bucket list.', { trip_id: tripId }).catch(() => {});
}

export async function unsaveTrip(tripId: string, deviceId: string) {
  const { error } = await supabase
    .from('trip_saves')
    .delete()
    .eq('trip_id', tripId)
    .eq('device_id', deviceId);
  if (error) throw error;
  await supabase.rpc('decrement_save_count', { trip_id_arg: tripId });
}

export async function hasSavedTrip(tripId: string, deviceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('trip_saves')
    .select('id')
    .eq('trip_id', tripId)
    .eq('device_id', deviceId)
    .maybeSingle();
  return data !== null;
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface TripComment {
  id: string;
  created_at: string;
  trip_id: string;
  device_id: string;
  user_id: string | null;
  username: string | null;
  avatar_emoji: string | null;
  content: string;
  is_edited: boolean;
}

export async function getComments(tripId: string): Promise<TripComment[]> {
  const { data, error } = await supabase
    .from('trip_comments')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TripComment[];
}

export async function addComment(
  tripId: string,
  deviceId: string,
  content: string,
  userId?: string,
  username?: string,
  avatarEmoji?: string,
): Promise<TripComment> {
  const { data, error } = await supabase
    .from('trip_comments')
    .insert({
      trip_id: tripId,
      device_id: deviceId,
      user_id: userId ?? null,
      username: username ?? null,
      avatar_emoji: avatarEmoji ?? null,
      content: content.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as TripComment;
}

export async function deleteComment(commentId: string, deviceId: string, tripId: string) {
  const { error } = await supabase
    .from('trip_comments')
    .delete()
    .eq('id', commentId)
    .eq('device_id', deviceId);
  if (error) throw error;
  await supabase.rpc('decrement_comment_count', { trip_id_arg: tripId }).catch(() => {});
}

export async function getCommentCount(tripId: string): Promise<number> {
  const { count } = await supabase
    .from('trip_comments')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId);
  return count ?? 0;
}

// ─── Feed publishing ─────────────────────────────────────────────────────────

export async function publishTrip(tripId: string, username: string, avatarEmoji: string) {
  const { error } = await supabase
    .from('trips')
    .update({ is_public: true, username, user_avatar_emoji: avatarEmoji })
    .eq('id', tripId);
  if (error) throw error;
}

export async function unpublishTrip(tripId: string) {
  const { error } = await supabase
    .from('trips')
    .update({ is_public: false })
    .eq('id', tripId);
  if (error) throw error;
}

export async function isUsernameAvailable(username: string, deviceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('device_id')
    .eq('username', username)
    .maybeSingle();
  return data === null || data.device_id === deviceId;
}

export async function upsertProfile(deviceId: string, username: string, avatarEmoji: string, userId?: string) {
  const data: Record<string, any> = { device_id: deviceId, username, avatar_emoji: avatarEmoji };
  if (userId) data.user_id = userId;
  const { error } = await supabase
    .from('profiles')
    .upsert(data, { onConflict: 'device_id' });
  if (error) throw error;
}

// ─── Past trips ───────────────────────────────────────────────────────────────

export async function getPastTrips(deviceId: string, userId?: string) {
  const { data, error } = await supabase.rpc('get_past_trips', {
    p_device_id: deviceId,
    p_user_id: userId ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function deletePastTrip(tripId: string) {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

export async function sharePastTrip(tripId: string, username: string | null, avatarEmoji: string) {
  const { error } = await supabase.from('trips').update({
    is_public: true,
    username,
    user_avatar_emoji: avatarEmoji,
  }).eq('id', tripId);
  if (error) throw error;
}

// ─── Bucket list ──────────────────────────────────────────────────────────────

// ─── My trips (device-owned) ──────────────────────────────────────────────────

export async function getUserTrips(deviceId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('id, title, itinerary, locations, created_at')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Bucket list ──────────────────────────────────────────────────────────────

export async function getSavedTrips(deviceId: string) {
  const { data: saves } = await supabase
    .from('trip_saves')
    .select('trip_id, created_at')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false });

  if (!saves || saves.length === 0) return [];

  type SaveRow = { trip_id: string; created_at: string };
  const tripIds = saves.map((s: SaveRow) => s.trip_id);
  const saveMap: Record<string, string> = Object.fromEntries(
    saves.map((s: SaveRow) => [s.trip_id, s.created_at]),
  );

  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .in('id', tripIds);

  if (error) throw error;
  return (trips ?? []).map((t: any) => ({ ...t, saved_at: saveMap[t.id] ?? t.created_at }));
}
