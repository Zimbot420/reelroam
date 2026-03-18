-- ─── Patch seeded trips with specific, iconic, Google-searchable location names ─
-- Run this in the Supabase SQL editor (Dashboard → SQL editor → New query)
-- Matches by username since each seeded trip has a unique creator.

UPDATE trips SET locations = '[
  {"name":"Tanah Lot Temple Bali","latitude":-8.6215,"longitude":115.0866},
  {"name":"Tegallalang Rice Terraces Ubud","latitude":-8.4312,"longitude":115.2812},
  {"name":"Uluwatu Temple Bali","latitude":-8.8291,"longitude":115.0849},
  {"name":"Sacred Monkey Forest Ubud","latitude":-8.5188,"longitude":115.2590},
  {"name":"Seminyak Beach Bali","latitude":-8.6912,"longitude":115.1583}
]'::jsonb WHERE username = 'wanderlust_sofia' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Shibuya Crossing Tokyo","latitude":35.6595,"longitude":139.7004},
  {"name":"Senso-ji Temple Asakusa Tokyo","latitude":35.7148,"longitude":139.7967},
  {"name":"Shinjuku Gyoen National Garden Tokyo","latitude":35.6852,"longitude":139.7100},
  {"name":"Meiji Shrine Tokyo","latitude":35.6763,"longitude":139.6993},
  {"name":"Tokyo Skytree","latitude":35.7101,"longitude":139.8107}
]'::jsonb WHERE username = 'travel_with_marco' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Eiffel Tower Paris","latitude":48.8584,"longitude":2.2945},
  {"name":"Louvre Museum Paris","latitude":48.8606,"longitude":2.3376},
  {"name":"Montmartre Paris","latitude":48.8867,"longitude":2.3431},
  {"name":"Notre-Dame Cathedral Paris","latitude":48.8530,"longitude":2.3499},
  {"name":"Palace of Versailles","latitude":48.8048,"longitude":2.1204}
]'::jsonb WHERE username = 'bonjour_adventures' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Times Square New York","latitude":40.7580,"longitude":-73.9855},
  {"name":"Central Park New York","latitude":40.7851,"longitude":-73.9683},
  {"name":"Brooklyn Bridge New York","latitude":40.7061,"longitude":-73.9969},
  {"name":"The Metropolitan Museum of Art New York","latitude":40.7794,"longitude":-73.9632},
  {"name":"High Line Park New York","latitude":40.7480,"longitude":-74.0048}
]'::jsonb WHERE username = 'nyc_explorer' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Oia Village Santorini","latitude":36.4618,"longitude":25.3753},
  {"name":"Fira Santorini","latitude":36.4170,"longitude":25.4315},
  {"name":"Red Beach Santorini","latitude":36.3493,"longitude":25.3962},
  {"name":"Amoudi Bay Santorini","latitude":36.4563,"longitude":25.3731},
  {"name":"Akrotiri Archaeological Site Santorini","latitude":36.3524,"longitude":25.4039}
]'::jsonb WHERE username = 'aegean_dreams' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Jardin Majorelle Marrakech","latitude":31.6415,"longitude":-8.0030},
  {"name":"Jemaa el-Fnaa Square Marrakech","latitude":31.6258,"longitude":-7.9892},
  {"name":"Bahia Palace Marrakech","latitude":31.6215,"longitude":-7.9831},
  {"name":"Koutoubia Mosque Marrakech","latitude":31.6242,"longitude":-7.9939},
  {"name":"Saadian Tombs Marrakech","latitude":31.6192,"longitude":-7.9856}
]'::jsonb WHERE username = 'desert_rose_travels' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Positano Amalfi Coast Italy","latitude":40.6280,"longitude":14.4849},
  {"name":"Ravello Villa Rufolo Italy","latitude":40.6485,"longitude":14.6138},
  {"name":"Amalfi Cathedral Italy","latitude":40.6340,"longitude":14.6027},
  {"name":"Path of the Gods Amalfi Coast Italy","latitude":40.6451,"longitude":14.5601},
  {"name":"Praiano Amalfi Coast Italy","latitude":40.6133,"longitude":14.5357}
]'::jsonb WHERE username = 'la_dolce_vita_trips' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Wat Phra Kaew Grand Palace Bangkok","latitude":13.7500,"longitude":100.4913},
  {"name":"Wat Arun Temple Bangkok","latitude":13.7437,"longitude":100.4888},
  {"name":"Chatuchak Weekend Market Bangkok","latitude":13.7999,"longitude":100.5500},
  {"name":"Wat Pho Temple Bangkok","latitude":13.7465,"longitude":100.4927},
  {"name":"Khao San Road Bangkok","latitude":13.7588,"longitude":100.4972}
]'::jsonb WHERE username = 'thai_adventures' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Sagrada Familia Barcelona","latitude":41.4036,"longitude":2.1744},
  {"name":"Park Guell Barcelona","latitude":41.4145,"longitude":2.1527},
  {"name":"Casa Batllo Barcelona","latitude":41.3916,"longitude":2.1649},
  {"name":"Gothic Quarter Barcelona","latitude":41.3833,"longitude":2.1762},
  {"name":"Barceloneta Beach Barcelona","latitude":41.3809,"longitude":2.1893}
]'::jsonb WHERE username = 'gaudi_explorer' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Table Mountain Cape Town","latitude":-33.9628,"longitude":18.4098},
  {"name":"Cape of Good Hope South Africa","latitude":-34.3568,"longitude":18.4737},
  {"name":"Boulders Beach Penguin Colony Cape Town","latitude":-34.1975,"longitude":18.4521},
  {"name":"V&A Waterfront Cape Town","latitude":-33.9020,"longitude":18.4190},
  {"name":"Chapman Peak Drive Cape Town","latitude":-34.1024,"longitude":18.3723}
]'::jsonb WHERE username = 'southern_tip_travels' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Vaadhoo Island Bioluminescent Beach Maldives","latitude":3.3996,"longitude":73.3714},
  {"name":"Baa Atoll UNESCO Biosphere Maldives","latitude":5.1190,"longitude":72.9630},
  {"name":"Maafushi Island Maldives","latitude":3.9416,"longitude":73.4823},
  {"name":"Banana Reef North Male Atoll Maldives","latitude":4.1755,"longitude":73.5129},
  {"name":"Male Fish Market Maldives","latitude":4.1755,"longitude":73.5096}
]'::jsonb WHERE username = 'overwater_escapes' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Fushimi Inari Shrine Kyoto","latitude":34.9671,"longitude":135.7727},
  {"name":"Arashiyama Bamboo Grove Kyoto","latitude":35.0094,"longitude":135.6720},
  {"name":"Kinkaku-ji Golden Pavilion Kyoto","latitude":35.0394,"longitude":135.7292},
  {"name":"Gion District Kyoto","latitude":35.0037,"longitude":135.7762},
  {"name":"Philosopher Path Kyoto","latitude":35.0268,"longitude":135.7942}
]'::jsonb WHERE username = 'sakura_journeys' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Belem Tower Lisbon","latitude":38.6916,"longitude":-9.2160},
  {"name":"Pena Palace Sintra Portugal","latitude":38.7877,"longitude":-9.3906},
  {"name":"Alfama District Lisbon","latitude":38.7139,"longitude":-9.1334},
  {"name":"Jeronimos Monastery Lisbon","latitude":38.6979,"longitude":-9.2063},
  {"name":"Cabo da Roca Portugal","latitude":38.7800,"longitude":-9.5000}
]'::jsonb WHERE username = 'fado_and_pasteis' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Burj Khalifa Dubai","latitude":25.1972,"longitude":55.2744},
  {"name":"Palm Jumeirah Dubai","latitude":25.1124,"longitude":55.1390},
  {"name":"Dubai Frame","latitude":25.2358,"longitude":55.3007},
  {"name":"Dubai Creek Dubai","latitude":25.2637,"longitude":55.3008},
  {"name":"Liwa Desert Dunes Abu Dhabi","latitude":23.1167,"longitude":53.5833}
]'::jsonb WHERE username = 'desert_luxe_travel' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Christ the Redeemer Rio de Janeiro","latitude":-22.9519,"longitude":-43.2105},
  {"name":"Copacabana Beach Rio de Janeiro","latitude":-22.9711,"longitude":-43.1823},
  {"name":"Sugarloaf Mountain Rio de Janeiro","latitude":-22.9489,"longitude":-43.1573},
  {"name":"Ipanema Beach Rio de Janeiro","latitude":-22.9868,"longitude":-43.2010},
  {"name":"Lapa Arches Rio de Janeiro","latitude":-22.9120,"longitude":-43.1793}
]'::jsonb WHERE username = 'carioca_adventures' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Jokulsarlon Glacier Lagoon Iceland","latitude":64.0784,"longitude":-16.2306},
  {"name":"Seljalandsfoss Waterfall Iceland","latitude":63.6156,"longitude":-19.9886},
  {"name":"Geysir Hot Spring Iceland","latitude":64.3104,"longitude":-20.3027},
  {"name":"Skogafoss Waterfall Iceland","latitude":63.5321,"longitude":-19.5130},
  {"name":"Blue Lagoon Grindavik Iceland","latitude":63.8800,"longitude":-22.4490}
]'::jsonb WHERE username = 'northern_lights_jan' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Sydney Opera House","latitude":-33.8568,"longitude":151.2153},
  {"name":"Sydney Harbour Bridge","latitude":-33.8523,"longitude":151.2108},
  {"name":"Bondi Beach Sydney","latitude":-33.8915,"longitude":151.2767},
  {"name":"Blue Mountains National Park New South Wales","latitude":-33.6500,"longitude":150.3000},
  {"name":"The Rocks Historic District Sydney","latitude":-33.8599,"longitude":151.2090}
]'::jsonb WHERE username = 'g_day_adventures' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Anne Frank House Amsterdam","latitude":52.3752,"longitude":4.8840},
  {"name":"Van Gogh Museum Amsterdam","latitude":52.3584,"longitude":4.8811},
  {"name":"Rijksmuseum Amsterdam","latitude":52.3600,"longitude":4.8852},
  {"name":"Keukenhof Gardens Netherlands","latitude":52.2697,"longitude":4.5464},
  {"name":"Jordaan District Amsterdam","latitude":52.3746,"longitude":4.8796}
]'::jsonb WHERE username = 'canal_hopper' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Teotihuacan Pyramids Mexico","latitude":19.6925,"longitude":-98.8438},
  {"name":"Frida Kahlo Museum Mexico City","latitude":19.3553,"longitude":-99.1623},
  {"name":"Zocalo Plaza Mexico City","latitude":19.4326,"longitude":-99.1332},
  {"name":"Xochimilco Floating Gardens Mexico City","latitude":19.2573,"longitude":-99.0995},
  {"name":"Palacio de Bellas Artes Mexico City","latitude":19.4352,"longitude":-99.1413}
]'::jsonb WHERE username = 'tacos_and_temples' AND platform = 'seed';

UPDATE trips SET locations = '[
  {"name":"Masai Mara National Reserve Kenya","latitude":-1.5093,"longitude":35.1440},
  {"name":"Amboseli National Park Kenya","latitude":-2.6527,"longitude":37.2606},
  {"name":"Nairobi National Park Kenya","latitude":-1.3590,"longitude":36.8508},
  {"name":"Lake Nakuru National Park Kenya","latitude":-0.3641,"longitude":36.0800},
  {"name":"Ol Pejeta Conservancy Kenya","latitude":0.0160,"longitude":37.2400}
]'::jsonb WHERE username = 'safari_diaries_lena' AND platform = 'seed';

-- Verify all 20 were updated
SELECT username, jsonb_array_length(locations) AS loc_count,
       locations->0->>'name' AS first_location
FROM trips
WHERE platform = 'seed'
ORDER BY username;
