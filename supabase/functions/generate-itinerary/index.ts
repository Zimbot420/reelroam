import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ExtractedLocation {
  name: string
  type: string
  country: string
  confidence: number
}

interface GenerateRequest {
  locations: ExtractedLocation[]
  region: string
  suggestedDays: number
  device_id: string
  is_pro: boolean
  source_url: string
  platform: string
  extraction_method: string
}

// --- Claude API call ---

async function callClaude(prompt: string, system: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content[0].text
}

// --- Share slug generator ---

function generateSlug(destination: string, days: number): string {
  const base = destination
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 20)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${days}days-${suffix}`
}

// --- Parse Claude JSON response safely ---

function parseItinerary(raw: string): object {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body: GenerateRequest = await req.json()
    const { locations, region, suggestedDays, device_id, is_pro, source_url, platform, extraction_method } = body

    if (!locations?.length || !device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: locations, device_id' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const locationList = locations.map((l) => `- ${l.name} (${l.type}, ${l.country})`).join('\n')
    const days = suggestedDays ?? 5

    const system = `You are an expert travel itinerary planner. Generate detailed, realistic travel itineraries.
Always return ONLY valid JSON — no markdown, no explanation, no code blocks.
For coordinates: use precise lat/lng for every activity location. If unsure of exact coordinates, use the nearest city center — never return null or 0,0.
Activity IDs must be unique strings like "act-1", "act-2", etc.`

    const prompt = `Create a ${days}-day travel itinerary for these locations:
${locationList}
Region: ${region || 'Unknown'}

Return this exact JSON structure:
{
  "title": "string (catchy trip title, e.g. 'Hidden Gems of Kyoto')",
  "destination": "string (main destination city/region)",
  "totalDays": number,
  "coverImageQuery": "string (descriptive search query for a cover photo, e.g. 'Kyoto bamboo forest Japan')",
  "days": [
    {
      "day": number,
      "label": "string (e.g. 'Arrival & Old Town')",
      "activities": [
        {
          "id": "string (unique, e.g. 'act-1')",
          "name": "string",
          "description": "string (2-3 sentences)",
          "locationName": "string (specific venue/place name)",
          "coordinates": { "lat": number, "lng": number },
          "duration": "string (e.g. '2 hours')",
          "type": "food" | "activity" | "accommodation" | "transport",
          "estimatedCost": "string (e.g. '$15-20 per person')",
          "tips": "string (one practical tip)"
        }
      ]
    }
  ],
  "totalEstimatedCost": "string (e.g. '$800-1200 per person')",
  "bestTimeToVisit": "string",
  "tips": ["string", "string", "string"]
}

Include 3-5 activities per day. Mix food, sightseeing, and experiences. Be specific with real place names.`

    const raw = await callClaude(prompt, system)
    const itinerary = parseItinerary(raw) as {
      title: string
      destination: string
      totalDays: number
      days: unknown[]
    }

    // Save to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const share_slug = generateSlug(itinerary.destination ?? region ?? 'trip', itinerary.totalDays ?? days)

    const tripData = {
      source_url,
      platform,
      title: itinerary.title,
      locations,
      itinerary,
      share_slug,
      extraction_method,
      is_pro,
      device_id,
    }

    const { data: savedTrip, error: saveError } = await supabase
      .from('trips')
      .insert(tripData)
      .select()
      .single()

    if (saveError) {
      throw new Error(`Failed to save trip: ${saveError.message}`)
    }

    return new Response(
      JSON.stringify({ slug: share_slug, trip: savedTrip }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('generate-itinerary error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
