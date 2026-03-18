import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

interface HighlightsRequest {
  destination: string
  moodTags: string[]
}

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: 'You generate concise, specific travel highlight suggestions. Return ONLY a JSON array of strings — no explanation, no markdown, no wrapper object. Each string should be a short phrase (3–8 words) describing a memorable travel experience.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json()
  return data.content[0].text.trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { destination, moodTags }: HighlightsRequest = await req.json()

    if (!destination) {
      return new Response(JSON.stringify({ error: 'destination is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const dest = destination.split(',')[0].trim()
    const tagsText = moodTags.length > 0 ? `Travel style: ${moodTags.join(', ')}.` : ''

    const prompt = `Generate exactly 8 travel highlight suggestions for a trip to ${dest}. ${tagsText}
Each suggestion should be a short, specific, memorable phrase (3–8 words) capturing something a traveler might have experienced or seen there.
Mix iconic landmarks, local experiences, food, nature, and culture as appropriate.
Return ONLY a JSON array of 8 strings, e.g. ["Old Town evening stroll", "Midnight ramen in Shinjuku"]`

    const raw = await callClaude(prompt)

    // Parse and validate the array
    let highlights: string[] = JSON.parse(raw)
    if (!Array.isArray(highlights)) throw new Error('Unexpected response shape')
    highlights = highlights.slice(0, 8).map((h) => String(h).trim()).filter(Boolean)

    return new Response(JSON.stringify({ highlights }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('generate-highlights error:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Failed to generate highlights' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
