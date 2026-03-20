import { fetchLocationPhoto } from './photos'

export interface SlideImage {
  url: string
  locationName: string
}

async function fetchPhotosForLocation(name: string): Promise<SlideImage[]> {
  try {
    const urls = await fetchLocationPhoto(name, 5)
    return urls.map((url) => ({ url, locationName: name }))
  } catch {
    return []
  }
}

export async function fetchPlaceImages(
  region: string,
  locationNames: string[],
  _apiKey?: string,
): Promise<SlideImage[]> {
  const names = [region, ...locationNames.slice(0, 7)].filter(Boolean)
  const results = await Promise.all(names.map((n) => fetchPhotosForLocation(n)))
  return results.flat().slice(0, 40)
}
