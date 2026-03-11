/**
 * Location extraction API.
 * Currently uses mock data — will be replaced with real Claude API calls.
 * Real implementation will call a Supabase Edge Function that uses
 * the Anthropic SDK server-side (ANTHROPIC_API_KEY never hits the client).
 */

import { Location } from '../../types';

export interface ExtractionResult {
  locations: Location[];
  needsVision: boolean;
  extractionMethod: 'text' | 'vision';
  videoTitle?: string;
}

// Simulated network delay
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const MOCK_LOCATIONS: Location[] = [
  {
    name: 'Fushimi Inari Shrine',
    address: 'Fukakusa Yabunouchicho, Fushimi Ward, Kyoto, Japan',
    latitude: 34.9671,
    longitude: 135.7727,
    description: 'Famous for thousands of vermillion torii gates winding up the mountain',
    category: 'shrine',
  },
  {
    name: 'Arashiyama Bamboo Grove',
    address: 'Sagaogurayama, Ukyo Ward, Kyoto, Japan',
    latitude: 35.0094,
    longitude: 135.6721,
    description: 'A towering bamboo forest on the outskirts of Kyoto',
    category: 'nature',
  },
  {
    name: 'Kinkaku-ji (Golden Pavilion)',
    address: '1 Kinkakujicho, Kita Ward, Kyoto, Japan',
    latitude: 35.0394,
    longitude: 135.7292,
    description: 'A Zen Buddhist temple covered in gold leaf, reflecting in its pond',
    category: 'temple',
  },
  {
    name: 'Nishiki Market',
    address: 'Nishiki-koji, Nakagyo Ward, Kyoto, Japan',
    latitude: 35.0052,
    longitude: 135.7651,
    description: 'A narrow five-block shopping street — the "Kitchen of Kyoto"',
    category: 'food',
  },
];

export async function extractLocations(
  url: string,
  platform: string
): Promise<ExtractionResult> {
  // TODO: Replace with real Supabase Edge Function call
  // POST /functions/v1/extract-locations { url, platform }
  await delay(1800);

  return {
    locations: MOCK_LOCATIONS,
    needsVision: false, // set true to test the /upgrade gate
    extractionMethod: 'text',
    videoTitle: '5 Days in Kyoto — Best Spots You Cannot Miss',
  };
}
