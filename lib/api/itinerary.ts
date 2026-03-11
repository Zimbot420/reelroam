/**
 * Itinerary generation API.
 * Currently uses mock data — will be replaced with real Claude API calls.
 */

import { Location, Day } from '../../types';

export interface ItineraryResult {
  title: string;
  itinerary: Day[];
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function generateItinerary(
  locations: Location[],
  platform: string
): Promise<ItineraryResult> {
  // TODO: Replace with real Supabase Edge Function call
  // POST /functions/v1/generate-itinerary { locations, platform }
  await delay(2000);

  const [inari, bamboo, kinkaku, nishiki] = locations;

  return {
    title: '5 Days in Kyoto',
    itinerary: [
      {
        day: 1,
        title: 'Temples & Gates',
        activities: [
          {
            time: '8:00 AM',
            title: 'Fushimi Inari Shrine',
            description:
              'Arrive early to hike through thousands of torii gates before crowds arrive. Climb to the summit for panoramic city views.',
            location: inari,
            duration: '3 hours',
            cost: 'Free',
          },
          {
            time: '12:00 PM',
            title: 'Lunch at Fushimi',
            description: 'Try inari sushi (named after the shrine) at a local restaurant.',
            duration: '1 hour',
            cost: '¥1,000–1,500',
          },
          {
            time: '2:00 PM',
            title: 'Kinkaku-ji (Golden Pavilion)',
            description:
              'Visit the iconic gold-leaf temple reflected in its mirror pond.',
            location: kinkaku,
            duration: '2 hours',
            cost: '¥500',
          },
        ],
      },
      {
        day: 2,
        title: 'Nature & Markets',
        activities: [
          {
            time: '7:30 AM',
            title: 'Arashiyama Bamboo Grove',
            description:
              'Walk through the towering bamboo forest at dawn — the light and silence are magical.',
            location: bamboo,
            duration: '1.5 hours',
            cost: 'Free',
          },
          {
            time: '10:00 AM',
            title: 'Tenryu-ji Garden',
            description:
              'A UNESCO World Heritage garden with perfectly raked gravel and a koi pond.',
            duration: '1.5 hours',
            cost: '¥500',
          },
          {
            time: '2:00 PM',
            title: 'Nishiki Market',
            description:
              'Graze through Kyoto\'s bustling food market — try pickled vegetables, skewers, and matcha sweets.',
            location: nishiki,
            duration: '2 hours',
            cost: '¥1,500–2,500',
          },
        ],
      },
    ],
  };
}
