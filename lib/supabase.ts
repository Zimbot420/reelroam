import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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

export async function upsertProfile(deviceId: string, username: string, avatarEmoji: string) {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { device_id: deviceId, username, avatar_emoji: avatarEmoji },
      { onConflict: 'device_id' },
    );
  if (error) throw error;
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
