import { supabase } from '../supabase'

export interface ExtractedLocation {
  name: string
  type: string
  country: string
  confidence: number
}

export interface ExtractionResult {
  locations: ExtractedLocation[]
  region: string
  suggestedDays: number
  needsVision: boolean
  extractionMethod: 'text' | 'vision'
}

export async function extractLocations(
  url: string,
  platform: string,
  device_id: string,
  method: 'text' | 'vision' = 'text',
): Promise<ExtractionResult> {
  const { data, error } = await supabase.functions.invoke('extract-locations', {
    body: { url, platform, method, device_id },
  })

  if (error) {
    // FunctionsHttpError has a `context` Response — read the actual body for the real error message
    try {
      const body = await (error as any).context?.json?.()
      if (body?.error) throw new Error(body.error)
    } catch (inner) {
      if (inner instanceof Error && inner.message !== error.message) throw inner
    }
    throw new Error(error.message ?? 'Extraction failed')
  }
  if (data?.error === 'RATE_LIMIT_EXCEEDED') throw new Error('RATE_LIMIT_EXCEEDED')
  if (data?.error) throw new Error(data.error)

  return data as ExtractionResult
}
