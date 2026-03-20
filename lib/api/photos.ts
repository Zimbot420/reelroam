/**
 * Free photo service using Unsplash API.
 * Replaces Google Places photo fetching to eliminate $0.024/call costs.
 *
 * Unsplash free tier: 50 req/hr (demo), unlimited (production — apply at unsplash.com/developers).
 * For now, we use the demo key. If rate-limited, falls back to a deterministic placeholder.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const UNSPLASH_BASE = 'https://api.unsplash.com';
const UNSPLASH_ACCESS_KEY = 'nOofYNPprVKQJc8VOdXfi9xhxUYJTvZD7xD5_NcvfcE';

// ─── In-memory cache (persists across mounts within a session) ───────────────
const memoryCache = new Map<string, string[]>();

// ─── AsyncStorage disk cache (persists across app launches) ──────────────────
const DISK_CACHE_PREFIX = '@photo_cache:';

async function getCachedPhotos(key: string): Promise<string[] | null> {
  // Memory first
  const mem = memoryCache.get(key);
  if (mem) return mem;

  // Disk fallback
  try {
    const stored = await AsyncStorage.getItem(DISK_CACHE_PREFIX + key);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

async function setCachedPhotos(key: string, urls: string[]) {
  memoryCache.set(key, urls);
  try {
    await AsyncStorage.setItem(DISK_CACHE_PREFIX + key, JSON.stringify(urls));
  } catch {}
}

// ─── Unsplash search ─────────────────────────────────────────────────────────

async function searchUnsplash(query: string, count = 3): Promise<string[]> {
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
    // No API key — use deterministic placeholder
    return generatePlaceholders(query, count);
  }

  try {
    const res = await fetch(
      `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query + ' travel')}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } },
    );

    if (!res.ok) {
      // Rate limited or error — fall back to placeholders
      return generatePlaceholders(query, count);
    }

    const data = await res.json();
    const photos = (data.results ?? []).map((r: any) => r.urls?.regular ?? r.urls?.small ?? '');
    return photos.filter(Boolean);
  } catch {
    return generatePlaceholders(query, count);
  }
}

// ─── Deterministic placeholder (zero API calls) ─────────────────────────────

function generatePlaceholders(query: string, count: number): string[] {
  // Use picsum.photos with a seed derived from the query for consistent images
  const seed = hashCode(query);
  return Array.from({ length: count }, (_, i) =>
    `https://picsum.photos/seed/${Math.abs(seed + i)}/800/500`,
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

// ─── Public API (drop-in replacements) ───────────────────────────────────────

/**
 * Fetch photos for a destination/location. Replaces Google Places findplacefromtext + photo.
 * Returns up to `count` photo URLs. Results are cached to disk.
 */
export async function fetchLocationPhoto(query: string, count = 3): Promise<string[]> {
  if (!query.trim()) return [];

  const cacheKey = `loc:${query.toLowerCase().trim()}`;
  const cached = await getCachedPhotos(cacheKey);
  if (cached) return cached;

  const urls = await searchUnsplash(query, count);
  if (urls.length > 0) await setCachedPhotos(cacheKey, urls);
  return urls;
}

/**
 * Fetch photos for a trip (destination + location names).
 * Replaces fetchPlaceImages / fetchTripPhotos from Google Places.
 */
export async function fetchTripPhotos(
  destination: string,
  locationNames: string[],
): Promise<string[]> {
  const names = [destination, ...locationNames.slice(0, 4)].filter(Boolean);
  if (names.length === 0) return [];

  const results = await Promise.all(names.map((n) => fetchLocationPhoto(n, 2)));

  // Destination hero shot leads; remaining follow
  const destPhotos = results[0] ?? [];
  const locPhotos = results.slice(1).flat();
  return [destPhotos[0], ...locPhotos, ...destPhotos.slice(1)].filter(Boolean).slice(0, 12);
}

/**
 * Fetch a single photo URL for an activity/place. Replaces usePlacePhoto from Google Places.
 * Returns a single URL or empty string.
 */
export async function fetchActivityPhoto(name: string, locationName: string): Promise<string> {
  const query = [name, locationName].filter(Boolean).join(' ');
  if (!query) return '';

  const cacheKey = `act:${query.toLowerCase().trim()}`;
  const cached = await getCachedPhotos(cacheKey);
  if (cached && cached[0]) return cached[0];

  const urls = await searchUnsplash(query, 1);
  const url = urls[0] ?? '';
  if (url) await setCachedPhotos(cacheKey, [url]);
  return url;
}
