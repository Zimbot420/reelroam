/**
 * Free photo service using Unsplash API.
 * Replaces Google Places photo fetching to eliminate $0.024/call costs.
 *
 * Unsplash production: 5,000 req/hr (free with attribution).
 * Attribution required: "Photo by [Name] on Unsplash"
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const UNSPLASH_BASE = 'https://api.unsplash.com';
const UNSPLASH_ACCESS_KEY = 'nOofYNPprVKQJc8VOdXfi9xhxUYJTvZD7xD5_NcvfcE';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PhotoWithAttribution {
  url: string;
  photographer: string;
  photographerUrl: string;
  downloadEndpoint: string;  // Must be triggered per Unsplash guidelines
}

// ─── In-memory cache ─────────────────────────────────────────────────────────
const memoryCache = new Map<string, PhotoWithAttribution[]>();

const DISK_CACHE_PREFIX = '@photo_cache_v2:';

async function getCachedPhotos(key: string): Promise<PhotoWithAttribution[] | null> {
  const mem = memoryCache.get(key);
  if (mem) return mem;
  try {
    const stored = await AsyncStorage.getItem(DISK_CACHE_PREFIX + key);
    if (stored) {
      const parsed = JSON.parse(stored) as PhotoWithAttribution[];
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

async function setCachedPhotos(key: string, photos: PhotoWithAttribution[]) {
  memoryCache.set(key, photos);
  try {
    await AsyncStorage.setItem(DISK_CACHE_PREFIX + key, JSON.stringify(photos));
  } catch {}
}

// ─── Unsplash search (with attribution) ──────────────────────────────────────

async function searchUnsplash(query: string, count = 3): Promise<PhotoWithAttribution[]> {
  if (!UNSPLASH_ACCESS_KEY) return generatePlaceholders(query, count);

  try {
    const res = await fetch(
      `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query + ' travel')}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } },
    );

    if (!res.ok) return generatePlaceholders(query, count);

    const data = await res.json();
    const photos: PhotoWithAttribution[] = (data.results ?? []).map((r: any) => ({
      url: r.urls?.regular ?? r.urls?.small ?? '',
      photographer: r.user?.name ?? 'Unknown',
      photographerUrl: r.user?.links?.html ?? 'https://unsplash.com',
      downloadEndpoint: r.links?.download_location ?? '',
    })).filter((p: PhotoWithAttribution) => p.url);

    // Trigger download tracking for each photo (required by Unsplash guidelines)
    for (const p of photos) {
      if (p.downloadEndpoint) {
        fetch(`${p.downloadEndpoint}?client_id=${UNSPLASH_ACCESS_KEY}`).catch(() => {});
      }
    }

    return photos;
  } catch {
    return generatePlaceholders(query, count);
  }
}

// ─── Placeholders (zero API calls) ───────────────────────────────────────────

function generatePlaceholders(query: string, count: number): PhotoWithAttribution[] {
  const seed = hashCode(query);
  return Array.from({ length: count }, (_, i) => ({
    url: `https://picsum.photos/seed/${Math.abs(seed + i)}/800/500`,
    photographer: '',
    photographerUrl: '',
    downloadEndpoint: '',
  }));
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Fetch photos with attribution for a destination. Cached to disk. */
export async function fetchLocationPhotoWithAttribution(query: string, count = 3): Promise<PhotoWithAttribution[]> {
  if (!query.trim()) return [];
  const cacheKey = `loc2:${query.toLowerCase().trim()}`;
  const cached = await getCachedPhotos(cacheKey);
  if (cached) return cached;
  const photos = await searchUnsplash(query, count);
  if (photos.length > 0) await setCachedPhotos(cacheKey, photos);
  return photos;
}

/** Simple URL-only wrapper (backwards compatible). */
export async function fetchLocationPhoto(query: string, count = 3): Promise<string[]> {
  const photos = await fetchLocationPhotoWithAttribution(query, count);
  return photos.map((p) => p.url);
}

/** Fetch photos for a trip. Returns URLs + attribution for the first photo. */
export async function fetchTripPhotos(
  destination: string,
  _locationNames: string[],
): Promise<string[]> {
  const names = [destination].filter(Boolean);
  if (names.length === 0) return [];
  const results = await Promise.all(names.map((n) => fetchLocationPhoto(n, 2)));
  const destPhotos = results[0] ?? [];
  return destPhotos.filter(Boolean).slice(0, 12);
}

/** Fetch trip photos with attribution data (for storing in JSONB). */
export async function fetchTripPhotosWithAttribution(
  destination: string,
): Promise<PhotoWithAttribution[]> {
  if (!destination) return [];
  return fetchLocationPhotoWithAttribution(destination, 5);
}

/** Fetch a single photo for an activity. */
export async function fetchActivityPhoto(name: string, locationName: string): Promise<string> {
  const query = [name, locationName].filter(Boolean).join(' ');
  if (!query) return '';
  const photos = await fetchLocationPhoto(query, 1);
  return photos[0] ?? '';
}
