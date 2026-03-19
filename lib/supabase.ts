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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'scrollaway://auth/confirm',
    },
  });
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

// ─── Follows ──────────────────────────────────────────────────────────────────

export async function followUser(deviceId: string, targetUsername: string, userId?: string) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_device_id: deviceId, follower_user_id: userId ?? null, following_username: targetUsername });
  if (error) throw error;
}

export async function unfollowUser(deviceId: string, targetUsername: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_device_id', deviceId)
    .eq('following_username', targetUsername);
  if (error) throw error;
}

export async function isFollowing(deviceId: string, targetUsername: string): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_device_id', deviceId)
    .eq('following_username', targetUsername)
    .maybeSingle();
  return data !== null;
}

export async function getFollowerCount(username: string): Promise<number> {
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_username', username);
  return count ?? 0;
}

export async function getFollowingCount(deviceId: string): Promise<number> {
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_device_id', deviceId);
  return count ?? 0;
}

export async function getFollowingUsernames(deviceId: string): Promise<string[]> {
  const { data } = await supabase
    .from('follows')
    .select('following_username')
    .eq('follower_device_id', deviceId);
  return (data ?? []).map((r: any) => r.following_username);
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface ConversationPreview {
  id: string;
  friend_username: string;
  friend_avatar_emoji: string | null;
  last_message: string | null;
  last_trip_slug: string | null;
  last_message_at: string;
  unread_count: number;
}

export interface Message {
  id: string;
  created_at: string;
  conversation_id: string;
  sender_username: string;
  content: string | null;
  trip_slug: string | null;
  is_read: boolean;
}

export async function getMutualFollows(deviceId: string, myUsername: string): Promise<{ username: string; avatar_emoji: string | null }[]> {
  // Get who I follow
  const following = await getFollowingUsernames(deviceId);
  if (following.length === 0) return [];

  // Check which of them follow me back
  const { data } = await supabase
    .from('follows')
    .select('follower_device_id, following_username')
    .eq('following_username', myUsername)
    .in('follower_device_id', following.map(() => '*')); // can't use this directly

  // Alternative: query all followers of me, intersect with my following list
  const { data: myFollowers } = await supabase
    .from('follows')
    .select('following_username')
    .eq('following_username', myUsername);

  // Get device_ids of people who follow me — need to map to usernames
  // Simpler approach: for each person I follow, check if they follow me
  const { data: followersOfMe } = await supabase
    .from('follows')
    .select('follower_device_id')
    .eq('following_username', myUsername);

  const followerDeviceIds = new Set((followersOfMe ?? []).map((r: any) => r.follower_device_id));

  // Map following usernames to their device_ids via profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, device_id, avatar_emoji')
    .in('username', following);

  const mutuals: { username: string; avatar_emoji: string | null }[] = [];
  for (const p of (profiles ?? [])) {
    if (followerDeviceIds.has(p.device_id)) {
      mutuals.push({ username: p.username, avatar_emoji: p.avatar_emoji });
    }
  }
  return mutuals;
}

export async function getOrCreateConversation(usernameA: string, usernameB: string): Promise<string> {
  const [user_a, user_b] = [usernameA, usernameB].sort();

  // Try to find existing
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_a', user_a)
    .eq('user_b', user_b)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_a, user_b })
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

export async function getConversations(username: string): Promise<ConversationPreview[]> {
  // Get all conversations where this user is participant
  const { data: convos } = await supabase
    .from('conversations')
    .select('*')
    .or(`user_a.eq.${username},user_b.eq.${username}`)
    .order('updated_at', { ascending: false });

  if (!convos || convos.length === 0) return [];

  const previews: ConversationPreview[] = [];
  for (const c of convos) {
    const friendUsername = c.user_a === username ? c.user_b : c.user_a;

    // Get last message
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('content, trip_slug, created_at')
      .eq('conversation_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Skip conversations with no messages
    if (!lastMsg) continue;

    // Get unread count
    const { count: unread } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', c.id)
      .neq('sender_username', username)
      .eq('is_read', false);

    // Get friend's avatar
    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('avatar_emoji')
      .eq('username', friendUsername)
      .maybeSingle();

    previews.push({
      id: c.id,
      friend_username: friendUsername,
      friend_avatar_emoji: friendProfile?.avatar_emoji ?? null,
      last_message: lastMsg.content,
      last_trip_slug: lastMsg.trip_slug,
      last_message_at: lastMsg.created_at,
      unread_count: unread ?? 0,
    });
  }
  return previews;
}

export async function getMessages(conversationId: string, limit = 50): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(
  conversationId: string,
  senderUsername: string,
  content?: string,
  tripSlug?: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_username: senderUsername,
      content: content?.trim() || null,
      trip_slug: tripSlug || null,
    })
    .select()
    .single();
  if (error) throw error;

  // Update conversation timestamp
  await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId).then(() => {}).catch(() => {});

  return data as Message;
}

export async function markConversationRead(conversationId: string, myUsername: string) {
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_username', myUsername)
    .eq('is_read', false);
}

export async function getUnreadMessageCount(username: string): Promise<number> {
  // Get all conversation IDs for this user
  const { data: convos } = await supabase
    .from('conversations')
    .select('id')
    .or(`user_a.eq.${username},user_b.eq.${username}`);

  if (!convos || convos.length === 0) return 0;

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', convos.map((c: any) => c.id))
    .neq('sender_username', username)
    .eq('is_read', false);

  return count ?? 0;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  trips: any[];
  users: any[];
}

export async function searchAll(query: string): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { trips: [], users: [] };

  const pattern = `%${q}%`;

  // Search trips by title or destination
  const tripsPromise = supabase
    .from('trips')
    .select('id, title, share_slug, itinerary, username, user_avatar_emoji, like_count, save_count, comment_count, created_at')
    .eq('is_public', true)
    .or(`title.ilike.${pattern},username.ilike.${pattern}`)
    .order('like_count', { ascending: false })
    .limit(20);

  // Also search by itinerary destination (separate query since it's JSONB)
  const destPromise = supabase
    .from('trips')
    .select('id, title, share_slug, itinerary, username, user_avatar_emoji, like_count, save_count, comment_count, created_at')
    .eq('is_public', true)
    .ilike('itinerary->>destination', pattern)
    .order('like_count', { ascending: false })
    .limit(20);

  // Search users by username or display_name
  const usersPromise = supabase
    .from('profiles')
    .select('username, display_name, avatar_emoji, avatar_url, bio, visited_countries')
    .not('username', 'is', null)
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .limit(15);

  const [tripsRes, destRes, usersRes] = await Promise.all([tripsPromise, destPromise, usersPromise]);

  // Merge + deduplicate trips
  const allTrips = [...(tripsRes.data ?? []), ...(destRes.data ?? [])];
  const seen = new Set<string>();
  const trips = allTrips.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  return { trips, users: usersRes.data ?? [] };
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
