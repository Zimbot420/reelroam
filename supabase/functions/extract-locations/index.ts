import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ExtractRequest {
  url: string
  platform: 'tiktok' | 'instagram' | 'youtube'
  method: 'text' | 'vision'
  device_id: string
}

interface OEmbedData {
  title?: string
  description?: string
  author_name?: string
  thumbnail_url?: string
}

interface ExtractResult {
  locations: Array<{ name: string; type: string; country: string; confidence: number }>
  region: string
  suggestedDays: number
  needsVision: boolean
  extractionMethod: 'text' | 'vision'
}

// --- oEmbed fetching ---

async function fetchOEmbed(url: string, platform: string): Promise<OEmbedData> {
  let oembedUrl = ''

  if (platform === 'youtube') {
    oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  } else if (platform === 'tiktok') {
    oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
  } else if (platform === 'instagram') {
    // Instagram oEmbed requires a Facebook access token — returns limited data without one
    oembedUrl = `https://graph.facebook.com/instagram_oembed?url=${encodeURIComponent(url)}`
  }

  try {
    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'ReelRoam/1.0' },
    })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

// --- Claude API call ---

async function callClaude(
  messages: Array<{ role: string; content: unknown }>,
  system: string,
): Promise<string> {
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
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content[0].text
}

// --- Rate limit check ---

async function isRateLimited(device_id: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('trips')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', device_id)
    .gte('created_at', startOfMonth.toISOString())

  return (count ?? 0) >= 3
}

// --- Parse Claude JSON response safely ---

function parseLocations(raw: string): ExtractResult {
  // Strip any markdown code blocks if Claude adds them
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(cleaned)

  const locations = parsed.locations ?? []
  const highConfidence = locations.filter((l: { confidence: number }) => l.confidence >= 0.7)
  const needsVision = highConfidence.length < 2

  return {
    locations,
    region: parsed.region ?? '',
    suggestedDays: parsed.suggestedDays ?? 3,
    needsVision: parsed.needsVision ?? needsVision,
    extractionMethod: 'text',
  }
}

// --- Text extraction ---

async function extractWithText(url: string, platform: string): Promise<ExtractResult> {
  const oembed = await fetchOEmbed(url, platform)

  const textBlock = [
    oembed.title && `Title: ${oembed.title}`,
    oembed.author_name && `Creator: ${oembed.author_name}`,
    oembed.description && `Description: ${oembed.description}`,
    `Source URL: ${url}`,
  ]
    .filter(Boolean)
    .join('\n')

  if (!textBlock.trim()) {
    throw new Error('No metadata could be fetched from this URL')
  }

  const system = `You are a travel location extractor. Extract all named locations from the text provided.
Return ONLY valid JSON — no markdown, no explanation. Use this exact structure:
{
  "locations": [
    { "name": string, "type": "city|region|country|landmark|neighborhood", "country": string, "confidence": number }
  ],
  "region": string,
  "suggestedDays": number,
  "needsVision": boolean
}
Set needsVision to true if fewer than 2 locations have confidence above 0.7.
Confidence is 0.0–1.0. suggestedDays is how many days a trip to these places would take.`

  const raw = await callClaude(
    [{ role: 'user', content: textBlock }],
    system,
  )

  return parseLocations(raw)
}

// --- Vision extraction ---
// NOTE: True frame-by-frame video extraction is not feasible in a serverless function.
// This implementation uses available video thumbnails as visual context.
// For YouTube, multiple frame thumbnails are available. For TikTok/Instagram,
// only the cover thumbnail is used. A production implementation would use a
// dedicated video processing service (e.g. AWS Lambda + ffmpeg) for full frame extraction.

async function getVideoImages(url: string, platform: string): Promise<string[]> {
  const images: string[] = []

  if (platform === 'youtube') {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (match) {
      const id = match[1]
      // YouTube provides up to 4 frame thumbnails per video (0=cover, 1/2/3=frames)
      images.push(
        `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        `https://img.youtube.com/vi/${id}/1.jpg`,
        `https://img.youtube.com/vi/${id}/2.jpg`,
        `https://img.youtube.com/vi/${id}/3.jpg`,
      )
    }
  } else {
    const oembed = await fetchOEmbed(url, platform)
    if (oembed.thumbnail_url) images.push(oembed.thumbnail_url)
  }

  return images
}

async function extractWithVision(url: string, platform: string): Promise<ExtractResult> {
  const imageUrls = await getVideoImages(url, platform)

  if (imageUrls.length === 0) {
    // Fall back to text if no images available
    const result = await extractWithText(url, platform)
    return { ...result, extractionMethod: 'vision' }
  }

  const imageContent = imageUrls.map((imgUrl) => ({
    type: 'image',
    source: { type: 'url', url: imgUrl },
  }))

  const system = `You are a travel location extractor with vision capabilities.
Analyse the video thumbnails/frames provided and identify all visible locations, landmarks, signs, and geographic features.
Return ONLY valid JSON — no markdown, no explanation. Use this exact structure:
{
  "locations": [
    { "name": string, "type": "city|region|country|landmark|neighborhood", "country": string, "confidence": number }
  ],
  "region": string,
  "suggestedDays": number,
  "needsVision": false
}
Confidence is 0.0–1.0. suggestedDays is how many days a trip to these places would take.`

  const raw = await callClaude(
    [
      {
        role: 'user',
        content: [
          ...imageContent,
          { type: 'text', text: `Identify all travel locations visible in these video frames. Source URL: ${url}` },
        ],
      },
    ],
    system,
  )

  const result = parseLocations(raw)
  return { ...result, needsVision: false, extractionMethod: 'vision' }
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { url, platform, method, device_id }: ExtractRequest = await req.json()

    if (!url || !platform || !device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: url, platform, device_id' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // Rate limit check (free tier: 3 trips/month)
    if (method !== 'vision') {
      const limited = await isRateLimited(device_id)
      if (limited) {
        return new Response(
          JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }),
          { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        )
      }
    }

    const result =
      method === 'vision'
        ? await extractWithVision(url, platform)
        : await extractWithText(url, platform)

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('extract-locations error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
