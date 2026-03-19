const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

interface SuggestRequest {
  destination: string
  activityType: 'food' | 'activity' | 'accommodation' | 'transport'
  existingActivities: string[]   // names of activities already in this day
  dayLabel: string               // e.g. "Day 1 — Arrival in Tokyo"
}

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
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body: SuggestRequest = await req.json()
    const { destination, activityType, existingActivities, dayLabel } = body

    if (!destination) {
      return new Response(JSON.stringify({ error: 'destination is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const system = `You are a travel planning assistant. Suggest ONE specific activity for a traveler.
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "name": "Activity name",
  "description": "2-3 sentence description",
  "locationName": "Specific place or venue name",
  "duration": "e.g. 2 hours",
  "type": "${activityType}",
  "estimatedCost": "e.g. $25",
  "tips": "One helpful tip"
}`

    const existingList = existingActivities.length > 0
      ? `\nAlready planned: ${existingActivities.join(', ')}. Suggest something DIFFERENT.`
      : ''

    const prompt = `Suggest a specific ${activityType} activity in ${destination}.
Day context: ${dayLabel}${existingList}
Pick a real, well-known place that travelers would enjoy. Be specific with the venue/location name.`

    const result = await callClaude(prompt, system)

    // Parse the JSON from Claude's response
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response format')

    const activity = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(activity), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
