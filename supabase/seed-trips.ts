/**
 * Seed script — generates 20 public trips for the discovery feed.
 * Run with: npx tsx supabase/seed-trips.ts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ─── Load .env ────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Destinations ─────────────────────────────────────────────────────────────

const DESTINATIONS = [
  { destination: 'Bali, Indonesia',          days: 7,  username: 'wanderlust_sofia',   emoji: '🌺' },
  { destination: 'Tokyo, Japan',             days: 10, username: 'travel_with_marco',   emoji: '🗼' },
  { destination: 'Paris, France',            days: 5,  username: 'bonjour_adventures',  emoji: '🥐' },
  { destination: 'New York, USA',            days: 4,  username: 'nyc_explorer',         emoji: '🗽' },
  { destination: 'Santorini, Greece',        days: 6,  username: 'aegean_dreams',        emoji: '🫐' },
  { destination: 'Marrakech, Morocco',       days: 5,  username: 'desert_rose_travels',  emoji: '🌙' },
  { destination: 'Amalfi Coast, Italy',      days: 7,  username: 'la_dolce_vita_trips',  emoji: '🍋' },
  { destination: 'Bangkok, Thailand',        days: 8,  username: 'thai_adventures',      emoji: '🛺' },
  { destination: 'Barcelona, Spain',         days: 5,  username: 'gaudi_explorer',       emoji: '🎨' },
  { destination: 'Cape Town, South Africa',  days: 7,  username: 'southern_tip_travels', emoji: '🦁' },
  { destination: 'Maldives',                 days: 6,  username: 'overwater_escapes',    emoji: '🐠' },
  { destination: 'Kyoto, Japan',             days: 5,  username: 'sakura_journeys',      emoji: '⛩️' },
  { destination: 'Lisbon, Portugal',         days: 4,  username: 'fado_and_pasteis',     emoji: '🎶' },
  { destination: 'Dubai, UAE',               days: 5,  username: 'desert_luxe_travel',   emoji: '🏙️' },
  { destination: 'Rio de Janeiro, Brazil',   days: 7,  username: 'carioca_adventures',   emoji: '🌴' },
  { destination: 'Iceland',                  days: 8,  username: 'northern_lights_jan',  emoji: '🌌' },
  { destination: 'Sydney, Australia',        days: 6,  username: 'g_day_adventures',     emoji: '🦘' },
  { destination: 'Amsterdam, Netherlands',   days: 4,  username: 'canal_hopper',         emoji: '🚲' },
  { destination: 'Mexico City, Mexico',      days: 5,  username: 'tacos_and_temples',    emoji: '🌮' },
  { destination: 'Kenya Safari',             days: 7,  username: 'safari_diaries_lena',  emoji: '🦒' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(destination: string, days: number): string {
  const base = destination
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 20);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${days}days-${suffix}`;
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Claude API ───────────────────────────────────────────────────────────────

async function generateItinerary(destination: string, days: number): Promise<object> {
  const system = `You are an expert travel itinerary planner. Generate detailed, realistic travel itineraries.
Always return ONLY valid JSON — no markdown, no explanation, no code blocks.
For coordinates: use precise lat/lng for every activity location. Never return null or 0,0.
Activity IDs must be unique strings like "act-1", "act-2", etc.`;

  const prompt = `Create a ${days}-day travel itinerary for ${destination}.

Return this exact JSON structure:
{
  "title": "string (catchy trip title, e.g. 'Hidden Gems of Kyoto')",
  "destination": "string (main destination city/region)",
  "totalDays": number,
  "coverImageQuery": "string (descriptive search query for a cover photo)",
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

Include 3-5 activities per day. Mix food, sightseeing, and experiences. Be specific with real place names and accurate coordinates.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { content: { text: string }[] };
  const raw = data.content[0].text;
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌍 Seeding ${DESTINATIONS.length} trips into Supabase...\n`);

  let successCount = 0;

  for (let i = 0; i < DESTINATIONS.length; i++) {
    const { destination, days, username, emoji } = DESTINATIONS[i];
    console.log(`[${i + 1}/${DESTINATIONS.length}] Generating: ${destination} (${days} days)...`);

    try {
      const itinerary = await generateItinerary(destination, days) as {
        title: string;
        destination: string;
        totalDays: number;
      };

      const share_slug = generateSlug(itinerary.destination ?? destination, days);

      const { error } = await supabase.from('trips').insert({
        source_url: 'https://scrollaway.app/seed',
        platform: 'seed',
        title: itinerary.title,
        locations: [{ name: destination }],
        itinerary,
        share_slug,
        extraction_method: 'seed',
        is_pro: false,
        is_public: true,
        device_id: 'seed-device-001',
        username,
        user_avatar_emoji: emoji,
        like_count: randBetween(12, 847),
        save_count: randBetween(3, 234),
      });

      if (error) {
        console.error(`  ❌ DB error: ${error.message}`);
      } else {
        console.log(`  ✅ Saved: "${itinerary.title}" (slug: ${share_slug})`);
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ Failed: ${err instanceof Error ? err.message : err}`);
    }

    // Pause between API calls to avoid rate limiting
    if (i < DESTINATIONS.length - 1) {
      await delay(1500);
    }
  }

  console.log(`\n✨ Done! ${successCount}/${DESTINATIONS.length} trips seeded successfully.\n`);

  // Verify
  const { data, error } = await supabase
    .from('trips')
    .select('id, title, username')
    .eq('is_public', true)
    .eq('platform', 'seed');

  if (!error && data) {
    console.log(`📊 Public seed trips in database: ${data.length}`);
    data.forEach((t) => console.log(`  - ${t.title} (by @${t.username})`));
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
