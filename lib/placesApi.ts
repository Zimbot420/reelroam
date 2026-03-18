/**
 * Google Places Nearby Search API helpers.
 * All requests are client-side — EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is safe to use here.
 */

export const POI_CATEGORIES = [
  { type: 'restaurant',       emoji: '🍽️', label: 'Food'     },
  { type: 'tourist_attraction', emoji: '⭐', label: 'Sights'   },
  { type: 'cafe',             emoji: '☕', label: 'Café'     },
  { type: 'bar',              emoji: '🍸', label: 'Bars'     },
  { type: 'museum',           emoji: '🏛️', label: 'Culture'  },
  { type: 'park',             emoji: '🌿', label: 'Parks'    },
  { type: 'shopping_mall',    emoji: '🛍️', label: 'Shopping' },
] as const

export type POIType = (typeof POI_CATEGORIES)[number]['type']

export interface POIPlace {
  place_id: string
  name: string
  type: POIType
  emoji: string
  latitude: number
  longitude: number
  rating?: number
  user_ratings_total?: number
  vicinity?: string
  price_level?: number
  opening_hours?: { open_now?: boolean }
  photo_reference?: string
}

export interface PlaceDetail extends POIPlace {
  formatted_address?: string
  formatted_phone_number?: string
  website?: string
  opening_hours_detail?: {
    open_now?: boolean
    weekday_text?: string[]
  }
}

const BASE = 'https://maps.googleapis.com/maps/api/place'

// ─── Nearby Search ────────────────────────────────────────────────────────────

export async function fetchNearbyPOIs(
  lat: number,
  lng: number,
  type: POIType,
  apiKey: string,
  radius = 1500,
): Promise<POIPlace[]> {
  const url =
    `${BASE}/nearbysearch/json` +
    `?location=${lat},${lng}` +
    `&radius=${radius}` +
    `&type=${type}` +
    `&key=${apiKey}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return []

    const category = POI_CATEGORIES.find((c) => c.type === type)

    return (data.results ?? []).slice(0, 10).map((p: any): POIPlace => ({
      place_id: p.place_id,
      name: p.name,
      type,
      emoji: category?.emoji ?? '📍',
      latitude: p.geometry.location.lat,
      longitude: p.geometry.location.lng,
      rating: p.rating,
      user_ratings_total: p.user_ratings_total,
      vicinity: p.vicinity,
      price_level: p.price_level,
      opening_hours: p.opening_hours,
      photo_reference: p.photos?.[0]?.photo_reference,
    }))
  } catch {
    return []
  }
}

// ─── Fetch all categories in parallel ─────────────────────────────────────────

export async function fetchAllNearbyPOIs(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<POIPlace[]> {
  const results = await Promise.all(
    POI_CATEGORIES.map((c) => fetchNearbyPOIs(lat, lng, c.type, apiKey)),
  )
  return results.flat()
}

// ─── Place Details ─────────────────────────────────────────────────────────────

export async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<PlaceDetail | null> {
  const fields = [
    'place_id', 'name', 'geometry', 'formatted_address', 'formatted_phone_number',
    'website', 'rating', 'user_ratings_total', 'price_level', 'opening_hours',
    'photos', 'vicinity', 'types',
  ].join(',')

  const url = `${BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.status !== 'OK') return null

    const r = data.result
    const type = inferType(r.types ?? [])
    const category = POI_CATEGORIES.find((c) => c.type === type)

    return {
      place_id: r.place_id,
      name: r.name,
      type,
      emoji: category?.emoji ?? '📍',
      latitude: r.geometry?.location?.lat ?? 0,
      longitude: r.geometry?.location?.lng ?? 0,
      rating: r.rating,
      user_ratings_total: r.user_ratings_total,
      vicinity: r.vicinity,
      price_level: r.price_level,
      opening_hours: r.opening_hours,
      photo_reference: r.photos?.[0]?.photo_reference,
      formatted_address: r.formatted_address,
      formatted_phone_number: r.formatted_phone_number,
      website: r.website,
      opening_hours_detail: r.opening_hours,
    }
  } catch {
    return null
  }
}

// ─── Photo URL ─────────────────────────────────────────────────────────────────

export function buildPhotoUrl(photoReference: string, apiKey: string, maxWidth = 400): string {
  return `${BASE}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`
}

// ─── Price level display ───────────────────────────────────────────────────────

export function priceLevelText(level?: number): string {
  if (level == null) return ''
  return '$'.repeat(Math.min(level, 4)) || 'Free'
}

// ─── Distance between two coords (metres) ────────────────────────────────────

export function distanceMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Simple clustering ─────────────────────────────────────────────────────────
// Groups POIs that are within `threshold` metres of each other into clusters.
// Returns a mix of POIPlace items (singles) and ClusterGroup items.

export interface ClusterGroup {
  id: string
  latitude: number
  longitude: number
  count: number
  items: POIPlace[]
}

export function clusterPOIs(pois: POIPlace[], thresholdMetres = 80): Array<POIPlace | ClusterGroup> {
  const visited = new Set<string>()
  const result: Array<POIPlace | ClusterGroup> = []

  for (const poi of pois) {
    if (visited.has(poi.place_id)) continue
    visited.add(poi.place_id)

    const nearby = pois.filter(
      (other) =>
        other.place_id !== poi.place_id &&
        !visited.has(other.place_id) &&
        distanceMetres(poi.latitude, poi.longitude, other.latitude, other.longitude) < thresholdMetres,
    )

    if (nearby.length === 0) {
      result.push(poi)
    } else {
      nearby.forEach((n) => visited.add(n.place_id))
      const all = [poi, ...nearby]
      const avgLat = all.reduce((s, p) => s + p.latitude, 0) / all.length
      const avgLng = all.reduce((s, p) => s + p.longitude, 0) / all.length
      result.push({ id: `cluster-${poi.place_id}`, latitude: avgLat, longitude: avgLng, count: all.length, items: all })
    }
  }

  return result
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferType(types: string[]): POIType {
  const priority: POIType[] = ['tourist_attraction', 'museum', 'shopping_mall', 'restaurant', 'cafe', 'bar', 'park']
  for (const p of priority) {
    if (types.includes(p)) return p
  }
  return 'restaurant'
}
