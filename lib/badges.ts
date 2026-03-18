import { supabase } from './supabase';
import { Badge, BadgeTier, UserBadge } from '../types';

// ─── Tier colours ──────────────────────────────────────────────────────────────

export const TIER_COLORS: Record<BadgeTier, string> = {
  bronze:   '#CD7F32',
  silver:   '#A8A9AD',
  gold:     '#FFD700',
  platinum: '#E5E4E2',
};

export const TIER_GLOW: Record<BadgeTier, string> = {
  bronze:   'rgba(205,127,50,0.35)',
  silver:   'rgba(168,169,173,0.35)',
  gold:     'rgba(255,215,0,0.35)',
  platinum: 'rgba(229,228,226,0.35)',
};

// ─── Country → badge slug ──────────────────────────────────────────────────────

const COUNTRY_SLUG_MAP: Record<string, string> = {
  japan: 'japan_stamp', france: 'france_stamp', italy: 'italy_stamp',
  usa: 'usa_stamp', 'united states': 'usa_stamp', 'united states of america': 'usa_stamp',
  thailand: 'thailand_stamp', bali: 'indonesia_stamp', indonesia: 'indonesia_stamp',
  greece: 'greece_stamp', spain: 'spain_stamp', mexico: 'mexico_stamp',
  portugal: 'portugal_stamp', morocco: 'morocco_stamp', turkey: 'turkey_stamp',
  australia: 'australia_stamp', vietnam: 'vietnam_stamp', india: 'india_stamp',
  'united kingdom': 'uk_stamp', england: 'uk_stamp', uk: 'uk_stamp',
  scotland: 'uk_stamp', wales: 'uk_stamp',
  germany: 'germany_stamp', netherlands: 'netherlands_stamp', holland: 'netherlands_stamp',
  switzerland: 'switzerland_stamp', norway: 'norway_stamp', iceland: 'iceland_stamp',
  brazil: 'brazil_stamp', argentina: 'argentina_stamp', peru: 'peru_stamp',
  colombia: 'colombia_stamp', 'south africa': 'south_africa_stamp',
  kenya: 'kenya_stamp', egypt: 'egypt_stamp',
  uae: 'uae_stamp', 'united arab emirates': 'uae_stamp', dubai: 'uae_stamp',
  'abu dhabi': 'uae_stamp', singapore: 'singapore_stamp',
};

// ─── Country → region slug ────────────────────────────────────────────────────

const REGION_KEYWORDS: Record<string, string[]> = {
  africa_explorer:      ['egypt', 'kenya', 'south africa', 'morocco', 'tanzania', 'ghana', 'nigeria', 'ethiopia', 'senegal', 'zimbabwe', 'botswana', 'namibia', 'rwanda'],
  asia_explorer:        ['japan', 'thailand', 'bali', 'indonesia', 'vietnam', 'india', 'singapore', 'china', 'south korea', 'philippines', 'malaysia', 'hong kong', 'cambodia', 'myanmar', 'nepal', 'laos', 'sri lanka', 'taiwan', 'bangladesh', 'kyoto', 'tokyo', 'bangkok', 'hanoi', 'bali'],
  europe_explorer:      ['france', 'italy', 'spain', 'greece', 'portugal', 'united kingdom', 'england', 'uk', 'germany', 'netherlands', 'switzerland', 'norway', 'iceland', 'sweden', 'denmark', 'austria', 'croatia', 'czech', 'hungary', 'poland', 'ireland', 'scotland', 'paris', 'rome', 'barcelona', 'amsterdam', 'berlin', 'vienna', 'prague', 'lisbon', 'athens', 'santorini', 'amalfi'],
  americas_explorer:    ['usa', 'united states', 'mexico', 'brazil', 'argentina', 'peru', 'colombia', 'chile', 'costa rica', 'cuba', 'canada', 'new york', 'los angeles', 'miami', 'cancun', 'patagonia', 'machu picchu', 'rio de janeiro', 'buenos aires'],
  oceania_explorer:     ['australia', 'new zealand', 'fiji', 'bora bora', 'tahiti', 'vanuatu', 'papua new guinea', 'sydney', 'melbourne'],
  middle_east_explorer: ['uae', 'dubai', 'abu dhabi', 'saudi arabia', 'jordan', 'oman', 'bahrain', 'qatar', 'kuwait', 'israel', 'petra', 'riyadh', 'muscat'],
};

