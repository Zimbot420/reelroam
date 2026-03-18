import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/context/AuthContext';
import { getOrCreateDeviceId } from '../../../lib/deviceId';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MOOD_TAG_EMOJIS: Record<string, string> = {
  'Food lover': '🍜', 'Adventurous': '🏔️', 'Relaxing': '🏖️',
  'Cultural': '🎭', 'Budget': '💰', 'Luxury': '💎',
  'Family': '👨‍👩‍👧', 'Romantic': '💑', 'With Friends': '👥', 'Solo': '🎒',
};

const RATING_LABELS: Record<number, string> = {
  1: 'Disappointing', 2: 'It was okay', 3: 'Good', 4: 'Amazing', 5: 'Life changing',
};

const COUNTRY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  japan: { latitude: 36.2, longitude: 138.25 }, thailand: { latitude: 15.87, longitude: 100.99 },
  france: { latitude: 46.23, longitude: 2.21 }, italy: { latitude: 41.87, longitude: 12.57 },
  spain: { latitude: 40.46, longitude: -3.75 }, usa: { latitude: 37.09, longitude: -95.71 },
  'united states': { latitude: 37.09, longitude: -95.71 },
  australia: { latitude: -25.27, longitude: 133.78 },
  indonesia: { latitude: -0.79, longitude: 113.92 }, bali: { latitude: -8.34, longitude: 115.09 },
  greece: { latitude: 39.07, longitude: 21.82 }, portugal: { latitude: 39.4, longitude: -8.22 },
  mexico: { latitude: 23.63, longitude: -102.55 }, brazil: { latitude: -14.24, longitude: -51.93 },
  india: { latitude: 20.59, longitude: 78.96 }, vietnam: { latitude: 14.06, longitude: 108.28 },
  'united kingdom': { latitude: 55.38, longitude: -3.44 },
  germany: { latitude: 51.17, longitude: 10.45 }, canada: { latitude: 56.13, longitude: -106.35 },
  morocco: { latitude: 31.79, longitude: -7.09 }, egypt: { latitude: 26.82, longitude: 30.8 },
  norway: { latitude: 60.47, longitude: 8.47 }, sweden: { latitude: 60.13, longitude: 18.64 },
  singapore: { latitude: 1.35, longitude: 103.82 },
};

function getCoordsForDestination(dest: string): { latitude: number; longitude: number } | null {
  const d = dest.toLowerCase();
  for (const [key, coords] of Object.entries(COUNTRY_COORDS)) {
    if (d.includes(key)) return coords;
  }
  return null;
}

