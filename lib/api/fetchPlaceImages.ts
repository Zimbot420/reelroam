const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

export interface SlideImage {
  url: string
  locationName: string
}

async function fetchPhotosForLocation(name: string, apiKey: string): Promise<SlideImage[]> {
  try {
    const res = await fetch(
      `${PLACES_BASE}/textsearch/json?query=${encodeURIComponent(name)}&key=${apiKey}`,
    )
    if (!res.ok) return []
    const data = await res.json()
    const photos: Array<{ photo_reference: string }> = data.results?.[0]?.photos ?? []
    return photos.slice(0, 5).map((p) => ({
      url: `${PLACES_BASE}/photo?maxwidth=1600&photo_reference=${p.photo_reference}&key=${apiKey}`,
      locationName: name,
    }))
  } catch {
    return []
  }
}

export async function fetchPlaceImages(
  region: string,
  locationNames: string[],
  apiKey: string,
): Promise<SlideImage[]> {
  if (!apiKey) return []
  // Query region + up to 7 individual location names in parallel
  const names = [region, ...locationNames.slice(0, 7)].filter(Boolean)
  const results = await Promise.all(names.map((n) => fetchPhotosForLocation(n, apiKey)))
  return results.flat().slice(0, 40)
}