// ─── Travel style keywords ────────────────────────────────────────────────────

const STYLE_KEYWORDS: Record<string, string[]> = {
  beach_bum:        ['beach', 'island', 'bali', 'maldives', 'caribbean', 'hawaii', 'phuket', 'santorini', 'ibiza', 'coastline', 'surf', 'snorkel', 'dive', 'tropical', 'resort'],
  culture_vulture:  ['museum', 'temple', 'heritage', 'history', 'culture', 'art', 'ancient', 'ruins', 'cathedral', 'palace', 'historic', 'gallery', 'civilization', 'kyoto', 'rome', 'athens', 'marrakech', 'cultural'],
  foodie:           ['food', 'culinary', 'cuisine', 'ramen', 'pasta', 'street food', 'tasting', 'restaurant', 'market', 'gastronomy', 'eat', 'dining', 'bangkok', 'tokyo', 'naples', 'foodie'],
  adventure_seeker: ['adventure', 'hiking', 'trekking', 'safari', 'climbing', 'bungee', 'skydiving', 'rafting', 'mountain', 'patagonia', 'himalaya', 'outdoor', 'extreme', 'backpacking', 'wilderness', 'expedition'],
  luxury_traveler:  ['luxury', 'five-star', '5-star', 'resort', 'spa', 'private', 'premium', 'exclusive', 'yacht', 'villa', 'suite', 'high-end', 'first class', 'opulent'],
  budget_master:    ['budget', 'cheap', 'affordable', 'hostel', 'backpacker', 'low cost', 'free', 'frugal', 'economical', 'shoestring'],
  solo_wanderer:    ['solo', 'alone', 'independent', 'self-guided', 'solo travel', 'single traveler'],
};

// ─── Continent mapping (for world_tour secret badge) ─────────────────────────

