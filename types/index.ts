export type UserTier = 'free' | 'pro';

export interface Location {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  category?: string;
}

export interface Activity {
  time?: string;
  title: string;
  description?: string;
  location?: Location;
  duration?: string;
  cost?: string;
  notes?: string;
}

export interface Day {
  day: number;
  date?: string;
  title?: string;
  activities: Activity[];
}

export interface ItineraryData {
  title: string;
  destination: string;
  totalDays: number;
  coverImageQuery?: string;
  days: {
    day: number;
    label: string;
    activities: {
      id: string;
      name: string;
      description: string;
      locationName: string;
      coordinates: { lat: number; lng: number };
      duration: string;
      type: 'food' | 'activity' | 'accommodation' | 'transport';
      estimatedCost: string;
      tips: string;
    }[];
  }[];
  totalEstimatedCost: string;
  bestTimeToVisit: string;
  tips: string[];
}

export interface Trip {
  id: string;
  created_at: string;
  source_url: string;
  platform?: string;
  title?: string;
  locations?: Location[];
  itinerary?: ItineraryData;
  share_slug?: string;
  extraction_method?: string;
  is_pro: boolean;
  device_id?: string;
  // Social / feed fields
  is_public?: boolean;
  like_count?: number;
  save_count?: number;
  username?: string;
  user_avatar_emoji?: string;
}