function formatDateRange(visitedStart: string | null, visitedEnd: string | null): string {
  if (!visitedStart) return '';
  const parseDate = (s: string) => {
    const parts = s.split('-');
    if (parts.length >= 2) return { year: Number(parts[0]), month: Number(parts[1]) - 1 };
    return { year: Number(parts[0]), month: null };
  };
  const start = parseDate(visitedStart);
  const startLabel = start.month !== null ? `${MONTHS[start.month]} ${start.year}` : `${start.year}`;
  if (!visitedEnd) return startLabel;
  const end = parseDate(visitedEnd);
  const endLabel = end.month !== null ? `${MONTHS[end.month]} ${end.year}` : `${end.year}`;
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

export default function PastTripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  useEffect(() => {
    if (id) loadTrip();
  }, [id]);

  async function loadTrip() {
    setLoading(true);
    const { data } = await supabase.from('trips').select('*').eq('id', id).single();
    setTrip(data);
    setLoading(false);
  }

  const isOwner = trip
    ? (deviceId && trip.device_id === deviceId) || (user && trip.user_id === user.id)
    : false;

  async function handleDelete() {
    Alert.alert(
      'Delete trip',
      `Remove "${trip?.title}" from your Been There list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            await supabase.from('trips').delete().eq('id', id);
            setDeleting(false);
            router.back();
          },
        },
      ],
    );
  }

  async function handleShareToFeed() {
    Alert.alert(
      'Share to feed?',
      'This will make your trip public and visible to other users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async () => {
            setSharing(true);
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_emoji')
                .eq('device_id', deviceId)
                .maybeSingle();

              await supabase.from('trips').update({
                is_public: true,
                username: profile?.username ?? null,
                user_avatar_emoji: profile?.avatar_emoji ?? '🌍',
              }).eq('id', id);

              setTrip((prev) => prev ? { ...prev, is_public: true } : prev);
              Alert.alert('Shared! 🎉', 'Your trip is now visible in the Discover feed.');
            } finally {
              setSharing(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Loading...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>Trip not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: TEAL, fontSize: 15 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const destination = trip.title ?? 'Trip';
  const dateRange = formatDateRange(trip.visited_start, trip.visited_end);
  const rating: number = trip.rating ?? 0;
  const moodTags: string[] = trip.mood_tags ?? [];
  const highlights: string[] = trip.trip_highlights ?? [];
  const note: string | null = trip.trip_note ?? null;
  const coverUrl: string | null = trip.cover_url ?? null;
  const coords = getCoordsForDestination(destination);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover photo header */}
        <View style={{ height: 280, position: 'relative' }}>
          {coverUrl ? (
            <ExpoImage
              source={{ uri: coverUrl }}
              contentFit="cover"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          ) : (
            <LinearGradient
              colors={['#004d40', '#006064', '#01579b']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.4, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: 'absolute', top: insets.top + 10, left: 16,
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.45)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          {/* Been Here badge */}
          <View
            style={{
              position: 'absolute', top: insets.top + 10, right: 16,
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(34,197,94,0.85)',
              borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
            }}
          >
            <Ionicons name="checkmark-circle" size={13} color="white" />
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Been Here</Text>
          </View>

          {/* Bottom title area */}
          <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
            <Text style={{ color: 'white', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
              {destination}
            </Text>
            {dateRange ? (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
                📅 {dateRange}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          {/* Star rating */}
          {rating > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                Rating
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons
                      key={n}
                      name={n <= rating ? 'star' : 'star-outline'}
                      size={24}
                      color={n <= rating ? '#f59e0b' : 'rgba(255,255,255,0.2)'}
                    />
                  ))}
                </View>
                <Text style={{ color: '#f59e0b', fontSize: 14, fontWeight: '600' }}>
                  {RATING_LABELS[rating]}
                </Text>
              </View>
            </View>
          )}

          {/* Mood tags */}
          {moodTags.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                Travel vibes
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {moodTags.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{MOOD_TAG_EMOJIS[tag] ?? '📌'}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                Highlights
              </Text>
              {highlights.map((h, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                    paddingVertical: 8,
                    borderBottomWidth: i < highlights.length - 1 ? 1 : 0,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <View
                    style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: TEAL, marginTop: 7, flexShrink: 0,
                    }}
                  />
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, flex: 1 }}>{h}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Note */}
          {note && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                Notes
              </Text>
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                  borderLeftWidth: 3, borderLeftColor: TEAL,
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 21, fontStyle: 'italic' }}>
                  "{note}"
                </Text>
              </View>
            </View>
          )}

          {/* Map */}
          {coords && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                Location
              </Text>
              <MapView
                style={{ width: '100%', height: 160, borderRadius: 12 }}
                liteMode
                mapType="hybrid"
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                initialRegion={{
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  latitudeDelta: 8,
                  longitudeDelta: 8,
                }}
              >
                <Marker coordinate={coords} pinColor={TEAL} />
              </MapView>
            </View>
          )}

          {/* Action buttons (own trips only) */}
          {isOwner && (
            <View style={{ gap: 10 }}>
              {!trip.is_public && (
                <TouchableOpacity
                  onPress={handleShareToFeed}
                  disabled={sharing}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: `${TEAL}20`,
                    borderRadius: 14, paddingVertical: 14,
                    borderWidth: 1.5, borderColor: TEAL,
                  }}
                >
                  <Ionicons name="share-social-outline" size={18} color={TEAL} />
                  <Text style={{ color: TEAL, fontSize: 15, fontWeight: '700' }}>
                    {sharing ? 'Sharing...' : 'Share to Discover feed'}
                  </Text>
                </TouchableOpacity>
              )}
              {trip.is_public && (
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    borderRadius: 14, paddingVertical: 14,
                    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
                  }}
                >
                  <Ionicons name="earth" size={16} color="#22c55e" />
                  <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '600' }}>Shared publicly</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  borderRadius: 14, paddingVertical: 14,
                  borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>
                  {deleting ? 'Deleting...' : 'Delete trip'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