const CONTINENT_KEYWORDS: Record<string, string[]> = {
  africa:     REGION_KEYWORDS.africa_explorer,
  asia:       REGION_KEYWORDS.asia_explorer,
  europe:     REGION_KEYWORDS.europe_explorer,
  americas:   REGION_KEYWORDS.americas_explorer,
  oceania:    REGION_KEYWORDS.oceania_explorer,
  middleeast: REGION_KEYWORDS.middle_east_explorer,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function destLower(destination?: string): string {
  return (destination ?? '').toLowerCase();
}

function detectCountrySlug(destination: string): string | null {
  const d = destLower(destination);
  for (const [keyword, slug] of Object.entries(COUNTRY_SLUG_MAP)) {
    if (d.includes(keyword)) return slug;
  }
  return null;
}

function detectRegionSlugs(destination: string): string[] {
  const d = destLower(destination);
  const regions: string[] = [];
  for (const [regionSlug, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some((kw) => d.includes(kw))) regions.push(regionSlug);
  }
  return regions;
}

function countStyleTrips(trips: { title?: string | null; itinerary?: any; mood_tags?: string[] | null }[], styleKey: string): number {
  const keywords = STYLE_KEYWORDS[styleKey] ?? [];
  return trips.filter((t) => {
    const text = `${t.title ?? ''} ${t.itinerary?.destination ?? ''} ${(t.mood_tags ?? []).join(' ')}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  }).length;
}

function detectContinents(trips: { title?: string | null; itinerary?: any }[]): Set<string> {
  const found = new Set<string>();
  for (const t of trips) {
    const d = `${t.title ?? ''} ${t.itinerary?.destination ?? ''}`.toLowerCase();
    for (const [continent, keywords] of Object.entries(CONTINENT_KEYWORDS)) {
      if (keywords.some((kw) => d.includes(kw))) found.add(continent);
    }
  }
  return found;
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

export async function getUserBadgeSlugs(deviceId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_badges')
    .select('badge_slug')
    .eq('device_id', deviceId);
  return new Set((data ?? []).map((r: any) => r.badge_slug as string));
}

export async function getUserBadgesWithDetails(deviceId: string): Promise<(Badge & { earned_at: string })[]> {
  const { data } = await supabase
    .from('user_badges')
    .select('badge_slug, earned_at')
    .eq('device_id', deviceId);
  if (!data || data.length === 0) return [];

  const slugs = data.map((r: any) => r.badge_slug as string);
  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .in('slug', slugs);
  if (!badges) return [];

  const earnedMap: Record<string, string> = Object.fromEntries(
    data.map((r: any) => [r.badge_slug, r.earned_at]),
  );
  return (badges as Badge[]).map((b) => ({ ...b, earned_at: earnedMap[b.slug] ?? '' }));
}

export async function getAllBadges(): Promise<Badge[]> {
  const { data } = await supabase.from('badges').select('*').order('category').order('tier');
  return (data ?? []) as Badge[];
}

async function awardBadges(
  deviceId: string,
  userId: string | null | undefined,
  slugs: string[],
): Promise<void> {
  if (slugs.length === 0) return;
  const rows = slugs.map((slug) => ({
    device_id: deviceId,
    user_id: userId ?? null,
    badge_slug: slug,
  }));
  await supabase.from('user_badges').upsert(rows, { onConflict: 'device_id,badge_slug', ignoreDuplicates: true });
}

// ─── Main function ────────────────────────────────────────────────────────────

export interface BadgeCheckContext {
  trigger: 'trip_generated' | 'trip_shared' | 'app_launch' | 'booking_clicked';
  destination?: string;  // destination string from the just-generated trip
  userId?: string | null;
  bookingType?: 'hotel' | 'activity';
}

export async function checkAndAwardBadges(
  deviceId: string,
  context: BadgeCheckContext,
): Promise<Badge[]> {
  if (!deviceId) return [];

  try {
    // Fetch user's current earned slugs
    const earned = await getUserBadgeSlugs(deviceId);
    const newSlugs: string[] = [];

    // ── Fetch user's trips ──────────────────────────────────────────────────
    const { data: tripsData } = await supabase
      .from('trips')
      .select('id, title, itinerary, mood_tags, like_count, save_count, is_public, created_at')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false });

    const trips: any[] = tripsData ?? [];
    const tripCount = trips.length;

    function maybeAdd(slug: string) {
      if (!earned.has(slug) && !newSlugs.includes(slug)) newSlugs.push(slug);
    }

    // ─── Explorer tier badges ───────────────────────────────────────────────
    if (tripCount >= 1)  maybeAdd('first_step');
    if (tripCount >= 5)  maybeAdd('explorer_5');
    if (tripCount >= 10) maybeAdd('globetrotter_10');
    if (tripCount >= 25) maybeAdd('world_traveler_25');
    if (tripCount >= 50) maybeAdd('legend_50');

    // ─── Country + region badges (trip_generated trigger) ───────────────────
    if (context.trigger === 'trip_generated' && context.destination) {
      const countrySlug = detectCountrySlug(context.destination);
      if (countrySlug) maybeAdd(countrySlug);

      const regionSlugs = detectRegionSlugs(context.destination);
      regionSlugs.forEach(maybeAdd);
    }

    // Also backfill country/region badges from all historical trips on app_launch
    if (context.trigger === 'app_launch') {
      for (const trip of trips) {
        const dest = `${trip.title ?? ''} ${trip.itinerary?.destination ?? ''}`;
        const countrySlug = detectCountrySlug(dest);
        if (countrySlug) maybeAdd(countrySlug);
        detectRegionSlugs(dest).forEach(maybeAdd);
      }
    }

    // ─── Social badges ──────────────────────────────────────────────────────
    const publicTrips = trips.filter((t) => t.is_public);
    if (publicTrips.length >= 1) maybeAdd('first_share');

    const totalLikes = trips.reduce((acc: number, t: any) => acc + (t.like_count ?? 0), 0);
    if (totalLikes >= 100) maybeAdd('community_fave');

    const maxSaves = Math.max(0, ...trips.map((t: any) => t.save_count ?? 0));
    if (maxSaves >= 10) maybeAdd('trendsetter');
    if (maxSaves >= 50) maybeAdd('inspiring');

    // ─── Travel style badges ────────────────────────────────────────────────
    if (countStyleTrips(trips, 'beach_bum')        >= 3) maybeAdd('beach_bum');
    if (countStyleTrips(trips, 'culture_vulture')  >= 3) maybeAdd('culture_vulture');
    if (countStyleTrips(trips, 'foodie')           >= 3) maybeAdd('foodie');
    if (countStyleTrips(trips, 'adventure_seeker') >= 3) maybeAdd('adventure_seeker');
    if (countStyleTrips(trips, 'luxury_traveler')  >= 3) maybeAdd('luxury_traveler');
    if (countStyleTrips(trips, 'budget_master')    >= 3) maybeAdd('budget_master');
    if (countStyleTrips(trips, 'solo_wanderer')    >= 3) maybeAdd('solo_wanderer');

    // ─── Booking badges ─────────────────────────────────────────────────────
    if (context.trigger === 'booking_clicked') {
      maybeAdd('booked_it');

      // Count persisted booking clicks (stored in AsyncStorage by caller, passed via context)
      // For now, the caller bumps the count and passes it; we award at thresholds
      if (context.bookingType === 'hotel') {
        const { data: hotelClicks } = await supabase
          .from('booking_clicks')
          .select('id')
          .eq('device_id', deviceId)
          .eq('type', 'hotel');
        if ((hotelClicks?.length ?? 0) >= 5) maybeAdd('hotel_hunter');
      }
      if (context.bookingType === 'activity') {
        const { data: activityClicks } = await supabase
          .from('booking_clicks')
          .select('id')
          .eq('device_id', deviceId)
          .eq('type', 'activity');
        if ((activityClicks?.length ?? 0) >= 5) maybeAdd('activity_addict');
      }
    }

    // ─── Secret badges ──────────────────────────────────────────────────────

    // Night Owl: trip generated between midnight and 4am
    if (context.trigger === 'trip_generated') {
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 4) maybeAdd('night_owl');

      // Speed Planner: 3 trips generated today
      const today = new Date().toISOString().slice(0, 10);
      const todayTrips = trips.filter((t: any) => t.created_at?.startsWith(today));
      if (todayTrips.length >= 3) maybeAdd('speed_planner');
    }

    // World Tour: trips to 5 different continents
    const continents = detectContinents(trips);
    if (context.destination) {
      // Include the current trip's destination
      const d = destLower(context.destination);
      for (const [continent, keywords] of Object.entries(CONTINENT_KEYWORDS)) {
        if (keywords.some((kw) => d.includes(kw))) continents.add(continent);
      }
    }
    if (continents.size >= 5) maybeAdd('world_tour');

    // Collector: 20 badges earned (check after adding all the above)
    const totalAfterAward = earned.size + newSlugs.length;
    if (totalAfterAward >= 20) maybeAdd('collector');

    if (newSlugs.length === 0) return [];

    // ── Persist new badges ──────────────────────────────────────────────────
    await awardBadges(deviceId, context.userId, newSlugs);

    // ── Fetch full badge data for the newly earned ones ─────────────────────
    const { data: newBadgeData } = await supabase
      .from('badges')
      .select('*')
      .in('slug', newSlugs);

    return (newBadgeData ?? []) as Badge[];
  } catch (err) {
    console.warn('[badges] checkAndAwardBadges failed silently:', err);
    return [];
  }
}

// ─── ISO alpha-2 → badge slug mapping ────────────────────────────────────────
// Maps visited country ISO codes to their country stamp badge slugs

const ISO_TO_STAMP_SLUG: Record<string, string> = {
  JP: 'japan_stamp',   FR: 'france_stamp',  IT: 'italy_stamp',
  US: 'usa_stamp',     TH: 'thailand_stamp', ID: 'indonesia_stamp',
  GR: 'greece_stamp',  ES: 'spain_stamp',    MX: 'mexico_stamp',
  PT: 'portugal_stamp', MA: 'morocco_stamp', TR: 'turkey_stamp',
  AU: 'australia_stamp', VN: 'vietnam_stamp', IN: 'india_stamp',
  GB: 'uk_stamp',      DE: 'germany_stamp',  NL: 'netherlands_stamp',
  CH: 'switzerland_stamp', NO: 'norway_stamp', IS: 'iceland_stamp',
  BR: 'brazil_stamp',  AR: 'argentina_stamp', PE: 'peru_stamp',
  CO: 'colombia_stamp', ZA: 'south_africa_stamp',
  KE: 'kenya_stamp',   EG: 'egypt_stamp',
  AE: 'uae_stamp',     SG: 'singapore_stamp',
};

// ISO alpha-2 → explorer region badge slugs
// (a country can belong to multiple regions, e.g. Turkey is both Asia & Middle East)
const ISO_TO_REGION_SLUGS: Record<string, string[]> = {
  // Africa
  EG: ['africa_explorer'], KE: ['africa_explorer'], ZA: ['africa_explorer'],
  MA: ['africa_explorer'], TZ: ['africa_explorer'], GH: ['africa_explorer'],
  NG: ['africa_explorer'], ET: ['africa_explorer'], SN: ['africa_explorer'],
  ZW: ['africa_explorer'], BW: ['africa_explorer'], NA: ['africa_explorer'],
  RW: ['africa_explorer'], DZ: ['africa_explorer'], TN: ['africa_explorer'],
  LY: ['africa_explorer'], SD: ['africa_explorer'], SS: ['africa_explorer'],
  ML: ['africa_explorer'], CM: ['africa_explorer'], UG: ['africa_explorer'],
  MG: ['africa_explorer'], MZ: ['africa_explorer'], AO: ['africa_explorer'],
  ZM: ['africa_explorer'], CI: ['africa_explorer'],
  // Asia
  JP: ['asia_explorer'], TH: ['asia_explorer'], ID: ['asia_explorer'],
  VN: ['asia_explorer'], IN: ['asia_explorer'], SG: ['asia_explorer'],
  CN: ['asia_explorer'], KR: ['asia_explorer'], PH: ['asia_explorer'],
  MY: ['asia_explorer'], KH: ['asia_explorer'], MM: ['asia_explorer'],
  NP: ['asia_explorer'], LK: ['asia_explorer'], TW: ['asia_explorer'],
  BD: ['asia_explorer'], MN: ['asia_explorer'], BT: ['asia_explorer'],
  LA: ['asia_explorer'], MV: ['asia_explorer'],
  // Europe
  FR: ['europe_explorer'], IT: ['europe_explorer'], ES: ['europe_explorer'],
  GR: ['europe_explorer'], PT: ['europe_explorer'], GB: ['europe_explorer'],
  DE: ['europe_explorer'], NL: ['europe_explorer'], CH: ['europe_explorer'],
  NO: ['europe_explorer'], IS: ['europe_explorer'], SE: ['europe_explorer'],
  DK: ['europe_explorer'], AT: ['europe_explorer'], HR: ['europe_explorer'],
  CZ: ['europe_explorer'], HU: ['europe_explorer'], PL: ['europe_explorer'],
  IE: ['europe_explorer'], BE: ['europe_explorer'], FI: ['europe_explorer'],
  RU: ['europe_explorer'], UA: ['europe_explorer'], RO: ['europe_explorer'],
  BG: ['europe_explorer'], SK: ['europe_explorer'], SI: ['europe_explorer'],
  RS: ['europe_explorer'], BA: ['europe_explorer'], ME: ['europe_explorer'],
  AL: ['europe_explorer'], MK: ['europe_explorer'], EE: ['europe_explorer'],
  LV: ['europe_explorer'], LT: ['europe_explorer'], MT: ['europe_explorer'],
  // Americas
  US: ['americas_explorer'], MX: ['americas_explorer'], BR: ['americas_explorer'],
  AR: ['americas_explorer'], PE: ['americas_explorer'], CO: ['americas_explorer'],
  CL: ['americas_explorer'], CR: ['americas_explorer'], CU: ['americas_explorer'],
  CA: ['americas_explorer'], DO: ['americas_explorer'], JM: ['americas_explorer'],
  PA: ['americas_explorer'], GT: ['americas_explorer'], EC: ['americas_explorer'],
  BO: ['americas_explorer'], VE: ['americas_explorer'], UY: ['americas_explorer'],
  BS: ['americas_explorer'], BB: ['americas_explorer'], TT: ['americas_explorer'],
  // Oceania
  AU: ['oceania_explorer'], NZ: ['oceania_explorer'], FJ: ['oceania_explorer'],
  VU: ['oceania_explorer'], PG: ['oceania_explorer'], SB: ['oceania_explorer'],
  // Middle East
  AE: ['middle_east_explorer'], SA: ['middle_east_explorer'],
  JO: ['middle_east_explorer'], OM: ['middle_east_explorer'],
  BH: ['middle_east_explorer'], QA: ['middle_east_explorer'],
  KW: ['middle_east_explorer'], IL: ['middle_east_explorer'],
  LB: ['middle_east_explorer'], IQ: ['middle_east_explorer'],
  // Turkey bridges Asia + Middle East
  TR: ['asia_explorer', 'middle_east_explorer'],
};

// ISO alpha-2 → continent key for world_tour detection
const ISO_TO_CONTINENT_KEY: Record<string, string> = {
  // Africa
  EG: 'africa', KE: 'africa', ZA: 'africa', MA: 'africa', TZ: 'africa',
  GH: 'africa', NG: 'africa', ET: 'africa', SN: 'africa', ZW: 'africa',
  BW: 'africa', NA: 'africa', RW: 'africa', DZ: 'africa', TN: 'africa',
  LY: 'africa', SD: 'africa', SS: 'africa', ML: 'africa', CM: 'africa',
  UG: 'africa', MG: 'africa', MZ: 'africa', AO: 'africa', ZM: 'africa',
  CI: 'africa', CD: 'africa', CG: 'africa', BI: 'africa', DJ: 'africa',
  // Asia
  JP: 'asia', TH: 'asia', ID: 'asia', VN: 'asia', IN: 'asia', SG: 'asia',
  CN: 'asia', KR: 'asia', PH: 'asia', MY: 'asia', KH: 'asia', MM: 'asia',
  NP: 'asia', LK: 'asia', TW: 'asia', BD: 'asia', MN: 'asia', BT: 'asia',
  LA: 'asia', MV: 'asia', TR: 'asia', AZ: 'asia', AM: 'asia', GE: 'asia',
  KZ: 'asia', UZ: 'asia', TJ: 'asia', KG: 'asia', TM: 'asia',
  AF: 'asia', PK: 'asia', IR: 'asia', IQ: 'asia', SY: 'asia', YE: 'asia',
  // Europe
  FR: 'europe', IT: 'europe', ES: 'europe', GR: 'europe', PT: 'europe',
  GB: 'europe', DE: 'europe', NL: 'europe', CH: 'europe', NO: 'europe',
  IS: 'europe', SE: 'europe', DK: 'europe', AT: 'europe', HR: 'europe',
  CZ: 'europe', HU: 'europe', PL: 'europe', IE: 'europe', BE: 'europe',
  FI: 'europe', RU: 'europe', UA: 'europe', RO: 'europe', BG: 'europe',
  SK: 'europe', SI: 'europe', RS: 'europe', BA: 'europe', ME: 'europe',
  AL: 'europe', MK: 'europe', EE: 'europe', LV: 'europe', LT: 'europe',
  MT: 'europe', LU: 'europe', MC: 'europe', AD: 'europe', SM: 'europe',
  VA: 'europe', LI: 'europe', MD: 'europe', BY: 'europe', XK: 'europe',
  // Americas
  US: 'americas', MX: 'americas', BR: 'americas', AR: 'americas',
  PE: 'americas', CO: 'americas', CL: 'americas', CR: 'americas',
  CU: 'americas', CA: 'americas', DO: 'americas', JM: 'americas',
  PA: 'americas', GT: 'americas', EC: 'americas', BO: 'americas',
  VE: 'americas', UY: 'americas', BS: 'americas', BB: 'americas',
  TT: 'americas', GY: 'americas', SR: 'americas', PY: 'americas',
  NI: 'americas', HN: 'americas', SV: 'americas', BZ: 'americas',
  HT: 'americas', GD: 'americas', LC: 'americas', VC: 'americas',
  AG: 'americas', DM: 'americas', KN: 'americas',
  // Oceania
  AU: 'oceania', NZ: 'oceania', FJ: 'oceania', VU: 'oceania',
  PG: 'oceania', SB: 'oceania', TO: 'oceania', WS: 'oceania',
  KI: 'oceania', MH: 'oceania', FM: 'oceania', PW: 'oceania',
  NR: 'oceania', TV: 'oceania',
  // Middle East (treated as Asia for world_tour)
  AE: 'asia', SA: 'asia', JO: 'asia', OM: 'asia', BH: 'asia',
  QA: 'asia', KW: 'asia', IL: 'asia', LB: 'asia',
};

// ─── Map-based badge check ────────────────────────────────────────────────────

/**
 * Check and award badges based on the scratch map visited countries.
 * Call this after any country is marked visited (manually or via auto-populate).
 *
 * Returns array of newly earned Badge objects (empty if none new).
 */
export async function checkAndAwardBadgesFromMap(
  deviceId: string,
  visitedIsoCodes: string[],
  userId?: string | null,
): Promise<Badge[]> {
  if (!deviceId || visitedIsoCodes.length === 0) return [];

  try {
    const earned = await getUserBadgeSlugs(deviceId);
    const newSlugs: string[] = [];

    function maybeAdd(slug: string) {
      if (!earned.has(slug) && !newSlugs.includes(slug)) newSlugs.push(slug);
    }

    for (const iso of visitedIsoCodes) {
      // Country stamp badge
      const stampSlug = ISO_TO_STAMP_SLUG[iso];
      if (stampSlug) maybeAdd(stampSlug);

      // Regional explorer badges
      const regionSlugs = ISO_TO_REGION_SLUGS[iso] ?? [];
      regionSlugs.forEach(maybeAdd);
    }

    // World Tour secret badge: 5 distinct continents visited
    const continentSet = new Set<string>();
    for (const iso of visitedIsoCodes) {
      const continent = ISO_TO_CONTINENT_KEY[iso];
      if (continent) continentSet.add(continent);
    }
    if (continentSet.size >= 5) maybeAdd('world_tour');

    // Collector badge: ≥20 total badges after award
    const totalAfterAward = earned.size + newSlugs.length;
    if (totalAfterAward >= 20) maybeAdd('collector');

    if (newSlugs.length === 0) return [];

    await awardBadges(deviceId, userId ?? null, newSlugs);

    const { data: newBadgeData } = await supabase
      .from('badges')
      .select('*')
      .in('slug', newSlugs);

    return (newBadgeData ?? []) as Badge[];
  } catch (err) {
    console.warn('[badges] checkAndAwardBadgesFromMap failed silently:', err);
    return [];
  }
}

// ─── Display badge helpers ────────────────────────────────────────────────────

export async function getDisplayBadges(deviceId: string): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('display_badges')
    .eq('device_id', deviceId)
    .maybeSingle();
  return (data?.display_badges as string[]) ?? [];
}

export async function setDisplayBadges(deviceId: string, slugs: string[]): Promise<void> {
  await supabase
    .from('profiles')
    .update({ display_badges: slugs })
    .eq('device_id', deviceId);
}
