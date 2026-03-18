/**
 * offlineCache.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AsyncStorage-backed cache so users can access their trip itineraries
 * offline (e.g. mid-travel without signal).
 *
 * Keys:
 *   @reelroam/trip/<slug>      — full TripRow JSON, keyed by share_slug
 *   @reelroam/my_trips         — array of user's own trip summaries
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TRIP_PREFIX  = '@reelroam/trip/';
const MY_TRIPS_KEY = '@reelroam/my_trips';
const MAX_LIST_CACHED = 50;

// ─── Trip detail ──────────────────────────────────────────────────────────────

export async function cacheTripDetail(trip: Record<string, unknown>): Promise<void> {
  try {
    const slug = trip.share_slug as string;
    if (!slug) return;
    await AsyncStorage.setItem(TRIP_PREFIX + slug, JSON.stringify(trip));
  } catch {
    // Storage write failure is non-fatal — ignore silently
  }
}

export async function getCachedTripDetail(slug: string): Promise<Record<string, unknown> | null> {
  try {
    const json = await AsyncStorage.getItem(TRIP_PREFIX + slug);
    return json ? (JSON.parse(json) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function removeCachedTripDetail(slug: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(TRIP_PREFIX + slug);
  } catch {}
}

// ─── My trips list ────────────────────────────────────────────────────────────

export async function cacheMyTripsList(trips: unknown[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      MY_TRIPS_KEY,
      JSON.stringify(trips.slice(0, MAX_LIST_CACHED)),
    );
  } catch {}
}

export async function getCachedMyTripsList(): Promise<unknown[] | null> {
  try {
    const json = await AsyncStorage.getItem(MY_TRIPS_KEY);
    return json ? (JSON.parse(json) as unknown[]) : null;
  } catch {
    return null;
  }
}
