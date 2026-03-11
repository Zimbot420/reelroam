import { supabase } from '../supabase';
import { getOrCreateDeviceId } from '../../hooks/useRecentTrips';
import { Trip, Location, Day } from '../../types';

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
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save trip: ${error.message}`);
  return row as Trip;
}
