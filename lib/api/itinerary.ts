import { supabase } from '../supabase'
import { ExtractionResult } from './extract'

export interface GenerateParams extends ExtractionResult {
  device_id: string
  is_pro: boolean
  source_url: string
  platform: string
}

export interface GenerateResult {
  slug: string
  trip: Record<string, unknown>
}

export async function generateItinerary(params: GenerateParams): Promise<GenerateResult> {
  const { data, error } = await supabase.functions.invoke('generate-itinerary', {
    body: params,
  })

  if (error) throw new Error(error.message ?? 'Generation failed')
  if (data?.error) throw new Error(data.error)

  return data as GenerateResult
}
