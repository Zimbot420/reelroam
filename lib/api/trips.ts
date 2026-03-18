import { supabase } from '../supabase';
import { getOrCreateDeviceId } from '../deviceId';
import { checkMilestone } from '../notifications';
import { cacheTripDetail } from '../offlineCache';
import { Trip, Location, Day, ItineraryData } from '../../types';

export async function updateTripItinerary(tripId: string, itinerary: ItineraryData): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .update({ itinerary })
    .eq('id', tripId);
  if (error) throw new Error(`Failed to update trip: ${error.message}`);

  // Refresh the cached detail so the offline copy reflects the edit
  const { data } = await supabase.from('trips').select('*').eq('id', tripId).single();
  if (data) cacheTripDetail(data as Record<string, unknown>);
}

export async function addLocationToTrip(tripId: string, location: Location): Promise<void> {
  // Fetch current locations array
  const { data, error: fetchErr } = await supabase
    .from('trips')
    .select('locations')
    .eq('id', tripId)
    .single();
  if (fetchErr) throw new Error(`Failed to fetch trip: ${fetchErr.message}`);

  const existing: Location[] = Array.isArray(data?.locations) ? data.locations : [];

  // Avoid duplicate (same name + coords)
  const isDupe = existing.some(
    (l) => l.name === location.name && l.latitude === location.latitude && l.longitude === location.longitude,
  );
  if (isDupe) return;

  const updated = [...existing, location];

  const { error: updateErr } = await supabase
    .from('trips')
    .update({ locations: updated })
    .eq('id', tripId);
  if (updateErr) throw new Error(`Failed to update trip: ${updateErr.message}`);
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export async function saveTrip(data: {
  sourceUrl: string;
  platform: string;
  title: string;
  locations: Location[];
  itinerary: Day[];
  extractionMethod: 'text' | 'vision';
  isPro: boolean;
}): Promise<Trip> {
  const deviceId = await getOrCreateDeviceId();
  const shareSlug = generateSlug(data.title);

  // Attach authenticated user_id if logged in (enables ownership & milestone notifications)
  const { data: { user } } = await supabase.auth.getUser();

  const { data: row, error } = await supabase
    .from('trips')
    .insert({
      source_url: data.sourceUrl,
      platform: data.platform,
      title: data.title,
      locations: data.locations,
      itinerary: data.itinerary,
      share_slug: shareSlug,
      extraction_method: data.extractionMethod,
      is_pro: data.isPro,
      device_id: deviceId,
      user_id: user?.id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save trip: ${error.message}`);

  // Cache immediately so the trip is readable offline right after creation
  cacheTripDetail(row as Record<string, unknown>);

  // Fire milestone notification if user is authenticated (fire-and-forget)
  if (user?.id) {
    checkMilestone(user.id).catch(() => {});
  }

  return row as Trip;
}
