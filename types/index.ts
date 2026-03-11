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

export interface Trip {
  id: string;
  created_at: string;
  source_url: string;
  platform?: string;
  title?: string;
  locations?: Location[];
  itinerary?: Day[];
  share_slug?: string;
  extraction_method?: string;
  is_pro: boolean;
  device_id?: string;
}
