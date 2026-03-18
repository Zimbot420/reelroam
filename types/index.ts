export type UserTier = 'free' | 'pro';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type BadgeCategory = 'country' | 'explorer' | 'social' | 'travel_style' | 'booking' | 'secret';

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  tier: BadgeTier;
  is_secret: boolean;
  created_at: string;
}

export interface UserBadge {
  badge_slug: string;
  earned_at: string;
}

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
  user_id?: string | null;
  // Social / feed fields
  is_public?: boolean;
  like_count?: number;
  save_count?: number;
  username?: string;
  user_avatar_emoji?: string;
  // Past trip fields
  is_past_trip?: boolean;
  visited_start?: string | null;
  visited_end?: string | null;
  approximate_dates?: boolean;
  rating?: number | null;
  mood_tags?: string[];
  trip_highlights?: string[];
  trip_note?: string | null;
  cover_url?: string | null;
}
