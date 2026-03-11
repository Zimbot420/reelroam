import { supabase } from '../supabase'

export interface ExtractedLocation {
  name: string
  type: 'city' | 'region' | 'country' | 'landmark' | 'neighborhood'
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

export type ExtractionError = 'RATE_LIMIT_EXCEEDED' | 'FETCH_FAILED' | 'PARSE_FAILED'

export async function extractLocations(params: {
  url: string
  platform: 'tiktok' | 'instagram' | 'youtube'
  method: 'text' | 'vision'
  device_id: string
}): Promise<{ data: ExtractionResult | null; error: ExtractionError | string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('extract-locations', {
      body: params,
    })

    if (error) {
      return { data: null, error: error.message ?? 'Unknown error' }
    }

    // Edge function returned a rate limit or other error payload
    if (data?.error) {
      return { data: null, error: data.error as ExtractionError }
    }

    return { data: data as ExtractionResult, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'FETCH_FAILED',
    }
  }
}
