import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Trip } from '../types';

export async function getOrCreateDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem('device_id');
  if (stored) return stored;
  const id = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await AsyncStorage.setItem('device_id', id);
  return id;
}

export function useRecentTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTrips() {
      try {
        const deviceId = await getOrCreateDeviceId();
        const { data, error } = await supabase
          .from('trips')
          .select('id, created_at, title, platform, locations, itinerary, is_pro')
          .eq('device_id', deviceId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!cancelled && !error && data) {
          setTrips(data as Trip[]);
        }
      } catch {
        // Silently fail — empty state will show
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchTrips();
    return () => { cancelled = true; };
  }, []);

  return { trips, isLoading };
}
