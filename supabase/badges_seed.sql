-- ─── Badge seed — run after add_badges.sql migration ─────────────────────────
-- Safe to re-run: ON CONFLICT DO NOTHING

INSERT INTO badges (slug, name, description, icon, category, tier, is_secret) VALUES

-- ─── Regional explorer badges ─────────────────────────────────────────────────
('africa_explorer',      'Africa Explorer',       'Generated a trip to Africa',          '🌍', 'country', 'bronze', false),
('asia_explorer',        'Asia Explorer',         'Generated a trip to Asia',            '🏯', 'country', 'bronze', false),
('europe_explorer',      'Europe Explorer',       'Generated a trip to Europe',          '🏰', 'country', 'bronze', false),
('americas_explorer',    'Americas Explorer',     'Generated a trip to the Americas',    '🗽', 'country', 'bronze', false),
('oceania_explorer',     'Oceania Explorer',      'Generated a trip to Oceania',         '🦘', 'country', 'bronze', false),
('middle_east_explorer', 'Middle East Explorer',  'Generated a trip to the Middle East', '🕌', 'country', 'bronze', false),

-- ─── Country stamp badges ─────────────────────────────────────────────────────
('japan_stamp',        'Japan Stamp',        'Generated a trip to Japan',        '🇯🇵', 'country', 'bronze', false),
('france_stamp',       'France Stamp',       'Generated a trip to France',       '🇫🇷', 'country', 'bronze', false),
('italy_stamp',        'Italy Stamp',        'Generated a trip to Italy',        '🇮🇹', 'country', 'bronze', false),
('usa_stamp',          'USA Stamp',          'Generated a trip to USA',          '🇺🇸', 'country', 'bronze', false),
('thailand_stamp',     'Thailand Stamp',     'Generated a trip to Thailand',     '🇹🇭', 'country', 'bronze', false),
('indonesia_stamp',    'Indonesia Stamp',    'Generated a trip to Indonesia',    '🇮🇩', 'country', 'bronze', false),
('greece_stamp',       'Greece Stamp',       'Generated a trip to Greece',       '🇬🇷', 'country', 'bronze', false),
('spain_stamp',        'Spain Stamp',        'Generated a trip to Spain',        '🇪🇸', 'country', 'bronze', false),
('mexico_stamp',       'Mexico Stamp',       'Generated a trip to Mexico',       '🇲🇽', 'country', 'bronze', false),
('portugal_stamp',     'Portugal Stamp',     'Generated a trip to Portugal',     '🇵🇹', 'country', 'bronze', false),
('morocco_stamp',      'Morocco Stamp',      'Generated a trip to Morocco',      '🇲🇦', 'country', 'bronze', false),
('turkey_stamp',       'Turkey Stamp',       'Generated a trip to Turkey',       '🇹🇷', 'country', 'bronze', false),
('australia_stamp',    'Australia Stamp',    'Generated a trip to Australia',    '🇦🇺', 'country', 'bronze', false),
('vietnam_stamp',      'Vietnam Stamp',      'Generated a trip to Vietnam',      '🇻🇳', 'country', 'bronze', false),
('india_stamp',        'India Stamp',        'Generated a trip to India',        '🇮🇳', 'country', 'bronze', false),
('uk_stamp',           'UK Stamp',           'Generated a trip to UK',           '🇬🇧', 'country', 'bronze', false),
('germany_stamp',      'Germany Stamp',      'Generated a trip to Germany',      '🇩🇪', 'country', 'bronze', false),
('netherlands_stamp',  'Netherlands Stamp',  'Generated a trip to Netherlands',  '🇳🇱', 'country', 'bronze', false),
('switzerland_stamp',  'Switzerland Stamp',  'Generated a trip to Switzerland',  '🇨🇭', 'country', 'bronze', false),
('norway_stamp',       'Norway Stamp',       'Generated a trip to Norway',       '🇳🇴', 'country', 'bronze', false),
('iceland_stamp',      'Iceland Stamp',      'Generated a trip to Iceland',      '🇮🇸', 'country', 'bronze', false),
('brazil_stamp',       'Brazil Stamp',       'Generated a trip to Brazil',       '🇧🇷', 'country', 'bronze', false),
('argentina_stamp',    'Argentina Stamp',    'Generated a trip to Argentina',    '🇦🇷', 'country', 'bronze', false),
('peru_stamp',         'Peru Stamp',         'Generated a trip to Peru',         '🇵🇪', 'country', 'bronze', false),
('colombia_stamp',     'Colombia Stamp',     'Generated a trip to Colombia',     '🇨🇴', 'country', 'bronze', false),
('south_africa_stamp', 'South Africa Stamp', 'Generated a trip to South Africa', '🇿🇦', 'country', 'bronze', false),
('kenya_stamp',        'Kenya Stamp',        'Generated a trip to Kenya',        '🇰🇪', 'country', 'bronze', false),
('egypt_stamp',        'Egypt Stamp',        'Generated a trip to Egypt',        '🇪🇬', 'country', 'bronze', false),
('uae_stamp',          'UAE Stamp',          'Generated a trip to UAE',          '🇦🇪', 'country', 'bronze', false),
('singapore_stamp',    'Singapore Stamp',    'Generated a trip to Singapore',    '🇸🇬', 'country', 'bronze', false),

