import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  Alert,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Callout, Marker, Polyline } from 'react-native-maps';
import {
  supabase,
  unpublishTrip,
  saveTrip as saveTripToList,
  unsaveTrip as unsaveTripFromList,
  hasSavedTrip,
} from '../../lib/supabase';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { useAuth } from '../../lib/context/AuthContext';
import { cacheTripDetail, getCachedTripDetail } from '../../lib/offlineCache';
import { checkAndAwardBadges } from '../../lib/badges';
import { Badge } from '../../types';
import ShareToFeedModal from '../../components/ShareToFeedModal';
import BadgeCelebrationModal from '../../components/BadgeCelebrationModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItineraryActivity {
  id: string;
  name: string;
  description: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  duration: string;
  type: 'food' | 'activity' | 'accommodation' | 'transport';
  estimatedCost: string;
  tips: string;
}

interface ItineraryDay {
  day: number;
  label: string;
  activities: ItineraryActivity[];
}

interface ItineraryData {
  title: string;
  destination: string;
  totalDays: number;
  days: ItineraryDay[];
  totalEstimatedCost: string;
  bestTimeToVisit: string;
  tips: string[];
}

interface TripRow {
  id: string;
  title: string;
  platform: string;
  is_pro: boolean;
  is_public: boolean;
  share_slug: string;
  source_url: string;
  itinerary: ItineraryData;
  created_at: string;
  username?: string;
  user_avatar_emoji?: string;
  device_id?: string;
  user_id?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#0D9488';
const SCREEN_HEIGHT   = Dimensions.get('window').height;
const SNAP_COLLAPSED  = Math.round(SCREEN_HEIGHT * 0.25);
const SNAP_DEFAULT    = Math.round(SCREEN_HEIGHT * 0.45);
const SNAP_EXPANDED   = Math.round(SCREEN_HEIGHT * 0.75);
const SNAP_POINTS     = [SNAP_COLLAPSED, SNAP_DEFAULT, SNAP_EXPANDED];

// Ionicons for activity types — no emoji as structural icons (UI/UX Pro Max rule)
const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  food:          'restaurant-outline',
  activity:      'camera-outline',
  accommodation: 'business-outline',
  transport:     'car-outline',
};

// Per-type accent gradients for icon badge tints and image overlays
const TYPE_GRADIENTS: Record<string, [string, string]> = {
  food:          ['#F97316', '#EA580C'],
  activity:      ['#8B5CF6', '#6D28D9'],
  accommodation: ['#0D9488', '#0a7a70'],
  transport:     ['#64748B', '#475569'],
};

const TRANSPORT_MODES = [
  { key: 'bus',  icon: 'bus-outline'  as const },
  { key: 'walk', icon: 'walk-outline' as const },
  { key: 'car',  icon: 'car-outline'  as const },
] as const;

type TransportMode = 'bus' | 'walk' | 'car';

// ─── Google Places photo lookup ───────────────────────────────────────────────

const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
// Module-level cache: query string → photo URL (empty string = no photo found)
const _photoCache = new Map<string, string>();

function usePlacePhoto(name: string, locationName: string, shouldFetch: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!shouldFetch || fetchedRef.current || !GMAPS_KEY) return;
    fetchedRef.current = true;

    const query = [name, locationName].filter(Boolean).join(' ');

    // Serve from cache immediately if we've seen this query before
    const cached = _photoCache.get(query);
    if (cached !== undefined) {
      if (cached) setUrl(cached);
      return;
    }

    fetch(`${PLACES_BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${GMAPS_KEY}`)
      .then((r) => r.json())
      .then((data) => {
        const ref: string | undefined = data.results?.[0]?.photos?.[0]?.photo_reference;
        const photoUrl = ref
          ? `${PLACES_BASE}/photo?maxwidth=800&photo_reference=${ref}&key=${GMAPS_KEY}`
          : '';
        _photoCache.set(query, photoUrl);
        if (photoUrl) setUrl(photoUrl);
      })
      .catch(() => {
        _photoCache.set(query, ''); // don't retry failed queries
      });
  }, [shouldFetch]);

  return url;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBlock({ w, h }: { w: string; h: number }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{ opacity, height: h, borderRadius: 12, backgroundColor: '#E5E7EB', width: w as any, marginBottom: 10 }}
    />
  );
}

function TripSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ height: SNAP_DEFAULT, backgroundColor: '#E5E7EB' }} />
      <View style={{
        flex: 1, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        backgroundColor: 'white', padding: 20,
      }}>
        <SkeletonBlock w="80%" h={30} />
        <SkeletonBlock w="55%" h={16} />
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 16 }}>
          <SkeletonBlock w="32%" h={34} />
          <SkeletonBlock w="26%" h={34} />
          <SkeletonBlock w="30%" h={34} />
        </View>
        <SkeletonBlock w="100%" h={110} />
        <SkeletonBlock w="100%" h={88} />
        <SkeletonBlock w="100%" h={88} />
      </View>
    </View>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────

function NotFoundScreen({ onHome }: { onHome: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Ionicons name="map-outline" size={56} color="#D1D5DB" style={{ marginBottom: 16 }} />
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
        Trip not found
      </Text>
      <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 32, lineHeight: 21 }}>
        This trip link may have expired or been removed.
      </Text>
      <TouchableOpacity
        onPress={onHome}
        style={{ paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28, backgroundColor: TEAL, minWidth: 44, minHeight: 44, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Go Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  isSelected,
  onPress,
}: {
  activity: ItineraryActivity;
  isSelected: boolean;
  onPress: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;

  const icon      = TYPE_ICONS[activity.type] ?? 'location-outline';
  const colors    = TYPE_GRADIENTS[activity.type] ?? TYPE_GRADIENTS.activity;
  const gradStart = colors[0];
  // 8-digit hex = colour + 12% opacity tint for the icon badge background
  const tintBg    = gradStart + '1F';
  // Real Google Places photo, fetched lazily on first expand; falls back to picsum
  const realPhotoUrl = usePlacePhoto(activity.name, activity.locationName, expanded);
  const imageUrl     = realPhotoUrl ?? `https://picsum.photos/seed/${activity.id}/600/250`;

  // Auto-expand card when the matching map pin is tapped
  useEffect(() => {
    if (isSelected) {
      setExpanded(true);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(chevronAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(fadeAnim,    { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [isSelected]);

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !expanded;
    if (next) {
      setExpanded(true);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(chevronAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(fadeAnim,    { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(chevronAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(fadeAnim,    { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(() => setExpanded(false));
    }
    onPress();
  }

  const chevronRotate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: isSelected ? 0.14 : 0.07,
        shadowRadius:  isSelected ? 14   : 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: isSelected ? 6 : 2,
      }}
    >
      {/* Selected accent bar */}
      {isSelected && (
        <View style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, zIndex: 1,
          backgroundColor: TEAL,
          borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
        }} />
      )}

      {/* ── Collapsed header row (always visible) ──────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, paddingLeft: isSelected ? 17 : 14,
      }}>
        {/* Type-coloured icon badge */}
        <View style={{
          width: 38, height: 38, borderRadius: 12,
          backgroundColor: tintBg,
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Ionicons name={icon} size={17} color={gradStart} />
        </View>

        {/* Name + meta chips */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20 }} numberOfLines={1}>
            {activity.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
            {!!activity.duration && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{activity.duration}</Text>
              </View>
            )}
            {!!activity.estimatedCost && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="cash-outline" size={11} color="#9CA3AF" />
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{activity.estimatedCost}</Text>
              </View>
            )}
            {!!activity.locationName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, overflow: 'hidden' }}>
                <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                <Text style={{ fontSize: 11, color: '#9CA3AF' }} numberOfLines={1}>{activity.locationName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Animated expand chevron */}
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </Animated.View>
      </View>

      {/* ── Expanded panel ─────────────────────────────────────────────── */}
      {expanded && (
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Photo banner with gradient + overlay labels */}
          <View style={{ height: 180 }}>
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: 180 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.62)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
            />
            {/* Location name + type pill on photo */}
            <View style={{
              position: 'absolute', bottom: 10, left: 12, right: 12,
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                {activity.locationName || activity.name}
              </Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: gradStart }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {activity.type}
                </Text>
              </View>
            </View>
          </View>

          {/* Description + tips */}
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 }}>
            {!!activity.description && (
              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
                {activity.description}
              </Text>
            )}
            {!!activity.tips && (
              <View style={{
                backgroundColor: '#F0FDF9', borderRadius: 12, padding: 12,
                flexDirection: 'row', gap: 8, alignItems: 'flex-start',
              }}>
                <Ionicons name="bulb-outline" size={14} color={TEAL} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 }}>{activity.tips}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TripDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { user } = useAuth();

  const [trip, setTrip] = useState<TripRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [isPublic, setIsPublic] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('bus');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [celebrationBadge, setCelebrationBadge] = useState<Badge | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const newBadgeQueueRef = useRef<Badge[]>([]);

  const mapRef = useRef<MapView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const dayOffsets = useRef<Record<number, number>>({});
  const sortedDayKeysRef = useRef<number[]>([]);

  // ── Draggable divider ─────────────────────────────────────────────────────

  const mapHeightAnim = useRef(new Animated.Value(SNAP_DEFAULT)).current;
  const mapHeightRef  = useRef(SNAP_DEFAULT);   // mutable mirror for pan math
  const refitMap      = useRef<() => void>(() => {});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: () => {
        // Capture live value so math starts from where animation is
        mapHeightAnim.stopAnimation((val) => { mapHeightRef.current = val; });
      },

      onPanResponderMove: (_, gs) => {
        // gs.moveY = absolute Y of finger from top of screen = desired map height
        const next = Math.min(SNAP_EXPANDED, Math.max(SNAP_COLLAPSED, gs.moveY));
        mapHeightAnim.setValue(next);
        mapHeightRef.current = next;
      },

      onPanResponderRelease: () => {
        const current = mapHeightRef.current;
        const nearest = SNAP_POINTS.reduce((prev, pt) =>
          Math.abs(pt - current) < Math.abs(prev - current) ? pt : prev
        );

        Animated.spring(mapHeightAnim, {
          toValue: nearest,
          useNativeDriver: false,
          tension: 68,
          friction: 12,
        }).start();
        mapHeightRef.current = nearest;

        // Re-fit all pins when snapping to expanded view
        if (nearest === SNAP_EXPANDED) {
          setTimeout(() => refitMap.current(), 380);
        }
      },
    })
  ).current;

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  const loadTrip = useCallback(async () => {
    if (!slug) return;

    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('share_slug', slug)
        .single();

      if (data && !error) {
        // Online — update state and write to cache for future offline use
        setTrip(data as TripRow);
        setIsPublic(data.is_public ?? false);
        setIsOffline(false);
        supabase.from('trip_views').insert({ trip_id: data.id }).then(() => {});
        cacheTripDetail(data as Record<string, unknown>); // fire-and-forget
      } else if (error?.code === 'PGRST116') {
        // Supabase "no rows" = trip genuinely doesn't exist
        setNotFound(true);
      } else {
        // DB/network error — fall back to cache
        const cached = await getCachedTripDetail(slug);
        if (cached) {
          setTrip(cached as unknown as TripRow);
          setIsPublic((cached.is_public as boolean) ?? false);
          setIsOffline(true);
        } else {
          setNotFound(true);
        }
      }
    } catch {
      // Hard network failure (no connection at all)
      const cached = await getCachedTripDetail(slug);
      if (cached) {
        setTrip(cached as unknown as TripRow);
        setIsPublic((cached.is_public as boolean) ?? false);
        setIsOffline(true);
      } else {
        setNotFound(true);
      }
    }

    setLoading(false);
  }, [slug]);

  // Refetch on every focus so edits made in the edit screen appear immediately
  useFocusEffect(
    useCallback(() => {
      loadTrip();
    }, [loadTrip]),
  );

  // Focus map on active day's first location
  useEffect(() => {
    if (!trip?.itinerary?.days) return;
    const day = trip.itinerary.days.find((d) => d.day === activeDay);
    const first = day?.activities?.find((a) => a.coordinates?.lat && a.coordinates?.lng);
    if (first && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: first.coordinates.lat,
        longitude: first.coordinates.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 600);
    }
  }, [activeDay]);

  // Check saved state once both trip id and deviceId are available
  useEffect(() => {
    if (!trip?.id || !deviceId) return;
    hasSavedTrip(trip.id, deviceId).then(setIsSaved);
  }, [trip?.id, deviceId]);

  // Keep refitMap.current pointing at current trip + mapRef
  useEffect(() => {
    refitMap.current = () => {
      if (!trip?.itinerary?.days || !mapRef.current) return;
      const coords = trip.itinerary.days
        .flatMap((d) => d.activities)
        .filter((a) => a.coordinates?.lat && a.coordinates?.lng)
        .map((a) => ({ latitude: a.coordinates.lat, longitude: a.coordinates.lng }));
      if (coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 40, bottom: 40, left: 40 },
          animated: true,
        });
      }
    };
  }, [trip]);

  // ── Memoized derived data ─────────────────────────────────────────────────

  const itinerary = trip?.itinerary ?? null;

  const markers = useMemo(
    () =>
      (itinerary?.days ?? [])
        .flatMap((d) => d.activities)
        .filter((a) => a.coordinates?.lat && a.coordinates?.lng),
    [itinerary],
  );

  const polylineCoords = useMemo(
    () => markers.map((a) => ({ latitude: a.coordinates.lat, longitude: a.coordinates.lng })),
    [markers],
  );

  const chips = useMemo(
    () =>
      [
        itinerary?.totalEstimatedCost ? `Budget: ${itinerary.totalEstimatedCost}` : null,
        itinerary?.totalDays          ? `Length: ${itinerary.totalDays} day${itinerary.totalDays !== 1 ? 's' : ''}` : null,
        itinerary?.destination        ? `Destination: ${itinerary.destination}` : null,
        itinerary?.bestTimeToVisit    ? `Best time: ${itinerary.bestTimeToVisit}` : null,
      ].filter((c): c is string => !!c),
    [itinerary],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const offsets = dayOffsets.current;
    const days = sortedDayKeysRef.current;
    for (let i = days.length - 1; i >= 0; i--) {
      if (y >= offsets[days[i]] - 80) {
        if (activeDay !== days[i]) setActiveDay(days[i]);
        break;
      }
    }
  }

  function handlePinPress(activity: ItineraryActivity) {
    setSelectedActivityId(activity.id);
    if (!trip?.itinerary?.days) return;
    for (const day of trip.itinerary.days) {
      if (day.activities.some((a) => a.id === activity.id)) {
        const offset = dayOffsets.current[day.day];
        if (offset !== undefined) scrollRef.current?.scrollTo({ y: offset, animated: true });
        break;
      }
    }
  }

  async function handleToggleSave() {
    if (!trip || !deviceId || isSaving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !isSaved;
    setIsSaved(newState); // optimistic update
    setIsSaving(true);
    try {
      if (newState) {
        await saveTripToList(trip.id, deviceId);
      } else {
        await unsaveTripFromList(trip.id, deviceId);
      }
    } catch {
      setIsSaved(!newState); // revert on error
      Alert.alert('Error', 'Could not update your bucket list. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleShare() {
    if (!trip) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const webUrl   = `${SUPABASE_URL}/functions/v1/trip-page?slug=${slug}`;
    const appUrl   = `scrollaway://trip/${slug}`;
    const tripTitle = trip.itinerary?.title ?? trip.title ?? 'A travel itinerary';
    const dest      = trip.itinerary?.destination ? ` to ${trip.itinerary.destination}` : '';

    try {
      await Share.share({
        // `url` is iOS-only (shows as a rich link preview in iMessage etc.)
        // `message` is the fallback for Android and plain-text shares.
        url: webUrl,
        message: `Check out this trip${dest} I built with ScrollAway!\n\n${tripTitle}\n\n${webUrl}`,
        title: tripTitle,
      });
    } catch { /* dismissed */ }
  }

  function handlePublicBadgePress() {
    if (!trip || !isPublic) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Remove from Feed?',
      'Your trip will be removed from the Discovery feed. Likes and saves will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make Private',
          style: 'destructive',
          onPress: async () => {
            try {
              await unpublishTrip(trip.id);
              setIsPublic(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert('Error', 'Failed to update trip visibility.');
            }
          },
        },
      ],
    );
  }

  function onMapReady() {
    if (!trip?.itinerary?.days || !mapRef.current) return;
    const coords = trip.itinerary.days
      .flatMap((d) => d.activities)
      .filter((a) => a.coordinates?.lat && a.coordinates?.lng)
      .map((a) => ({ latitude: a.coordinates.lat, longitude: a.coordinates.lng }));
    if (coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }

  // ── Early returns ─────────────────────────────────────────────────────────

  if (loading) return <TripSkeleton />;
  if (notFound) return <NotFoundScreen onHome={() => router.replace('/')} />;
  if (!trip) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: '#E5E7EB' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <Animated.View style={{ height: mapHeightAnim }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          onMapReady={onMapReady}
        >
          {/* Polyline route */}
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={TEAL}
              strokeWidth={3}
            />
          )}

          {/* Numbered pins */}
          {markers.map((activity, index) => (
            <Marker
              key={activity.id}
              coordinate={{ latitude: activity.coordinates.lat, longitude: activity.coordinates.lng }}
              onPress={() => handlePinPress(activity)}
            >
              <View style={{
                width: 32, height: 32, borderRadius: 16, backgroundColor: TEAL,
                borderWidth: 2.5, borderColor: 'white',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
              }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{index + 1}</Text>
              </View>
              <Callout>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, minWidth: 120 }}>
                  <Text style={{ fontWeight: '600', fontSize: 13, color: '#111827' }}>{activity.name}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{activity.locationName}</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        {/* Back button — top left, safe area aware */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: 'absolute', top: insets.top + 8, left: 16,
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 }, elevation: 4,
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>

        {/* Transport mode toggles — top right */}
        <View style={{
          position: 'absolute', top: insets.top + 8, right: 16,
          flexDirection: 'row', gap: 8,
        }}>
          {TRANSPORT_MODES.map(({ key, icon }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setTransportMode(key)}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: transportMode === key ? TEAL : 'white',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 }, elevation: 4,
              }}
            >
              <Ionicons name={icon} size={18} color={transportMode === key ? 'white' : '#374151'} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ── Draggable handle bar ───────────────────────────────────────────── */}
      <View
        {...panResponder.panHandlers}
        style={{
          height: 28,
          backgroundColor: 'white',
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: -4 },
          elevation: 6,
          zIndex: 10,
        }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#CCCCCC' }} />
      </View>

      {/* ── Content card ──────────────────────────────────────────────────── */}
      <Reanimated.View entering={FadeInUp.delay(60).springify().damping(22)} style={{ flex: 1, backgroundColor: 'white', overflow: 'hidden' }}>
        {/* Offline banner */}
        {isOffline && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: '#FFF7ED',
            borderBottomWidth: 1, borderBottomColor: '#FED7AA',
          }}>
            <Ionicons name="cloud-offline-outline" size={15} color="#C2410C" />
            <Text style={{ fontSize: 12, color: '#C2410C', fontWeight: '500', flex: 1 }}>
              You're offline — showing your last saved version
            </Text>
          </View>
        )}

        {/* Trip header */}
        <Reanimated.View entering={FadeInDown.delay(160).duration(380)} style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            {/* Shared element: morphs from the feed card title */}
            <Reanimated.Text
              sharedTransitionTag={`trip-title-${slug}`}
              numberOfLines={2}
              style={{ flex: 1, fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 30 }}
            >
              {itinerary?.title ?? trip.title}
            </Reanimated.Text>
            {/* Edit button — owner only (match by device_id or user_id) */}
            {(trip.device_id === deviceId || (user && trip.user_id === user.id)) && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/trip/edit',
                    params: { tripId: trip.id, slug: trip.share_slug },
                  })
                }
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: '#F0FDF9',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: '#99E6DC',
                }}
              >
                <Ionicons name="create-outline" size={20} color={TEAL} />
              </TouchableOpacity>
            )}

            {/* Bucket list bookmark */}
            <TouchableOpacity
              onPress={handleToggleSave}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: isSaved ? '#F0FDF9' : '#F9FAFB',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: isSaved ? '#99E6DC' : '#F3F4F6',
              }}
            >
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isSaved ? TEAL : '#9CA3AF'}
              />
            </TouchableOpacity>
          </View>

          {/* Metadata row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            {!!itinerary?.destination && (
              <>
                <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 3 }}>{itinerary.destination}</Text>
                <Text style={{ fontSize: 13, color: '#D1D5DB', marginHorizontal: 6 }}>•</Text>
              </>
            )}
            {!!itinerary?.totalDays && (
              <>
                <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 3 }}>
                  {itinerary.totalDays} day{itinerary.totalDays !== 1 ? 's' : ''}
                </Text>
                <Text style={{ fontSize: 13, color: '#D1D5DB', marginHorizontal: 6 }}>•</Text>
              </>
            )}
            <TouchableOpacity
              onPress={handlePublicBadgePress}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 24 }}
            >
              <Ionicons name="earth-outline" size={13} color="#9CA3AF" />
              <Text style={{ fontSize: 13, color: '#9CA3AF', marginLeft: 3 }}>
                {isPublic ? 'Public trip' : 'Private trip'}
              </Text>
            </TouchableOpacity>

            {trip.is_pro && (
              <>
                <Text style={{ fontSize: 13, color: '#D1D5DB', marginHorizontal: 6 }}>•</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#FEF3C7' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#B45309' }}>Pro</Text>
                </View>
              </>
            )}
          </View>
        </Reanimated.View>

        {/* Scrollable content */}
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 160 }}
        >
          {/* ── Info chips ─────────────────────────────────────────────────── */}
          {chips.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
              style={{ marginBottom: 20 }}
            >
              {chips.map((chip, i) => (
                <View key={i} style={{
                  paddingHorizontal: 14, paddingVertical: 9,
                  borderRadius: 20, backgroundColor: '#F0F0F0',
                }}>
                  <Text style={{ fontSize: 13, color: '#333333', fontWeight: '500' }}>{chip}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* ── Travel Tips ────────────────────────────────────────────────── */}
          {(itinerary?.tips?.length ?? 0) > 0 && (
            <View style={{ marginBottom: 24, borderRadius: 16, padding: 1.5, overflow: 'hidden' }}>
              {/* Gradient border underlay */}
              <LinearGradient
                colors={[TEAL, '#0a8f83', 'rgba(13,148,136,0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 }}
              />
              <View style={{ padding: 16, borderRadius: 15, backgroundColor: '#EFF9F8' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <Ionicons name="bulb-outline" size={15} color={TEAL} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0D4E4A', letterSpacing: 0.1 }}>
                    Travel Tips
                  </Text>
                </View>
                {itinerary.tips.map((tip, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{
                      width: 5, height: 5, borderRadius: 2.5, backgroundColor: TEAL,
                      marginTop: 7.5, marginRight: 10, flexShrink: 0,
                    }} />
                    <Text style={{ flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 }}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Day-by-day itinerary ────────────────────────────────────────── */}
          {itinerary?.days?.map((day) => (
            <View
              key={day.day}
              style={{ marginBottom: 28 }}
              onLayout={(e) => {
                dayOffsets.current[day.day] = e.nativeEvent.layout.y;
                sortedDayKeysRef.current = Object.keys(dayOffsets.current).map(Number).sort((a, b) => a - b);
              }}
            >
              {/* Day header — editorial style with watermark number */}
              <View style={{ marginBottom: 16, overflow: 'hidden' }}>
                {/* Watermark number — large faded behind the label */}
                <Text style={{
                  position: 'absolute',
                  right: 0,
                  top: -14,
                  fontSize: 80,
                  fontWeight: '900',
                  color: '#F3F4F6',
                  letterSpacing: -4,
                  lineHeight: 80,
                  opacity: 0.9,
                }}>
                  {day.day}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 3, height: 32, borderRadius: 2, backgroundColor: TEAL,
                    marginRight: 12,
                    shadowColor: TEAL, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
                  }} />
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: TEAL, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 1 }}>
                      Day {day.day}
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827', letterSpacing: -0.3 }}>
                      {day.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Activities with vertical timeline */}
              {day.activities.map((activity, actIndex) => (
                <View key={activity.id} style={{ flexDirection: 'row', marginBottom: 12 }}>
                  {/* Timeline column */}
                  <View style={{ width: 24, alignItems: 'center' }}>
                    {/* Line above dot (hidden on first item) */}
                    <View style={{
                      width: 2, height: 14,
                      backgroundColor: actIndex === 0 ? 'transparent' : '#E0E0E0',
                    }} />
                    {/* Hollow dot */}
                    <View style={{
                      width: 10, height: 10, borderRadius: 5,
                      borderWidth: 2, borderColor: TEAL, backgroundColor: 'white',
                    }} />
                    {/* Line below dot (hidden on last item) */}
                    <View style={{
                      flex: 1, width: 2,
                      backgroundColor: actIndex < day.activities.length - 1 ? '#E0E0E0' : 'transparent',
                    }} />
                  </View>

                  {/* Activity card */}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <ActivityCard
                      activity={activity}
                      isSelected={selectedActivityId === activity.id}
                      onPress={() => {
                        setSelectedActivityId(activity.id);
                        if (activity.coordinates?.lat && mapRef.current) {
                          mapRef.current.animateToRegion({
                            latitude: activity.coordinates.lat,
                            longitude: activity.coordinates.lng,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                          }, 500);
                        }
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          ))}

          {/* Best time to visit note */}
          {!!itinerary?.bestTimeToVisit && (
            <View style={{ marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: '#F9FAFB' }}>
              <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 20 }}>
                <Text style={{ fontWeight: '600', color: '#374151' }}>Best time to visit: </Text>
                {itinerary.bestTimeToVisit}
              </Text>
            </View>
          )}
        </ScrollView>
      </Reanimated.View>

      {/* ── Sticky bottom CTA ─────────────────────────────────────────────── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white',
        paddingHorizontal: 20, paddingTop: 16,
        paddingBottom: Math.max(insets.bottom, 16) + 8,
        borderTopWidth: 1, borderTopColor: '#F3F4F6',
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 }, elevation: 8,
      }}>
        {/* Primary: Start Trip — gradient + glow */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/');
          }}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#0D9488', '#0a7a70']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 56, borderRadius: 28,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: TEAL, shadowOpacity: 0.55, shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 }, elevation: 8,
            }}
          >
            {/* Inner top highlight */}
            <View style={{
              position: 'absolute', top: 0, left: 20, right: 20, height: 1,
              backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 1,
            }} />
            <Text style={{ color: 'white', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 }}>Start Trip</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary row: Share + Bucket List */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingVertical: 4 }}>
          <TouchableOpacity onPress={handleShare} style={{ paddingVertical: 10, minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, color: TEAL, textDecorationLine: 'underline', fontWeight: '500' }}>
              Share Trip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleSave}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, minHeight: 44 }}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isSaved ? TEAL : '#9CA3AF'}
            />
            <Text style={{ fontSize: 14, color: isSaved ? TEAL : '#9CA3AF', fontWeight: '500' }}>
              {isSaved ? 'Saved' : 'Bucket List'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Share to Feed (only when private) */}
        {!isPublic && (
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowShareModal(true); }}
            style={{ alignItems: 'center', paddingBottom: 4, minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Share to Discovery Feed</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ShareToFeedModal */}
      {trip && (
        <ShareToFeedModal
          tripId={trip.id}
          deviceId={deviceId}
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          onShared={() => {
            setIsPublic(true);
            setShowShareModal(false);
            // Award badges for sharing
            if (deviceId) {
              checkAndAwardBadges(deviceId, { trigger: 'trip_shared' })
                .then((newBadges) => {
                  if (newBadges.length > 0) {
                    newBadgeQueueRef.current = newBadges;
                    setCelebrationBadge(newBadges[0]);
                    setCelebrationVisible(true);
                  }
                })
                .catch(() => {});
            }
          }}
        />
      )}

      {/* Badge celebration — shown after sharing to feed */}
      <BadgeCelebrationModal
        badge={celebrationBadge}
        visible={celebrationVisible}
        onDismiss={() => {
          setCelebrationVisible(false);
          const queue = newBadgeQueueRef.current;
          const nextIdx = queue.indexOf(celebrationBadge!) + 1;
          if (nextIdx < queue.length) {
            setCelebrationBadge(queue[nextIdx]);
            setCelebrationVisible(true);
          }
        }}
      />
    </View>
  );
}
