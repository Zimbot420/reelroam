// ─── Country Utilities ─────────────────────────────────────────────────────────
// ISO 3166-1 alpha-2 → name, flag emoji, continent

export const TOTAL_COUNTRIES = 195;

export type Continent =
  | 'Africa'
  | 'Antarctica'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'Oceania'
  | 'South America';

export interface CountryInfo {
  name: string;
  flag: string;
  continent: Continent;
}

export const COUNTRY_DATA: Record<string, CountryInfo> = {
  // ── Africa ──────────────────────────────────────────────────────────────────
  DZ: { name: 'Algeria', flag: '🇩🇿', continent: 'Africa' },
  AO: { name: 'Angola', flag: '🇦🇴', continent: 'Africa' },
  BJ: { name: 'Benin', flag: '🇧🇯', continent: 'Africa' },
  BW: { name: 'Botswana', flag: '🇧🇼', continent: 'Africa' },
  BF: { name: 'Burkina Faso', flag: '🇧🇫', continent: 'Africa' },
  BI: { name: 'Burundi', flag: '🇧🇮', continent: 'Africa' },
  CM: { name: 'Cameroon', flag: '🇨🇲', continent: 'Africa' },
  CV: { name: 'Cape Verde', flag: '🇨🇻', continent: 'Africa' },
  CF: { name: 'Central African Republic', flag: '🇨🇫', continent: 'Africa' },
  TD: { name: 'Chad', flag: '🇹🇩', continent: 'Africa' },
  KM: { name: 'Comoros', flag: '🇰🇲', continent: 'Africa' },
  CG: { name: 'Congo', flag: '🇨🇬', continent: 'Africa' },
  CD: { name: 'DR Congo', flag: '🇨🇩', continent: 'Africa' },
  DJ: { name: 'Djibouti', flag: '🇩🇯', continent: 'Africa' },
  EG: { name: 'Egypt', flag: '🇪🇬', continent: 'Africa' },
  GQ: { name: 'Equatorial Guinea', flag: '🇬🇶', continent: 'Africa' },
  ER: { name: 'Eritrea', flag: '🇪🇷', continent: 'Africa' },
  SZ: { name: 'Eswatini', flag: '🇸🇿', continent: 'Africa' },
  ET: { name: 'Ethiopia', flag: '🇪🇹', continent: 'Africa' },
  GA: { name: 'Gabon', flag: '🇬🇦', continent: 'Africa' },
  GM: { name: 'Gambia', flag: '🇬🇲', continent: 'Africa' },
  GH: { name: 'Ghana', flag: '🇬🇭', continent: 'Africa' },
  GN: { name: 'Guinea', flag: '🇬🇳', continent: 'Africa' },
  GW: { name: 'Guinea-Bissau', flag: '🇬🇼', continent: 'Africa' },
  CI: { name: "Côte d'Ivoire", flag: '🇨🇮', continent: 'Africa' },
  KE: { name: 'Kenya', flag: '🇰🇪', continent: 'Africa' },
  LS: { name: 'Lesotho', flag: '🇱🇸', continent: 'Africa' },
  LR: { name: 'Liberia', flag: '🇱🇷', continent: 'Africa' },
  LY: { name: 'Libya', flag: '🇱🇾', continent: 'Africa' },
  MG: { name: 'Madagascar', flag: '🇲🇬', continent: 'Africa' },
  MW: { name: 'Malawi', flag: '🇲🇼', continent: 'Africa' },
  ML: { name: 'Mali', flag: '🇲🇱', continent: 'Africa' },
  MR: { name: 'Mauritania', flag: '🇲🇷', continent: 'Africa' },
  MU: { name: 'Mauritius', flag: '🇲🇺', continent: 'Africa' },
  MA: { name: 'Morocco', flag: '🇲🇦', continent: 'Africa' },
  MZ: { name: 'Mozambique', flag: '🇲🇿', continent: 'Africa' },
  NA: { name: 'Namibia', flag: '🇳🇦', continent: 'Africa' },
  NE: { name: 'Niger', flag: '🇳🇪', continent: 'Africa' },
  NG: { name: 'Nigeria', flag: '🇳🇬', continent: 'Africa' },
  RW: { name: 'Rwanda', flag: '🇷🇼', continent: 'Africa' },
  ST: { name: 'São Tomé and Príncipe', flag: '🇸🇹', continent: 'Africa' },
  SN: { name: 'Senegal', flag: '🇸🇳', continent: 'Africa' },
  SC: { name: 'Seychelles', flag: '🇸🇨', continent: 'Africa' },
  SL: { name: 'Sierra Leone', flag: '🇸🇱', continent: 'Africa' },
  SO: { name: 'Somalia', flag: '🇸🇴', continent: 'Africa' },
  ZA: { name: 'South Africa', flag: '🇿🇦', continent: 'Africa' },
  SS: { name: 'South Sudan', flag: '🇸🇸', continent: 'Africa' },
  SD: { name: 'Sudan', flag: '🇸🇩', continent: 'Africa' },
  TZ: { name: 'Tanzania', flag: '🇹🇿', continent: 'Africa' },
  TG: { name: 'Togo', flag: '🇹🇬', continent: 'Africa' },
  TN: { name: 'Tunisia', flag: '🇹🇳', continent: 'Africa' },
  UG: { name: 'Uganda', flag: '🇺🇬', continent: 'Africa' },
  ZM: { name: 'Zambia', flag: '🇿🇲', continent: 'Africa' },
  ZW: { name: 'Zimbabwe', flag: '🇿🇼', continent: 'Africa' },

  // ── Asia ────────────────────────────────────────────────────────────────────
  AF: { name: 'Afghanistan', flag: '🇦🇫', continent: 'Asia' },
  AM: { name: 'Armenia', flag: '🇦🇲', continent: 'Asia' },
  AZ: { name: 'Azerbaijan', flag: '🇦🇿', continent: 'Asia' },
  BH: { name: 'Bahrain', flag: '🇧🇭', continent: 'Asia' },
  BD: { name: 'Bangladesh', flag: '🇧🇩', continent: 'Asia' },
  BT: { name: 'Bhutan', flag: '🇧🇹', continent: 'Asia' },
  BN: { name: 'Brunei', flag: '🇧🇳', continent: 'Asia' },
  KH: { name: 'Cambodia', flag: '🇰🇭', continent: 'Asia' },
  CN: { name: 'China', flag: '🇨🇳', continent: 'Asia' },
  CY: { name: 'Cyprus', flag: '🇨🇾', continent: 'Asia' },
  GE: { name: 'Georgia', flag: '🇬🇪', continent: 'Asia' },
  IN: { name: 'India', flag: '🇮🇳', continent: 'Asia' },
  ID: { name: 'Indonesia', flag: '🇮🇩', continent: 'Asia' },
  IR: { name: 'Iran', flag: '🇮🇷', continent: 'Asia' },
  IQ: { name: 'Iraq', flag: '🇮🇶', continent: 'Asia' },
  IL: { name: 'Israel', flag: '🇮🇱', continent: 'Asia' },
  JP: { name: 'Japan', flag: '🇯🇵', continent: 'Asia' },
  JO: { name: 'Jordan', flag: '🇯🇴', continent: 'Asia' },
  KZ: { name: 'Kazakhstan', flag: '🇰🇿', continent: 'Asia' },
  KW: { name: 'Kuwait', flag: '🇰🇼', continent: 'Asia' },
  KG: { name: 'Kyrgyzstan', flag: '🇰🇬', continent: 'Asia' },
  LA: { name: 'Laos', flag: '🇱🇦', continent: 'Asia' },
  LB: { name: 'Lebanon', flag: '🇱🇧', continent: 'Asia' },
  MY: { name: 'Malaysia', flag: '🇲🇾', continent: 'Asia' },
  MV: { name: 'Maldives', flag: '🇲🇻', continent: 'Asia' },
  MN: { name: 'Mongolia', flag: '🇲🇳', continent: 'Asia' },
  MM: { name: 'Myanmar', flag: '🇲🇲', continent: 'Asia' },
  NP: { name: 'Nepal', flag: '🇳🇵', continent: 'Asia' },
  KP: { name: 'North Korea', flag: '🇰🇵', continent: 'Asia' },
  OM: { name: 'Oman', flag: '🇴🇲', continent: 'Asia' },
  PK: { name: 'Pakistan', flag: '🇵🇰', continent: 'Asia' },
  PS: { name: 'Palestine', flag: '🇵🇸', continent: 'Asia' },
  PH: { name: 'Philippines', flag: '🇵🇭', continent: 'Asia' },
  QA: { name: 'Qatar', flag: '🇶🇦', continent: 'Asia' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦', continent: 'Asia' },
  SG: { name: 'Singapore', flag: '🇸🇬', continent: 'Asia' },
  KR: { name: 'South Korea', flag: '🇰🇷', continent: 'Asia' },
  LK: { name: 'Sri Lanka', flag: '🇱🇰', continent: 'Asia' },
  SY: { name: 'Syria', flag: '🇸🇾', continent: 'Asia' },
  TW: { name: 'Taiwan', flag: '🇹🇼', continent: 'Asia' },
  TJ: { name: 'Tajikistan', flag: '🇹🇯', continent: 'Asia' },
  TH: { name: 'Thailand', flag: '🇹🇭', continent: 'Asia' },
  TL: { name: 'Timor-Leste', flag: '🇹🇱', continent: 'Asia' },
  TR: { name: 'Turkey', flag: '🇹🇷', continent: 'Asia' },
  TM: { name: 'Turkmenistan', flag: '🇹🇲', continent: 'Asia' },
  AE: { name: 'United Arab Emirates', flag: '🇦🇪', continent: 'Asia' },
  UZ: { name: 'Uzbekistan', flag: '🇺🇿', continent: 'Asia' },
  VN: { name: 'Vietnam', flag: '🇻🇳', continent: 'Asia' },
  YE: { name: 'Yemen', flag: '🇾🇪', continent: 'Asia' },

  // ── Europe ──────────────────────────────────────────────────────────────────
  AL: { name: 'Albania', flag: '🇦🇱', continent: 'Europe' },
  AD: { name: 'Andorra', flag: '🇦🇩', continent: 'Europe' },
  AT: { name: 'Austria', flag: '🇦🇹', continent: 'Europe' },
  BY: { name: 'Belarus', flag: '🇧🇾', continent: 'Europe' },
  BE: { name: 'Belgium', flag: '🇧🇪', continent: 'Europe' },
  BA: { name: 'Bosnia and Herzegovina', flag: '🇧🇦', continent: 'Europe' },
  BG: { name: 'Bulgaria', flag: '🇧🇬', continent: 'Europe' },
  HR: { name: 'Croatia', flag: '🇭🇷', continent: 'Europe' },
  CZ: { name: 'Czechia', flag: '🇨🇿', continent: 'Europe' },
  DK: { name: 'Denmark', flag: '🇩🇰', continent: 'Europe' },
  EE: { name: 'Estonia', flag: '🇪🇪', continent: 'Europe' },
  FI: { name: 'Finland', flag: '🇫🇮', continent: 'Europe' },
  FR: { name: 'France', flag: '🇫🇷', continent: 'Europe' },
  DE: { name: 'Germany', flag: '🇩🇪', continent: 'Europe' },
  GR: { name: 'Greece', flag: '🇬🇷', continent: 'Europe' },
  HU: { name: 'Hungary', flag: '🇭🇺', continent: 'Europe' },
  IS: { name: 'Iceland', flag: '🇮🇸', continent: 'Europe' },
  IE: { name: 'Ireland', flag: '🇮🇪', continent: 'Europe' },
  IT: { name: 'Italy', flag: '🇮🇹', continent: 'Europe' },
  XK: { name: 'Kosovo', flag: '🇽🇰', continent: 'Europe' },
  LV: { name: 'Latvia', flag: '🇱🇻', continent: 'Europe' },
  LI: { name: 'Liechtenstein', flag: '🇱🇮', continent: 'Europe' },
  LT: { name: 'Lithuania', flag: '🇱🇹', continent: 'Europe' },
  LU: { name: 'Luxembourg', flag: '🇱🇺', continent: 'Europe' },
  MT: { name: 'Malta', flag: '🇲🇹', continent: 'Europe' },
  MD: { name: 'Moldova', flag: '🇲🇩', continent: 'Europe' },
  MC: { name: 'Monaco', flag: '🇲🇨', continent: 'Europe' },
  ME: { name: 'Montenegro', flag: '🇲🇪', continent: 'Europe' },
  NL: { name: 'Netherlands', flag: '🇳🇱', continent: 'Europe' },
  MK: { name: 'North Macedonia', flag: '🇲🇰', continent: 'Europe' },
  NO: { name: 'Norway', flag: '🇳🇴', continent: 'Europe' },
  PL: { name: 'Poland', flag: '🇵🇱', continent: 'Europe' },
  PT: { name: 'Portugal', flag: '🇵🇹', continent: 'Europe' },
  RO: { name: 'Romania', flag: '🇷🇴', continent: 'Europe' },
  RU: { name: 'Russia', flag: '🇷🇺', continent: 'Europe' },
  SM: { name: 'San Marino', flag: '🇸🇲', continent: 'Europe' },
  RS: { name: 'Serbia', flag: '🇷🇸', continent: 'Europe' },
  SK: { name: 'Slovakia', flag: '🇸🇰', continent: 'Europe' },
  SI: { name: 'Slovenia', flag: '🇸🇮', continent: 'Europe' },
  ES: { name: 'Spain', flag: '🇪🇸', continent: 'Europe' },
  SE: { name: 'Sweden', flag: '🇸🇪', continent: 'Europe' },
  CH: { name: 'Switzerland', flag: '🇨🇭', continent: 'Europe' },
  UA: { name: 'Ukraine', flag: '🇺🇦', continent: 'Europe' },
  GB: { name: 'United Kingdom', flag: '🇬🇧', continent: 'Europe' },
  VA: { name: 'Vatican City', flag: '🇻🇦', continent: 'Europe' },

  // ── North America ────────────────────────────────────────────────────────────
  AG: { name: 'Antigua and Barbuda', flag: '🇦🇬', continent: 'North America' },
  BS: { name: 'Bahamas', flag: '🇧🇸', continent: 'North America' },
  BB: { name: 'Barbados', flag: '🇧🇧', continent: 'North America' },
  BZ: { name: 'Belize', flag: '🇧🇿', continent: 'North America' },
  CA: { name: 'Canada', flag: '🇨🇦', continent: 'North America' },
  CR: { name: 'Costa Rica', flag: '🇨🇷', continent: 'North America' },
  CU: { name: 'Cuba', flag: '🇨🇺', continent: 'North America' },
  DM: { name: 'Dominica', flag: '🇩🇲', continent: 'North America' },
  DO: { name: 'Dominican Republic', flag: '🇩🇴', continent: 'North America' },
  SV: { name: 'El Salvador', flag: '🇸🇻', continent: 'North America' },
  GD: { name: 'Grenada', flag: '🇬🇩', continent: 'North America' },
  GT: { name: 'Guatemala', flag: '🇬🇹', continent: 'North America' },
  HT: { name: 'Haiti', flag: '🇭🇹', continent: 'North America' },
  HN: { name: 'Honduras', flag: '🇭🇳', continent: 'North America' },
  JM: { name: 'Jamaica', flag: '🇯🇲', continent: 'North America' },
  MX: { name: 'Mexico', flag: '🇲🇽', continent: 'North America' },
  NI: { name: 'Nicaragua', flag: '🇳🇮', continent: 'North America' },
  PA: { name: 'Panama', flag: '🇵🇦', continent: 'North America' },
  KN: { name: 'Saint Kitts and Nevis', flag: '🇰🇳', continent: 'North America' },
  LC: { name: 'Saint Lucia', flag: '🇱🇨', continent: 'North America' },
  VC: { name: 'Saint Vincent and the Grenadines', flag: '🇻🇨', continent: 'North America' },
  TT: { name: 'Trinidad and Tobago', flag: '🇹🇹', continent: 'North America' },
  US: { name: 'United States', flag: '🇺🇸', continent: 'North America' },

  // ── South America ────────────────────────────────────────────────────────────
  AR: { name: 'Argentina', flag: '🇦🇷', continent: 'South America' },
  BO: { name: 'Bolivia', flag: '🇧🇴', continent: 'South America' },
  BR: { name: 'Brazil', flag: '🇧🇷', continent: 'South America' },
  CL: { name: 'Chile', flag: '🇨🇱', continent: 'South America' },
  CO: { name: 'Colombia', flag: '🇨🇴', continent: 'South America' },
  EC: { name: 'Ecuador', flag: '🇪🇨', continent: 'South America' },
  GY: { name: 'Guyana', flag: '🇬🇾', continent: 'South America' },
  PY: { name: 'Paraguay', flag: '🇵🇾', continent: 'South America' },
  PE: { name: 'Peru', flag: '🇵🇪', continent: 'South America' },
  SR: { name: 'Suriname', flag: '🇸🇷', continent: 'South America' },
  UY: { name: 'Uruguay', flag: '🇺🇾', continent: 'South America' },
  VE: { name: 'Venezuela', flag: '🇻🇪', continent: 'South America' },

  // ── Oceania ──────────────────────────────────────────────────────────────────
  AU: { name: 'Australia', flag: '🇦🇺', continent: 'Oceania' },
  FJ: { name: 'Fiji', flag: '🇫🇯', continent: 'Oceania' },
  KI: { name: 'Kiribati', flag: '🇰🇮', continent: 'Oceania' },
  MH: { name: 'Marshall Islands', flag: '🇲🇭', continent: 'Oceania' },
  FM: { name: 'Micronesia', flag: '🇫🇲', continent: 'Oceania' },
  NR: { name: 'Nauru', flag: '🇳🇷', continent: 'Oceania' },
  NZ: { name: 'New Zealand', flag: '🇳🇿', continent: 'Oceania' },
  PW: { name: 'Palau', flag: '🇵🇼', continent: 'Oceania' },
  PG: { name: 'Papua New Guinea', flag: '🇵🇬', continent: 'Oceania' },
  WS: { name: 'Samoa', flag: '🇼🇸', continent: 'Oceania' },
  SB: { name: 'Solomon Islands', flag: '🇸🇧', continent: 'Oceania' },
  TO: { name: 'Tonga', flag: '🇹🇴', continent: 'Oceania' },
  TV: { name: 'Tuvalu', flag: '🇹🇻', continent: 'Oceania' },
  VU: { name: 'Vanuatu', flag: '🇻🇺', continent: 'Oceania' },

  // ── Antarctica ───────────────────────────────────────────────────────────────
  AQ: { name: 'Antarctica', flag: '🇦🇶', continent: 'Antarctica' },
};

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getCountryName(isoCode: string): string {
  return COUNTRY_DATA[isoCode]?.name ?? isoCode;
}

export function getFlagEmoji(isoCode: string): string {
  return COUNTRY_DATA[isoCode]?.flag ?? '🌍';
}

export function getContinent(isoCode: string): Continent | null {
  return COUNTRY_DATA[isoCode]?.continent ?? null;
}

export function calculateWorldPercentage(visitedCodes: string[]): number {
  const validCodes = visitedCodes.filter((c) => COUNTRY_DATA[c] !== undefined);
  return Math.round((validCodes.length / TOTAL_COUNTRIES) * 100 * 10) / 10;
}

export function countContinents(visitedCodes: string[]): number {
  const continents = new Set<Continent>();
  for (const code of visitedCodes) {
    const c = getContinent(code);
    if (c && c !== 'Antarctica') continents.add(c);
  }
  return continents.size;
}

/** Pick a random country ISO code from those that appear on the map */
export function randomCountryCode(excludeCodes: string[] = []): string {
  const keys = Object.keys(COUNTRY_DATA).filter(
    (k) => !excludeCodes.includes(k) && COUNTRY_DATA[k].continent !== 'Antarctica',
  );
  return keys[Math.floor(Math.random() * keys.length)];
}

// ─── Name → ISO alpha-2 lookup ────────────────────────────────────────────────
// Comprehensive mapping: country names, common variants, city hints, regions

const NAME_TO_ISO: Record<string, string> = {
  // Direct ISO passthrough (already an ISO-2 code)
  // Africa
  algeria: 'DZ', angola: 'AO', benin: 'BJ', botswana: 'BW',
  'burkina faso': 'BF', burundi: 'BI', cameroon: 'CM', 'cape verde': 'CV',
  'central african republic': 'CF', chad: 'TD', comoros: 'KM',
  congo: 'CG', 'dr congo': 'CD', 'democratic republic of the congo': 'CD',
  'republic of congo': 'CG', djibouti: 'DJ', egypt: 'EG',
  'equatorial guinea': 'GQ', eritrea: 'ER', eswatini: 'SZ', swaziland: 'SZ',
  ethiopia: 'ET', gabon: 'GA', gambia: 'GM', ghana: 'GH', guinea: 'GN',
  'guinea-bissau': 'GW', "côte d'ivoire": 'CI', 'ivory coast': 'CI',
  kenya: 'KE', lesotho: 'LS', liberia: 'LR', libya: 'LY', madagascar: 'MG',
  malawi: 'MW', mali: 'ML', mauritania: 'MR', mauritius: 'MU',
  morocco: 'MA', mozambique: 'MZ', namibia: 'NA', niger: 'NE',
  nigeria: 'NG', rwanda: 'RW', 'são tomé and príncipe': 'ST',
  'sao tome': 'ST', senegal: 'SN', seychelles: 'SC', 'sierra leone': 'SL',
  somalia: 'SO', 'south africa': 'ZA', 'south sudan': 'SS', sudan: 'SD',
  tanzania: 'TZ', togo: 'TG', tunisia: 'TN', uganda: 'UG',
  zambia: 'ZM', zimbabwe: 'ZW',
  // African city hints
  cairo: 'EG', nairobi: 'KE', lagos: 'NG', accra: 'GH',
  marrakech: 'MA', marrakesh: 'MA', casablanca: 'MA', fez: 'MA', rabat: 'MA',
  dakar: 'SN', addis: 'ET', 'addis ababa': 'ET', kigali: 'RW',
  'cape town': 'ZA', johannesburg: 'ZA', durban: 'ZA',
  luxor: 'EG', aswan: 'EG', hurghada: 'EG',

  // Asia
  afghanistan: 'AF', armenia: 'AM', azerbaijan: 'AZ', bahrain: 'BH',
  bangladesh: 'BD', bhutan: 'BT', brunei: 'BN', cambodia: 'KH',
  china: 'CN', cyprus: 'CY', georgia: 'GE', india: 'IN', indonesia: 'ID',
  iran: 'IR', iraq: 'IQ', israel: 'IL', japan: 'JP', jordan: 'JO',
  kazakhstan: 'KZ', kuwait: 'KW', kyrgyzstan: 'KG', laos: 'LA',
  lebanon: 'LB', malaysia: 'MY', maldives: 'MV', mongolia: 'MN',
  myanmar: 'MM', burma: 'MM', nepal: 'NP', 'north korea': 'KP', oman: 'OM',
  pakistan: 'PK', palestine: 'PS', philippines: 'PH', qatar: 'QA',
  'saudi arabia': 'SA', singapore: 'SG', 'south korea': 'KR', korea: 'KR',
  'sri lanka': 'LK', ceylon: 'LK', syria: 'SY', taiwan: 'TW',
  tajikistan: 'TJ', thailand: 'TH', 'timor-leste': 'TL', 'east timor': 'TL',
  turkey: 'TR', turkiye: 'TR', turkmenistan: 'TM',
  'united arab emirates': 'AE', uae: 'AE', uzbekistan: 'UZ',
  vietnam: 'VN', viet: 'VN', yemen: 'YE',
  // Asian city/region hints
  tokyo: 'JP', kyoto: 'JP', osaka: 'JP', hiroshima: 'JP', hokkaido: 'JP',
  nara: 'JP', fuji: 'JP', okinawa: 'JP',
  beijing: 'CN', shanghai: 'CN', guangzhou: 'CN', shenzhen: 'CN',
  chengdu: 'CN', 'hong kong': 'CN', 'xi\'an': 'CN', guilin: 'CN',
  macau: 'CN', hainan: 'CN',
  bali: 'ID', jakarta: 'ID', lombok: 'ID', komodo: 'ID', java: 'ID',
  bangkok: 'TH', phuket: 'TH', 'chiang mai': 'TH', pattaya: 'TH',
  'koh samui': 'TH', 'ko phi phi': 'TH', krabi: 'TH', ayutthaya: 'TH',
  hanoi: 'VN', 'ho chi minh': 'VN', 'hoi an': 'VN', 'ha long': 'VN',
  'da nang': 'VN', 'nha trang': 'VN',
  'kuala lumpur': 'MY', penang: 'MY', langkawi: 'MY', borneo: 'MY',
  delhi: 'IN', mumbai: 'IN', bombay: 'IN', goa: 'IN', jaipur: 'IN',
  agra: 'IN', varanasi: 'IN', kerala: 'IN', kolkata: 'IN', bangalore: 'IN',
  kathmandu: 'NP', pokhara: 'NP', everest: 'NP',
  colombo: 'LK', 'kandy': 'LK',
  siem: 'KH', 'siem reap': 'KH', 'angkor wat': 'KH',
  dubai: 'AE', 'abu dhabi': 'AE', sharjah: 'AE',
  doha: 'QA', riyadh: 'SA', jeddah: 'SA', mecca: 'SA',
  muscat: 'OM', amman: 'JO', petra: 'JO', wadi: 'JO',
  tel: 'IL', 'tel aviv': 'IL', jerusalem: 'IL',
  seoul: 'KR', busan: 'KR', jeju: 'KR',
  'ulaanbaatar': 'MN', 'ulaan baatar': 'MN',
  islamabad: 'PK', karachi: 'PK', lahore: 'PK',

  // Europe
  albania: 'AL', andorra: 'AD', austria: 'AT', belarus: 'BY',
  belgium: 'BE', 'bosnia': 'BA', 'bosnia and herzegovina': 'BA',
  bulgaria: 'BG', croatia: 'HR', czechia: 'CZ', 'czech republic': 'CZ',
  denmark: 'DK', estonia: 'EE', finland: 'FI', france: 'FR',
  germany: 'DE', greece: 'GR', hungary: 'HU', iceland: 'IS',
  ireland: 'IE', italy: 'IT', kosovo: 'XK', latvia: 'LV',
  liechtenstein: 'LI', lithuania: 'LT', luxembourg: 'LU', malta: 'MT',
  moldova: 'MD', monaco: 'MC', montenegro: 'ME', netherlands: 'NL',
  holland: 'NL', 'north macedonia': 'MK', macedonia: 'MK', norway: 'NO',
  poland: 'PL', portugal: 'PT', romania: 'RO', russia: 'RU',
  'san marino': 'SM', serbia: 'RS', slovakia: 'SK', slovenia: 'SI',
  spain: 'ES', sweden: 'SE', switzerland: 'CH', ukraine: 'UA',
  'united kingdom': 'GB', uk: 'GB', england: 'GB', scotland: 'GB',
  wales: 'GB', 'great britain': 'GB', britain: 'GB', 'vatican city': 'VA',
  // European city/region hints
  paris: 'FR', nice: 'FR', lyon: 'FR', marseille: 'FR', bordeaux: 'FR',
  'french riviera': 'FR', 'côte d\'azur': 'FR', normandy: 'FR',
  rome: 'IT', milan: 'IT', venice: 'IT', florence: 'IT', naples: 'IT',
  amalfi: 'IT', sicily: 'IT', sardinia: 'IT', tuscany: 'IT',
  barcelona: 'ES', madrid: 'ES', seville: 'ES', granada: 'ES',
  ibiza: 'ES', mallorca: 'ES', tenerife: 'ES', 'canary islands': 'ES',
  lisbon: 'PT', porto: 'PT', algarve: 'PT',
  athens: 'GR', santorini: 'GR', mykonos: 'GR', crete: 'GR', rhodes: 'GR',
  corfu: 'GR', zakynthos: 'GR',
  amsterdam: 'NL', 'the hague': 'NL',
  berlin: 'DE', munich: 'DE', hamburg: 'DE', frankfurt: 'DE',
  vienna: 'AT', salzburg: 'AT', innsbruck: 'AT',
  zurich: 'CH', geneva: 'CH', bern: 'CH', interlaken: 'CH', lucerne: 'CH',
  prague: 'CZ', krakow: 'PL', warsaw: 'PL', budapest: 'HU',
  reykjavik: 'IS', oslo: 'NO', bergen: 'NO', lofoten: 'NO',
  stockholm: 'SE', gothenburg: 'SE', copenhagen: 'DK',
  helsinki: 'FI', tallinn: 'EE', riga: 'LV', vilnius: 'LT',
  edinburgh: 'GB', london: 'GB', oxford: 'GB', cambridge: 'GB',
  dublin: 'IE', galway: 'IE',
  brussels: 'BE', bruges: 'BE', ghent: 'BE',
  dubrovnik: 'HR', split: 'HR', zagreb: 'HR', plitvice: 'HR',
  'kotor': 'ME', 'budva': 'ME',
  kyiv: 'UA', kiev: 'UA', 'lviv': 'UA',
  bucharest: 'RO', transylvania: 'RO',
  istanbul: 'TR', cappadocia: 'TR', antalya: 'TR', pamukkale: 'TR',

  // North America
  'antigua and barbuda': 'AG', bahamas: 'BS', barbados: 'BB',
  belize: 'BZ', canada: 'CA', 'costa rica': 'CR', cuba: 'CU',
  dominica: 'DM', 'dominican republic': 'DO', 'el salvador': 'SV',
  grenada: 'GD', guatemala: 'GT', haiti: 'HT', honduras: 'HN',
  jamaica: 'JM', mexico: 'MX', nicaragua: 'NI', panama: 'PA',
  'saint kitts': 'KN', 'saint lucia': 'LC', 'saint vincent': 'VC',
  'trinidad and tobago': 'TT', trinidad: 'TT', tobago: 'TT',
  'united states': 'US', usa: 'US', 'united states of america': 'US',
  america: 'US', 'u.s.a': 'US', 'u.s': 'US',
  // NA city/region hints
  'new york': 'US', 'los angeles': 'US', 'las vegas': 'US',
  miami: 'US', hawaii: 'US', chicago: 'US', 'san francisco': 'US',
  'new orleans': 'US', seattle: 'US', boston: 'US', dc: 'US',
  'washington dc': 'US', nashville: 'US', yellowstone: 'US',
  'grand canyon': 'US', 'napa valley': 'US', 'yosemite': 'US',
  toronto: 'CA', vancouver: 'CA', montreal: 'CA', quebec: 'CA',
  banff: 'CA', whistler: 'CA', niagara: 'CA',
  cancun: 'MX', tulum: 'MX', 'mexico city': 'MX', oaxaca: 'MX',
  'playa del carmen': 'MX', 'cabo san lucas': 'MX', guadalajara: 'MX',
  havana: 'CU', varadero: 'CU',
  'san jose': 'CR', 'manuel antonio': 'CR', arenal: 'CR',
  'punta cana': 'DO', 'santo domingo': 'DO',
  belize_city: 'BZ', 'ambergris caye': 'BZ',
  kingston: 'JM', montego: 'JM',

  // South America
  argentina: 'AR', bolivia: 'BO', brazil: 'BR', chile: 'CL',
  colombia: 'CO', ecuador: 'EC', guyana: 'GY', paraguay: 'PY',
  peru: 'PE', suriname: 'SR', uruguay: 'UY', venezuela: 'VE',
  // SA city/region hints
  'buenos aires': 'AR', patagonia: 'AR', mendoza: 'AR', bariloche: 'AR',
  'rio de janeiro': 'BR', 'são paulo': 'BR', 'sao paulo': 'BR',
  salvador: 'BR', 'iguazu': 'AR', 'iguaçu': 'BR', amazon: 'BR',
  lima: 'PE', cusco: 'PE', cuzco: 'PE', 'machu picchu': 'PE',
  'galapagos': 'EC', quito: 'EC',
  bogota: 'CO', cartagena: 'CO', medellin: 'CO',
  santiago: 'CL', 'torres del paine': 'CL', atacama: 'CL',
  montevideo: 'UY', 'punta del este': 'UY',

  // Oceania
  australia: 'AU', fiji: 'FJ', kiribati: 'KI', 'marshall islands': 'MH',
  micronesia: 'FM', nauru: 'NR', 'new zealand': 'NZ', palau: 'PW',
  'papua new guinea': 'PG', png: 'PG', samoa: 'WS', 'solomon islands': 'SB',
  tonga: 'TO', tuvalu: 'TV', vanuatu: 'VU',
  // Oceania city/region hints
  sydney: 'AU', melbourne: 'AU', brisbane: 'AU', perth: 'AU',
  'gold coast': 'AU', cairns: 'AU', uluru: 'AU', 'great barrier reef': 'AU',
  'queensland': 'AU', 'new south wales': 'AU', tasmania: 'AU',
  auckland: 'NZ', queenstown: 'NZ', christchurch: 'NZ', rotorua: 'NZ',
  'milford sound': 'NZ', 'bay of islands': 'NZ',
  'bora bora': 'PF', tahiti: 'PF', 'french polynesia': 'PF',
  'nadi': 'FJ', 'suva': 'FJ',
};

// ─── Extract ISO code from a Trip object ──────────────────────────────────────

export interface TripLike {
  title?: string | null;
  itinerary?: { destination?: string } | null;
  locations?: { name?: string | null }[] | null;
}

/**
 * Attempts to detect the primary country from a trip and return its ISO alpha-2 code.
 * Checks in order: itinerary.destination → title → first location name.
 * Returns null if no country can be determined.
 */
export function extractCountryFromTrip(trip: TripLike): string | null {
  const candidates: string[] = [];

  if (trip.itinerary?.destination) candidates.push(trip.itinerary.destination);
  if (trip.title) candidates.push(trip.title);
  if (trip.locations?.length) {
    trip.locations.slice(0, 3).forEach((l) => {
      if (l.name) candidates.push(l.name);
    });
  }

  for (const text of candidates) {
    const iso = detectIsoFromText(text);
    if (iso) return iso;
  }
  return null;
}

/**
 * Scan a free-text string for any country name / city / region and return its ISO code.
 */
export function detectIsoFromText(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // 1. Direct 2-letter ISO code check (e.g. the text IS "JP" or "US")
  const upperTrimmed = text.trim().toUpperCase();
  if (upperTrimmed.length === 2 && COUNTRY_DATA[upperTrimmed]) return upperTrimmed;

  // 2. Exact match in NAME_TO_ISO
  if (NAME_TO_ISO[lower]) return NAME_TO_ISO[lower];

  // 3. Substring scan — longest match wins
  let bestMatch: { iso: string; len: number } | null = null;
  for (const [name, iso] of Object.entries(NAME_TO_ISO)) {
    if (lower.includes(name) && name.length > (bestMatch?.len ?? 0)) {
      bestMatch = { iso, len: name.length };
    }
  }
  if (bestMatch) return bestMatch.iso;

  return null;
}

/**
 * Given an array of trips, return deduplicated ISO codes for countries found.
 */
export function extractCountriesFromTrips(trips: TripLike[]): string[] {
  const seen = new Set<string>();
  for (const trip of trips) {
    const iso = extractCountryFromTrip(trip);
    if (iso && COUNTRY_DATA[iso]) seen.add(iso);
  }
  return Array.from(seen);
}
