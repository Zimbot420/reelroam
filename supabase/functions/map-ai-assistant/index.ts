const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

interface NearbyPlace {
  name: string
  category: string
  lat: number
  lng: number
  rating?: number
  vicinity?: string
}

interface MapAIRequest {
  prompt: string
  lat: number
  lng: number
  location_name: string
  current_time: string
  nearby_places?: NearbyPlace[]
}

interface ItineraryStop {
  order: number
  place_name: string
  category: string
  emoji: string
  duration_minutes: number
  travel_time_from_previous_minutes: number
  estimated_cost: string
  tip: string
  coordinates: { lat: number; lng: number }
}

interface AIItinerary {
  summary: { total_time: string; total_cost: string; stops: number }
  itinerary: ItineraryStop[]
  tips: string[]
}

// ─── Call Claude ──────────────────────────────────────────────────────────────

async function callClaude(system: string, userMessage: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content[0].text
}

// ─── Reverse geocode (best-effort via Nominatim) ──────────────────────────────

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'ReelRoam/1.0' } },
    )
    const data = await res.json()
    const addr = data.address ?? {}
    const parts = [addr.suburb ?? addr.neighbourhood ?? addr.quarter, addr.city ?? addr.town ?? addr.village, addr.country].filter(Boolean)
    return parts.join(', ')
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

// ─── Parse JSON from Claude safely ───────────────────────────────────────────

function parseItinerary(raw: string): AIItinerary {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(cleaned)

  // Validate required shape
  if (!parsed.summary || !Array.isArray(parsed.itinerary)) {
    throw new Error('Invalid itinerary shape from AI')
  }

  return parsed as AIItinerary
}

// ─── Build system prompt ──────────────────────────────────────────────────────

function buildSystemPrompt(
  locationName: string,
  lat: number,
  lng: number,
  currentTime: string,
  nearbyPlaces?: NearbyPlace[],
): string {
  const date = new Date(currentTime)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const placesContext = nearbyPlaces && nearbyPlaces.length > 0
    ? `\n\nYou have been provided a list of REAL verified places from Google Maps near this location. You MUST select places exclusively from this list — do NOT invent, rename, or modify any place. Use the exact name and coordinates provided.\n\nNearby places:\n${nearbyPlaces
        .map((p, i) =>
          `${i + 1}. ${p.name} (${p.category})${p.rating != null ? ` ★${p.rating}` : ''}${p.vicinity ? ` — ${p.vicinity}` : ''} [lat: ${p.lat}, lng: ${p.lng}]`,
        )
        .join('\n')}`
    : '\n\nNo verified place list provided — use your knowledge of places near these coordinates, but be conservative and only suggest well-known places you are confident exist.'

  return `You are an expert local travel guide. The user is currently at: ${locationName}.
Today is ${dateStr}, current time is ${timeStr}.
GPS coordinates: ${lat}, ${lng}.${placesContext}

When responding to travel queries:
- Pick the best places for the user's request from the list above
- Include realistic time estimates including travel time
- Include realistic price estimates in USD
- Be conversational but concise

Return ONLY valid JSON — no markdown, no explanation. Use this exact structure:
{
  "summary": {
    "total_time": "string (e.g. '3 hours 30 min')",
    "total_cost": "string (e.g. '$25–$45 per person')",
    "stops": number
  },
  "itinerary": [
    {
      "order": number,
      "place_name": "string (exact name from the list)",
      "category": "string (e.g. 'restaurant', 'museum', 'cafe')",
      "emoji": "string (single relevant emoji)",
      "duration_minutes": number,
      "travel_time_from_previous_minutes": number (0 for first stop),
      "estimated_cost": "string (e.g. '$12–$20' or 'Free')",
      "tip": "string (short practical tip)",
      "coordinates": { "lat": number, "lng": number }
    }
  ],
  "tips": ["string", "..."] (2–4 general tips for this area)
}`
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  console.log('[map-ai-assistant] request:', req.method)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json() as MapAIRequest
    const { prompt, lat, lng, location_name, current_time, nearby_places } = body

    if (!prompt || lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt, lat, lng' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // Best-effort reverse geocode if location_name not provided
    const resolvedLocation = location_name && location_name.trim()
      ? location_name
      : await reverseGeocode(lat, lng)

    console.log('[map-ai-assistant] location:', resolvedLocation, 'prompt:', prompt.slice(0, 80))

    console.log('[map-ai-assistant] nearby_places count:', nearby_places?.length ?? 0)
    const system = buildSystemPrompt(resolvedLocation, lat, lng, current_time ?? new Date().toISOString(), nearby_places)
    const raw = await callClaude(system, prompt)
    const itinerary = parseItinerary(raw)

    console.log('[map-ai-assistant] success, stops:', itinerary.itinerary?.length)

    return new Response(JSON.stringify(itinerary), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[map-ai-assistant] error:', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
