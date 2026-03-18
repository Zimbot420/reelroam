import { supabase } from '../supabase'

export async function generateHighlights(
  destination: string,
  moodTags: string[],
): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('generate-highlights', {
    body: { destination, moodTags },
  })

  if (error) {
    try {
      const body = await (error as any).context?.json?.()
      if (body?.error) throw new Error(body.error)
    } catch (inner) {
      if (inner instanceof Error && inner.message !== error.message) throw inner
    }
    throw new Error(error.message ?? 'Failed to generate highlights')
  }

  if (data?.error) throw new Error(data.error)
  if (!Array.isArray(data?.highlights)) throw new Error('Invalid response from highlights API')

  return data.highlights as string[]
}