-- ─── Explorer tier badges ─────────────────────────────────────────────────────
('first_step',        'First Step',      'Generated your first trip',   '👣', 'explorer', 'bronze',   false),
('explorer_5',        'Explorer',        'Generated 5 trips',           '🧭', 'explorer', 'bronze',   false),
('globetrotter_10',   'Globetrotter',    'Generated 10 trips',          '✈️', 'explorer', 'silver',   false),
('world_traveler_25', 'World Traveler',  'Generated 25 trips',          '🌐', 'explorer', 'gold',     false),
('legend_50',         'Legend',          'Generated 50 trips',          '🏆', 'explorer', 'platinum', false),

-- ─── Social badges ────────────────────────────────────────────────────────────
('first_share',     'Going Public',    'Shared your first trip to the feed',      '📢', 'social', 'bronze',   false),
('trendsetter',     'Trendsetter',     'Had a trip saved 10 times by others',     '🔥', 'social', 'silver',   false),
('viral',           'Viral',           'Had a trip viewed 500 times',             '⚡', 'social', 'gold',     false),
('inspiring',       'Inspiring',       'Had a trip saved 50 times by others',     '💫', 'social', 'gold',     false),
('community_fave',  'Community Fave',  'Received 100 likes across all trips',     '❤️', 'social', 'platinum', false),

-- ─── Travel style badges ──────────────────────────────────────────────────────
('beach_bum',        'Beach Bum',        'Generated 3 beach or island trips',  '🏖️', 'travel_style', 'bronze', false),
('culture_vulture',  'Culture Vulture',  'Generated 3 culture or history trips','🏛️', 'travel_style', 'bronze', false),
('foodie',           'Foodie',           'Generated 3 food-focused trips',     '🍜', 'travel_style', 'bronze', false),
('adventure_seeker', 'Adventure Seeker', 'Generated 3 adventure trips',        '🧗', 'travel_style', 'silver', false),
('luxury_traveler',  'Luxury Traveler',  'Generated 3 luxury trips',           '💎', 'travel_style', 'gold',   false),
('budget_master',    'Budget Master',    'Generated 3 budget-friendly trips',  '🎯', 'travel_style', 'bronze', false),
('solo_wanderer',    'Solo Wanderer',    'Generated 3 solo trips',             '🚶', 'travel_style', 'silver', false),

-- ─── Booking badges ───────────────────────────────────────────────────────────
('booked_it',        'Booked It!',       'Clicked your first booking link',    '🎫', 'booking', 'bronze', false),
('hotel_hunter',     'Hotel Hunter',     'Clicked 5 hotel booking links',      '🏨', 'booking', 'silver', false),
('activity_addict',  'Activity Addict',  'Booked 5 activities via the app',    '🎯', 'booking', 'silver', false),

-- ─── Secret badges ────────────────────────────────────────────────────────────
('night_owl',      'Night Owl',     'Generated a trip between midnight and 4am',           '🦉', 'secret', 'silver',   true),
('speed_planner',  'Speed Planner', 'Generated 3 trips in one day',                        '⚡', 'secret', 'silver',   true),
('world_tour',     'World Tour',    'Generated trips to 5 different continents',            '🌏', 'secret', 'platinum', true),
('collector',      'Collector',     'Earned 20 badges',                                    '🎖️', 'secret', 'gold',     true)

ON CONFLICT (slug) DO NOTHING;
