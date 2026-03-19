import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../../lib/context/LanguageContext';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { Badge, Trip } from '../../types';
import {
  getUserBadgesWithDetails,
  getDisplayBadges,
  setDisplayBadges,
  checkAndAwardBadges,
  checkAndAwardBadgesFromMap,
  TIER_COLORS,
  TIER_GLOW,
} from '../../lib/badges';
import BadgeBottomSheet from '../../components/BadgeBottomSheet';
import BadgeCelebrationModal from '../../components/BadgeCelebrationModal';
import AutoPopulateModal from '../../components/AutoPopulateModal';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { useAnimatedNumber, useAnimatedPercentage } from '../../hooks/useAnimatedNumber';
import { TAB_BAR_HEIGHT } from '../../components/AppTabBar';
import ScratchMap, { ScratchMapReadonly } from '../../components/ScratchMap';
import ScratchMapFullscreen from '../../components/ScratchMapFullscreen';
import {
  countContinents,
  calculateWorldPercentage,
  extractCountriesFromTrips,
} from '../../lib/countryUtils';

const AUTO_POPULATE_KEY = 'hasSeenMapAutopopulate';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 220; // scratch map banner height
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// ─── Country flag lookup ───────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  'norway': '🇳🇴',
  'sweden': '🇸🇪',
  'denmark': '🇩🇰',
  'finland': '🇫🇮',
  'united states': '🇺🇸',
  'usa': '🇺🇸',
  'united kingdom': '🇬🇧',
  'uk': '🇬🇧',
  'germany': '🇩🇪',
  'france': '🇫🇷',
  'spain': '🇪🇸',
  'italy': '🇮🇹',
  'portugal': '🇵🇹',
  'greece': '🇬🇷',
  'netherlands': '🇳🇱',
  'japan': '🇯🇵',
  'china': '🇨🇳',
  'south korea': '🇰🇷',
  'india': '🇮🇳',
  'thailand': '🇹🇭',
  'indonesia': '🇮🇩',
  'australia': '🇦🇺',
  'new zealand': '🇳🇿',
  'canada': '🇨🇦',
  'mexico': '🇲🇽',
  'brazil': '🇧🇷',
  'argentina': '🇦🇷',
  'south africa': '🇿🇦',
  'kenya': '🇰🇪',
  'egypt': '🇪🇬',
  'morocco': '🇲🇦',
  'singapore': '🇸🇬',
  'vietnam': '🇻🇳',
  'philippines': '🇵🇭',
};

function getCountryFlag(country: string | null | undefined): string {
  if (!country) return '🌍';
  const key = country.toLowerCase().trim();
  return COUNTRY_FLAGS[key] ?? '🌍';
}

// ─── Region gradient helper ────────────────────────────────────────────────────

function getProfileGradient(trips: Trip[]): [string, string, string] {
  if (!trips.length) return ['#0a0f1a', '#0d2137', '#0D9488'];
  const dest = (trips[0]?.itinerary?.destination ?? '').toLowerCase();
  if (/japan|china|thailand|bali|indonesia|vietnam|india|korea/.test(dest)) return ['#004d40', '#006064', '#01579b'];
  if (/france|italy|spain|greece|portugal/.test(dest)) return ['#1a237e', '#4a148c', '#880e4f'];
  if (/usa|brazil|mexico|canada/.test(dest)) return ['#bf360c', '#4e342e', '#3e2723'];
  if (/africa|kenya|morocco|egypt/.test(dest)) return ['#f57f17', '#bf360c', '#4e342e'];
  if (/australia|new zealand/.test(dest)) return ['#006064', '#01579b', '#0d47a1'];
  return ['#0a0f1a', '#0d2137', '#0D9488'];
}

// ─── Badge tier labels ─────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
};

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonBox({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  return (
    <Animated.View
      style={{
        width: width as any,
        height,
        borderRadius,
        backgroundColor: '#1a2030',
        opacity,
      }}
    />
  );
}

function ProfileSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Cover */}
      <SkeletonBox width="100%" height={COVER_HEIGHT} borderRadius={0} />
      {/* Avatar */}
      <View style={{ marginTop: -40, paddingLeft: 16 }}>
        <SkeletonBox width={80} height={80} borderRadius={40} />
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
        <SkeletonBox width={160} height={22} />
        <SkeletonBox width={100} height={14} />
        <SkeletonBox width={240} height={14} />
        <SkeletonBox width={200} height={14} />
      </View>
    </View>
  );
}

// ─── Small trip grid card ─────────────────────────────────────────────────────

interface GridTripCardProps {
  trip: Trip;
  onPress: () => void;
}

function GridTripCard({ trip, onPress }: GridTripCardProps) {
  const destination = trip.itinerary?.destination ?? trip.title ?? 'Trip';
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !destination) return;
    fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(destination)}&inputtype=textquery&fields=photos&key=${apiKey}`,
    )
      .then((r) => r.json())
      .then((json) => {
        const ref = json.candidates?.[0]?.photos?.[0]?.photo_reference;
        if (ref) {
          setPhotoUrl(
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${apiKey}`,
          );
        }
      })
      .catch(() => {});
  }, [destination]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: CARD_WIDTH,
        height: 160,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1a2030',
      }}
    >
      {photoUrl ? (
        <ExpoImage
          source={{ uri: photoUrl }}
          contentFit="cover"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : (
        <LinearGradient
          colors={['#0a0f1a', '#0d2137', '#0D9488']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Bottom info */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <Text
          numberOfLines={2}
          style={{ color: 'white', fontSize: 11, fontWeight: '700', flex: 1, marginRight: 4 }}
        >
          {destination}
        </Text>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name="heart" size={9} color="rgba(255,255,255,0.7)" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>
              {trip.like_count ?? 0}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name="bookmark" size={9} color="rgba(255,255,255,0.7)" />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>
              {trip.save_count ?? 0}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Past trip card ───────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MOOD_EMOJIS: Record<string, string> = {
  'Food lover': '🍜', 'Adventurous': '🏔️', 'Relaxing': '🏖️',
  'Cultural': '🎭', 'Budget': '💰', 'Luxury': '💎',
  'Family': '👨‍👩‍👧', 'Romantic': '💑', 'With Friends': '👥', 'Solo': '🎒',
};

function formatPastTripDate(visitedStart: string | null | undefined): string {
  if (!visitedStart) return '';
  const parts = visitedStart.split('-');
  if (parts.length >= 2) return `${MONTHS_SHORT[Number(parts[1]) - 1]} ${parts[0]}`;
  return parts[0];
}

interface PastTripCardProps {
  trip: Trip;
  onPress: () => void;
}

function PastTripCard({ trip, onPress }: PastTripCardProps) {
  const destination = trip.title ?? 'Trip';
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [photoUrl, setPhotoUrl] = useState<string | null>(trip.cover_url ?? null);

  // Fetch places photo only if no cover_url
  useEffect(() => {
    if (trip.cover_url || !apiKey || !destination) return;
    fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(destination)}&inputtype=textquery&fields=photos&key=${apiKey}`,
    )
      .then((r) => r.json())
      .then((json) => {
        const ref = json.candidates?.[0]?.photos?.[0]?.photo_reference;
        if (ref) setPhotoUrl(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${apiKey}`);
      })
      .catch(() => {});
  }, [destination, trip.cover_url]);

  const moodEmojis = (trip.mood_tags ?? []).slice(0, 4).map((t) => MOOD_EMOJIS[t] ?? '').join(' ');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ width: CARD_WIDTH, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a2030' }}
    >
      <View style={{ height: 150 }}>
        {photoUrl ? (
          <ExpoImage source={{ uri: photoUrl }} contentFit="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        ) : (
          <LinearGradient colors={['#004d40', '#006064', '#01579b']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

        {/* Been Here badge */}
        <View
          style={{
            position: 'absolute', top: 7, right: 7,
            flexDirection: 'row', alignItems: 'center', gap: 3,
            backgroundColor: 'rgba(34,197,94,0.9)',
            borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3,
          }}
        >
          <Ionicons name="checkmark-circle" size={9} color="white" />
          <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>Been Here</Text>
        </View>

        {/* Star rating */}
        {(trip.rating ?? 0) > 0 && (
          <View style={{ position: 'absolute', top: 7, left: 7, flexDirection: 'row', gap: 1 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons key={n} name={n <= (trip.rating ?? 0) ? 'star' : 'star-outline'} size={9} color={n <= (trip.rating ?? 0) ? '#f59e0b' : 'rgba(255,255,255,0.4)'} />
            ))}
          </View>
        )}

        {/* Bottom info */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 }}>
          <Text numberOfLines={1} style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{destination}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>{formatPastTripDate(trip.visited_start)}</Text>
            {moodEmojis ? <Text style={{ fontSize: 10 }}>{moodEmojis}</Text> : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main profile screen ──────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, username: authUsername } = useAuth();
  const { t, interpolate } = useLanguage();

  // Profile data
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pastTrips, setPastTrips] = useState<Trip[]>([]);
  const [savedTripIds, setSavedTripIds] = useState<string[]>([]);
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'trips' | 'been' | 'bucket' | 'badges'>('trips');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'saves'>('newest');
  const { count: unreadCount } = useUnreadNotifications();

  // Avatar image error fallback
  const [avatarError, setAvatarError] = useState(false);

  // Scratch map
  const [visitedCodes, setVisitedCodes] = useState<string[]>([]);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  // Animated stats (must be declared before conditional returns)
  const animCountries = useAnimatedNumber(visitedCodes.length, 600);
  const animContinents = useAnimatedNumber(countContinents(visitedCodes), 600);
  const animWorldPct = useAnimatedPercentage(calculateWorldPercentage(visitedCodes), 600);

  // Auto-populate modal
  const [autoPopulateCodes, setAutoPopulateCodes] = useState<string[]>([]);
  const [autoPopulateVisible, setAutoPopulateVisible] = useState(false);

  // Badge celebration (from map taps)
  const [celebrationBadge, setCelebrationBadge] = useState<Badge | null>(null);
  const [celebrationBadgeQueue, setCelebrationBadgeQueue] = useState<Badge[]>([]);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  // Inline error toast for failed saves
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);
  const saveErrorAnim = useRef(new Animated.Value(0)).current;

  // Badge state
  const [displayBadges, setDisplayBadgesState] = useState<(Badge & { earned_at?: string })[]>([]);
  const [allEarnedBadges, setAllEarnedBadges] = useState<(Badge & { earned_at?: string })[]>([]);
  const [badgeSheetBadge, setBadgeSheetBadge] = useState<(Badge & { earned_at?: string }) | null>(null);
  const [badgeSheetVisible, setBadgeSheetVisible] = useState(false);
  const [editBadgesVisible, setEditBadgesVisible] = useState(false);
  const [editSelectedSlugs, setEditSelectedSlugs] = useState<string[]>([]);
  const [savingDisplayBadges, setSavingDisplayBadges] = useState(false);

  // ── Error toast ───────────────────────────────────────────────────────────────
  const showSaveError = useCallback(() => {
    setSaveErrorVisible(true);
    saveErrorAnim.setValue(0);
    Animated.sequence([
      Animated.timing(saveErrorAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(saveErrorAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setSaveErrorVisible(false));
  }, [saveErrorAnim]);

  // ── Badge celebration queue ───────────────────────────────────────────────────
  // When multiple badges are earned at once, show them one after another
  const showNextBadge = useCallback((queue: Badge[]) => {
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    setCelebrationBadge(next);
    setCelebrationBadgeQueue(rest);
    setCelebrationVisible(true);
  }, []);

  const handleCelebrationDismiss = useCallback(() => {
    setCelebrationVisible(false);
    setTimeout(() => {
      if (celebrationBadgeQueue.length > 0) {
        showNextBadge(celebrationBadgeQueue);
      } else {
        setCelebrationBadge(null);
      }
    }, 350);
  }, [celebrationBadgeQueue, showNextBadge]);

  // Determine if viewing own profile.
  // Primary check: Supabase Auth user_id matches.
  // Fallback: device_id matches (covers expired sessions or pre-auth profiles).
  const isOwnProfile =
    (isAuthenticated && profile !== null && user !== null && profile.user_id === user.id) ||
    (profile !== null && !!deviceId && profile.device_id === deviceId) ||
    (isAuthenticated && !!authUsername && authUsername === username);

  // Member since formatting
  function formatMemberSince(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Country count (rough estimate from trip destinations)
  function countUniqueCountries(tripsArr: Trip[]): number {
    const seen = new Set<string>();
    tripsArr.forEach((t) => {
      const dest = (t.itinerary?.destination ?? t.title ?? '').toLowerCase().trim();
      if (dest) seen.add(dest);
    });
    return seen.size;
  }

  // Total saves across all trips
  function totalSaves(tripsArr: Trip[]): number {
    return tripsArr.reduce((acc, t) => acc + (t.save_count ?? 0), 0);
  }



  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  useEffect(() => {
    if (!username) return;
    setAvatarError(false);
    loadProfile();
  }, [username, deviceId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const [profileRes, tripsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('username', username).maybeSingle(),
        supabase
          .from('trips')
          .select('*')
          .eq('username', username)
          .eq('is_public', true)
          .order('created_at', { ascending: false }),
      ]);

      setProfile(profileRes.data ?? null);
      const fetchedTrips = (tripsRes.data ?? []) as Trip[];
      setTrips(fetchedTrips);

      // Load visited countries from profile
      const profileVisited = (profileRes.data?.visited_countries as string[]) ?? [];
      setVisitedCodes(profileVisited);

      // ── Auto-populate from trips (own profile, first time only) ──────────────
      const ownProfile =
        (isAuthenticated && user !== null && profileRes.data?.user_id === user.id) ||
        (!!deviceId && profileRes.data?.device_id === deviceId) ||
        (isAuthenticated && !!authUsername && authUsername === username);

      // Backfill user_id if missing (covers profiles created before account linking)
      if (ownProfile && isAuthenticated && user && profileRes.data && !profileRes.data.user_id && deviceId) {
        supabase.from('profiles').update({ user_id: user.id }).eq('device_id', deviceId).then(() => {});
      }

      if (ownProfile && profileVisited.length === 0 && fetchedTrips.length > 0) {
        try {
          const seen = await AsyncStorage.getItem(AUTO_POPULATE_KEY);
          if (!seen) {
            const detectedCodes = extractCountriesFromTrips(fetchedTrips);
            if (detectedCodes.length > 0) {
              setAutoPopulateCodes(detectedCodes);
              setAutoPopulateVisible(true);
            }
          }
        } catch { /* AsyncStorage failure is non-fatal */ }
      }

      // Load past trips (own profile sees all; others see only public)
      if (deviceId) {
        const pastQ = supabase
          .from('trips')
          .select('*')
          .eq('is_past_trip', true)
          .eq('device_id', deviceId)
          .order('created_at', { ascending: false });
        const { data: pastData } = await pastQ;
        setPastTrips((pastData ?? []) as Trip[]);
      }

      // Load saved trips only if own profile
      if (deviceId) {
        const savesRes = await supabase
          .from('trip_saves')
          .select('trip_id')
          .eq('device_id', deviceId);

        const ids = (savesRes.data ?? []).map((s: any) => s.trip_id as string);
        setSavedTripIds(ids);

        if (ids.length > 0) {
          const savedTripsRes = await supabase
            .from('trips')
            .select('*')
            .in('id', ids)
            .order('created_at', { ascending: false });
          setSavedTrips((savedTripsRes.data ?? []) as Trip[]);
        }
      }

      // Load badges
      if (ownProfile && deviceId) {
        try {
          // Backfill any badges the user should have earned from past trips
          await checkAndAwardBadges(deviceId, { trigger: 'app_launch', userId: user?.id ?? null });

          const earned = await getUserBadgesWithDetails(deviceId);
          setAllEarnedBadges(earned);
          const displaySlugs = await getDisplayBadges(deviceId);
          if (displaySlugs.length > 0) {
            const filtered = displaySlugs
              .map((s) => earned.find((b) => b.slug === s))
              .filter(Boolean) as (Badge & { earned_at: string })[];
            setDisplayBadgesState(filtered.length > 0 ? filtered : earned.slice(0, 6));
          } else {
            setDisplayBadgesState(earned.slice(0, 6));
          }
        } catch { /* ignore */ }
      } else if (profileRes.data?.display_badges?.length > 0) {
        // Other profile — fetch badge details for their display slugs
        try {
          const slugs: string[] = profileRes.data.display_badges;
          const { data: badgeData } = await supabase.from('badges').select('*').in('slug', slugs);
          setDisplayBadgesState((badgeData ?? []) as Badge[]);
        } catch { /* ignore */ }
      }
    } catch {
      // graceful — leave null state
    } finally {
      setLoading(false);
    }
  }

  // ── Scratch map toggle ────────────────────────────────────────────────────────
  const handleToggleCountry = useCallback(
    async (isoCode: string, nowVisited: boolean) => {
      if (!profile?.id) return;

      // 1. Optimistic update
      let updatedCodes: string[];
      setVisitedCodes((prev) => {
        updatedCodes = nowVisited
          ? [...new Set([...prev, isoCode])]
          : prev.filter((c) => c !== isoCode);
        return updatedCodes!;
      });

      // Give React a tick to capture the updated state before the async work
      await new Promise<void>((r) => setTimeout(r, 0));

      try {
        // 2. Persist to Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ visited_countries: updatedCodes! })
          .eq('id', profile.id);

        if (error) throw error;

        // 3. Check badges only when marking as visited
        if (nowVisited && deviceId) {
          const newBadges = await checkAndAwardBadgesFromMap(
            deviceId,
            updatedCodes!,
            user?.id,
          );
          if (newBadges.length > 0) {
            showNextBadge(newBadges);
          }
        }
      } catch {
        // 4. Revert optimistic update & show error toast
        setVisitedCodes((prev) =>
          nowVisited ? prev.filter((c) => c !== isoCode) : [...new Set([...prev, isoCode])],
        );
        showSaveError();
      }
    },
    [profile?.id, deviceId, user?.id, showNextBadge, showSaveError],
  );

  // ── Remove all visited countries ─────────────────────────────────────────────
  const handleRemoveAll = useCallback(async () => {
    if (!profile?.id) return;
    const prev = visitedCodes;
    setVisitedCodes([]);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ visited_countries: [] })
        .eq('id', profile.id);
      if (error) throw error;
    } catch {
      setVisitedCodes(prev);
      showSaveError();
    }
  }, [profile?.id, visitedCodes, showSaveError]);

  // ── Auto-populate confirm ─────────────────────────────────────────────────────
  const handleAutoPopulateConfirm = useCallback(async () => {
    setAutoPopulateVisible(false);
    await AsyncStorage.setItem(AUTO_POPULATE_KEY, 'true');

    if (!profile?.id || autoPopulateCodes.length === 0) return;

    // Merge with any manually-added codes already present
    const merged = [...new Set([...visitedCodes, ...autoPopulateCodes])];
    setVisitedCodes(merged);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ visited_countries: merged })
        .eq('id', profile.id);

      if (error) throw error;

      // Run badge check for all auto-populated countries
      if (deviceId) {
        const newBadges = await checkAndAwardBadgesFromMap(deviceId, merged, user?.id);
        if (newBadges.length > 0) showNextBadge(newBadges);
      }
    } catch {
      // Revert silently if Supabase fails
      setVisitedCodes(visitedCodes);
      showSaveError();
    }
  }, [profile?.id, autoPopulateCodes, visitedCodes, deviceId, user?.id, showNextBadge, showSaveError]);

  const handleAutoPopulateDismiss = useCallback(async () => {
    setAutoPopulateVisible(false);
    await AsyncStorage.setItem(AUTO_POPULATE_KEY, 'true').catch(() => {});
  }, []);

  const displayName = profile?.display_name ?? profile?.username ?? username ?? 'Traveler';
  const bio = profile?.bio ?? null;
  const homeCountry = profile?.home_country ?? null;
  const avatarEmoji = profile?.avatar_emoji ?? '🌍';
  const avatarUrl = profile?.avatar_url ?? null;
  const coverPhotoUrl = profile?.cover_photo_url ?? null;
  const createdAt = profile?.created_at ?? null;
  const countryFlag = getCountryFlag(homeCountry);
  const gradientColors = getProfileGradient(trips);

  const uniqueCountries = countUniqueCountries(trips);

  function applySort(arr: Trip[]): Trip[] {
    if (sortOrder === 'oldest') return [...arr].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortOrder === 'saves')  return [...arr].sort((a, b) => (b.save_count ?? 0) - (a.save_count ?? 0));
    return [...arr].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // newest
  }

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = q
      ? trips.filter((t) => {
          const title = (t.title ?? '').toLowerCase();
          const dest  = (t.itinerary?.destination ?? '').toLowerCase();
          return title.includes(q) || dest.includes(q);
        })
      : trips;
    return applySort(matched);
  }, [trips, searchQuery, sortOrder]);

  const filteredPastTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = q
      ? pastTrips.filter((t) => (t.title ?? '').toLowerCase().includes(q))
      : pastTrips;
    return applySort(matched);
  }, [pastTrips, searchQuery, sortOrder]);

  if (loading) return <ProfileSkeleton />;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── SCRATCH MAP BANNER ── */}
        <View style={{ height: COVER_HEIGHT, position: 'relative' }}>
          {/* Interactive scratch map fills the banner */}
          {isOwnProfile ? (
            <ScratchMap
              visitedCodes={visitedCodes}
              onToggleCountry={handleToggleCountry}
              interactive
              width={SCREEN_WIDTH}
              height={COVER_HEIGHT}
            />
          ) : (
            <View>
              <ScratchMapReadonly
                visitedCodes={visitedCodes}
                width={SCREEN_WIDTH}
                height={COVER_HEIGHT}
              />
              {/* Read-only label top-left */}
              <View
                style={{
                  position: 'absolute',
                  top: insets.top + 10,
                  left: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.6)" />
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                  {interpolate(t.profile.travelMap, { name: displayName })}
                </Text>
              </View>
              {/* Expand button for other profile too */}
              <TouchableOpacity
                onPress={() => setMapFullscreen(true)}
                style={{
                  position: 'absolute',
                  top: insets.top + 10,
                  right: 8,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.15)',
                }}
              >
                <Ionicons name="expand-outline" size={14} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* "Tap to mark visited" hint — own profile */}
          {isOwnProfile && visitedCodes.length === 0 && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: insets.top + 10,
                left: 0,
                right: 0,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Ionicons name="pencil-outline" size={10} color="rgba(255,255,255,0.55)" />
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
                  {t.profile.tapToMark}
                </Text>
              </View>
            </View>
          )}

          {/* Dark bottom gradient so avatar blends in */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            locations={[0.5, 1]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }}
            pointerEvents="none"
          />

          {/* Back button */}
          {router.canGoBack() && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                position: 'absolute',
                top: insets.top + 10,
                left: 16,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <Ionicons name="chevron-back" size={22} color="white" />
            </TouchableOpacity>
          )}

          {/* Top-right action row (notification + expand + edit/follow) */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + 10,
              right: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              zIndex: 10,
            }}
          >
            {/* Expand map button */}
            <TouchableOpacity
              onPress={() => setMapFullscreen(true)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="expand-outline" size={15} color="white" />
            </TouchableOpacity>

            {/* Notification bell — own profile only */}
            {isOwnProfile && (
              <TouchableOpacity
                onPress={() => router.push('/notifications' as any)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="notifications-outline" size={17} color="white" />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#ef4444',
                    }}
                  />
                )}
              </TouchableOpacity>
            )}

            {/* Edit / Follow button */}
            {isOwnProfile ? (
              <TouchableOpacity
                onPress={() => router.push('/profile/edit' as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  borderRadius: 18,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Ionicons name="pencil-outline" size={13} color="white" />
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{t.profile.edit}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => Alert.alert('Coming Soon', 'Follow feature is coming in a future update.')}
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.5)',
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{t.profile.follow}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* AVATAR — absolute, overlapping the cover bottom */}
          <View
            style={{
              position: 'absolute',
              bottom: -40,
              left: 16,
              width: 80,
              height: 80,
              borderRadius: 40,
              borderWidth: 3,
              borderColor: TEAL,
              backgroundColor: '#0d1a2a',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {avatarUrl && !avatarError ? (
              <ExpoImage
                source={{ uri: avatarUrl }}
                contentFit="cover"
                style={{ width: '100%', height: '100%' }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <Text style={{ fontSize: 36 }}>{avatarEmoji}</Text>
            )}
          </View>

          {/* Country flag badge on avatar */}
          <View
            style={{
              position: 'absolute',
              bottom: -40 + 60,
              left: 16 + 60,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: '#0a0a1a',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: '#0D9488',
            }}
          >
            <Text style={{ fontSize: 11 }}>{countryFlag}</Text>
          </View>
        </View>

        {/* ── COMPACT STATS STRIP — sits to the right of the avatar overlap ── */}
        <View
          style={{
            flexDirection: 'row',
            paddingLeft: 110,
            paddingRight: 20,
            height: 46,
            alignItems: 'center',
          }}
        >
          {[
            { value: String(animCountries), label: t.profile.countries },
            { value: String(animContinents), label: t.profile.continents },
            { value: `${animWorldPct}%`, label: t.profile.ofWorld },
          ].map((stat, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                borderRightWidth: i < 2 ? 1 : 0,
                borderRightColor: 'rgba(255,255,255,0.07)',
              }}
            >
              <Text style={{ color: TEAL, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
                {stat.value}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── PROFILE INFO ── */}
        <View style={{ paddingTop: 4, paddingHorizontal: 16 }}>
          {/* Display name */}
          <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>
            {displayName}
          </Text>

          {/* Username + badge icons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
              @{profile?.username ?? username}
            </Text>
            {displayBadges.slice(0, 3).map((b) => (
              <TouchableOpacity
                key={b.slug}
                onPress={() => { setBadgeSheetBadge(b); setBadgeSheetVisible(true); }}
                style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: `${TIER_COLORS[b.tier] ?? TEAL}22`,
                  borderWidth: 1, borderColor: `${TIER_COLORS[b.tier] ?? TEAL}50`,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 11 }}>{b.icon}</Text>
              </TouchableOpacity>
            ))}
            {isOwnProfile && (
              <TouchableOpacity
                onPress={() => { setEditSelectedSlugs(displayBadges.map((b) => b.slug)); setEditBadgesVisible(true); }}
              >
                <Ionicons name="pencil-outline" size={13} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bio */}
          {bio ? (
            <Text
              numberOfLines={2}
              style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 19, marginTop: 8 }}
            >
              {bio}
            </Text>
          ) : null}

          {/* Home country + member since on one line */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
            {homeCountry && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12 }}>{countryFlag}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{homeCountry}</Text>
              </View>
            )}
            {createdAt && (
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                {interpolate(t.profile.since, { date: formatMemberSince(createdAt) })}
              </Text>
            )}
          </View>
        </View>


        {/* ── TRIP STATS ROW ── */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            marginTop: 10,
            marginHorizontal: 16,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 14,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.07)',
          }}
        >
          {[
            { value: trips.length, label: t.profile.trips },
            { value: uniqueCountries, label: t.profile.destinations },
            { value: totalSaves(trips), label: t.profile.saves },
          ].map((stat, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>
                {stat.value}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>


        {/* ── TRIP TABS ── */}
        <View style={{ marginTop: 24 }}>
          {/* Tab bar */}
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.08)',
              marginHorizontal: 16,
            }}
          >
            {(
              [
                { key: 'trips', label: t.profile.tabTrips },
                { key: 'been', label: t.profile.tabBeen },
                { key: 'bucket', label: t.profile.tabBucket },
                { key: 'badges', label: t.profile.tabBadges },
              ] as const
            ).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => { setSelectedTab(tab.key); setSearchQuery(''); }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingBottom: 10,
                  paddingTop: 4,
                  borderBottomWidth: 2,
                  borderBottomColor: selectedTab === tab.key ? TEAL : 'transparent',
                  marginBottom: -1,
                }}
              >
                <Text
                  style={{
                    color: selectedTab === tab.key ? 'white' : 'rgba(255,255,255,0.4)',
                    fontSize: 13,
                    fontWeight: selectedTab === tab.key ? '700' : '400',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <View style={{ marginTop: 16 }}>
            {/* MY TRIPS */}
            {selectedTab === 'trips' && (
              trips.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 }}>
                  <Ionicons name="map-outline" size={36} color="rgba(255,255,255,0.2)" />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
                    {t.profile.noPublicTrips}
                  </Text>
                </View>
              ) : (
                <View>
                  {/* ── Search bar ── */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    marginHorizontal: 16, marginBottom: 10,
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderRadius: 12, borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 12, height: 42,
                  }}>
                    <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" />
                    <TextInput
                      style={{ flex: 1, color: 'white', fontSize: 14 }}
                      placeholder="Search trips…"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={searchQuery}
                      onChangeText={(q) => { setSearchQuery(q); }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* ── Sort chips ── */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
                  >
                    {([
                      { key: 'newest', label: 'Newest' },
                      { key: 'oldest', label: 'Oldest' },
                      { key: 'saves',  label: 'Most Saved' },
                    ] as const).map((s) => (
                      <TouchableOpacity
                        key={s.key}
                        onPress={() => setSortOrder(s.key)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: sortOrder === s.key ? TEAL : 'rgba(255,255,255,0.07)',
                          borderWidth: 1,
                          borderColor: sortOrder === s.key ? TEAL : 'rgba(255,255,255,0.12)',
                        }}
                      >
                        <Text style={{
                          fontSize: 13, fontWeight: sortOrder === s.key ? '600' : '400',
                          color: sortOrder === s.key ? 'white' : 'rgba(255,255,255,0.5)',
                        }}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* ── Grid or empty-search state ── */}
                  {filteredTrips.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 }}>
                      <Ionicons name="search-outline" size={28} color="rgba(255,255,255,0.2)" />
                      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 10, textAlign: 'center' }}>
                        No trips match "{searchQuery}"
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 16 }}>
                      {filteredTrips.map((trip) => (
                        <GridTripCard
                          key={trip.id}
                          trip={trip}
                          onPress={() =>
                            router.push({
                              pathname: '/trip/[slug]',
                              params: { slug: trip.share_slug ?? trip.id },
                            })
                          }
                        />
                      ))}
                    </View>
                  )}
                </View>
              )
            )}

            {/* BEEN THERE */}
            {selectedTab === 'been' && (
              !isOwnProfile ? (
                <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 }}>
                  <Ionicons name="lock-closed-outline" size={28} color="rgba(255,255,255,0.3)" />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
                    {t.profile.pastTripsPrivate}
                  </Text>
                </View>
              ) : pastTrips.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 }}>
                  <Ionicons name="airplane-outline" size={36} color="rgba(255,255,255,0.2)" />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
                    {t.profile.logAdventures}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/past-trip/destination' as any)}
                    style={{
                      marginTop: 16, backgroundColor: TEAL,
                      borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>
                      {t.profile.addPastTrip}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {/* ── Search bar ── */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    marginHorizontal: 16, marginBottom: 12,
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderRadius: 12, borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 12, height: 42,
                  }}>
                    <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" />
                    <TextInput
                      style={{ flex: 1, color: 'white', fontSize: 14 }}
                      placeholder="Search past trips…"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {filteredPastTrips.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 }}>
                      <Ionicons name="search-outline" size={28} color="rgba(255,255,255,0.2)" />
                      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginTop: 10, textAlign: 'center' }}>
                        No past trips match "{searchQuery}"
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 16 }}>
                      {filteredPastTrips.map((trip) => (
                        <PastTripCard
                          key={trip.id}
                          trip={trip}
                          onPress={() =>
                            router.push({
                              pathname: '/profile/past-trip/[id]',
                              params: { id: trip.id },
                            } as any)
                          }
                        />
                      ))}
                    </View>
                  )}
                </View>
              )
            )}

            {/* BADGES */}
            {selectedTab === 'badges' && (
              <View>
                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {allEarnedBadges.length > 0 ? `${allEarnedBadges.length} earned` : 'No badges yet'}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/badges' as any)}>
                    <Text style={{ color: TEAL, fontSize: 13 }}>View all →</Text>
                  </TouchableOpacity>
                </View>
                {displayBadges.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Text style={{ fontSize: 32, marginBottom: 10 }}>🎖️</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' }}>
                      {isOwnProfile ? 'Create trips to earn your first badge' : 'No badges displayed yet'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {displayBadges.slice(0, 3).map((badge) => {
                      const tierColor = TIER_COLORS[badge.tier] ?? TEAL;
                      return (
                        <TouchableOpacity
                          key={badge.slug}
                          activeOpacity={0.8}
                          onPress={() => { setBadgeSheetBadge(badge); setBadgeSheetVisible(true); }}
                          style={{
                            flex: 1, alignItems: 'center', paddingVertical: 16,
                            borderRadius: 14,
                            backgroundColor: `${tierColor}12`,
                            borderWidth: 1.5,
                            borderColor: `${tierColor}40`,
                          }}
                        >
                          <Text style={{ fontSize: 32 }}>{badge.icon}</Text>
                          <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 8, textAlign: 'center', fontWeight: '600' }}>
                            {badge.name}
                          </Text>
                          <Text style={{ color: tierColor, fontSize: 10, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' }}>
                            {TIER_LABELS[badge.tier] ?? badge.tier}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {isOwnProfile && (
                  <TouchableOpacity
                    onPress={() => { setEditSelectedSlugs(displayBadges.map((b) => b.slug)); setEditBadgesVisible(true); }}
                    style={{
                      marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      paddingVertical: 12, borderRadius: 12,
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.4)" />
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Edit displayed badges</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* BUCKETLIST */}
            {selectedTab === 'bucket' && (
              !isOwnProfile ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="lock-closed-outline" size={28} color="rgba(255,255,255,0.3)" />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 14,
                      textAlign: 'center',
                      marginTop: 10,
                    }}
                  >
                    This list is private
                  </Text>
                </View>
              ) : savedTrips.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ fontSize: 32, marginBottom: 10 }}>🔖</Text>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 14,
                      textAlign: 'center',
                    }}
                  >
                    Save trips from the Discover feed
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                  {savedTrips.map((trip) => (
                    <GridTripCard
                      key={trip.id}
                      trip={trip}
                      onPress={() =>
                        router.push({
                          pathname: '/trip/[slug]',
                          params: { slug: trip.share_slug ?? trip.id },
                        })
                      }
                    />
                  ))}
                </View>
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB — Add past trip (own profile, Been There tab) */}
      {isOwnProfile && selectedTab === 'been' && pastTrips.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/past-trip/destination' as any)}
          activeOpacity={0.9}
          style={{
            position: 'absolute',
            bottom: insets.bottom + TAB_BAR_HEIGHT + 20,
            right: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: TEAL,
            borderRadius: 28,
            paddingHorizontal: 18,
            paddingVertical: 14,
            shadowColor: TEAL,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>Add trip</Text>
        </TouchableOpacity>
      )}

      {/* Badge detail sheet */}
      <BadgeBottomSheet
        badge={badgeSheetBadge}
        visible={badgeSheetVisible}
        earned={true}
        onClose={() => setBadgeSheetVisible(false)}
      />

      {/* Edit display badges modal */}
      <Modal
        visible={editBadgesVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setEditBadgesVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#111827',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: insets.bottom + 24,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
            maxHeight: '85%',
          }}>
            {/* Top highlight */}
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 }}>
              <View>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '800' }}>Display Badges</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>
                  Select up to 6 · {editSelectedSlugs.length}/6 chosen
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditBadgesVisible(false)}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 20, marginBottom: 16 }} />

            {allEarnedBadges.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 32 }}>🎖️</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                  Earn badges by creating trips{'\n'}and exploring the world!
                </Text>
              </View>
            ) : (
              <FlatList
                data={allEarnedBadges}
                keyExtractor={(b) => b.slug}
                numColumns={4}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                columnWrapperStyle={{ gap: 12 }}
                renderItem={({ item: b }) => {
                  const tierColor = TIER_COLORS[b.tier] ?? TEAL;
                  const isSelected = editSelectedSlugs.includes(b.slug);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setEditSelectedSlugs((prev) => {
                          if (prev.includes(b.slug)) return prev.filter((s) => s !== b.slug);
                          if (prev.length >= 6) return prev;
                          return [...prev, b.slug];
                        });
                      }}
                      style={{
                        flex: 1, alignItems: 'center', paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: isSelected ? `${tierColor}18` : 'rgba(255,255,255,0.04)',
                        borderWidth: 1.5,
                        borderColor: isSelected ? tierColor : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{b.icon}</Text>
                      <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 5, textAlign: 'center' }}>
                        {b.name}
                      </Text>
                      {isSelected && (
                        <View style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 14, height: 14, borderRadius: 7,
                          backgroundColor: tierColor,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Ionicons name="checkmark" size={9} color="white" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Save button */}
            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={savingDisplayBadges}
                onPress={async () => {
                  setSavingDisplayBadges(true);
                  try {
                    await setDisplayBadges(deviceId, editSelectedSlugs);
                    const filtered = editSelectedSlugs
                      .map((s) => allEarnedBadges.find((b) => b.slug === s))
                      .filter(Boolean) as (Badge & { earned_at: string })[];
                    setDisplayBadgesState(filtered);
                    setEditBadgesVisible(false);
                  } catch { /* ignore */ } finally {
                    setSavingDisplayBadges(false);
                  }
                }}
                style={{
                  backgroundColor: TEAL,
                  borderRadius: 16, paddingVertical: 14,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: savingDisplayBadges ? 0.6 : 1,
                }}
              >
                <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>
                  {savingDisplayBadges ? 'Saving…' : 'Save Selection'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scratch map fullscreen */}
      <ScratchMapFullscreen
        visible={mapFullscreen}
        onClose={() => setMapFullscreen(false)}
        visitedCodes={visitedCodes}
        onToggleCountry={isOwnProfile ? handleToggleCountry : undefined}
        onRemoveAll={isOwnProfile ? handleRemoveAll : undefined}
        interactive={isOwnProfile}
        ownerName={isOwnProfile ? undefined : displayName}
      />

      {/* Auto-populate modal */}
      <AutoPopulateModal
        visible={autoPopulateVisible}
        countryCodes={autoPopulateCodes}
        onConfirm={handleAutoPopulateConfirm}
        onDismiss={handleAutoPopulateDismiss}
      />

      {/* Badge celebration modal */}
      <BadgeCelebrationModal
        badge={celebrationBadge}
        visible={celebrationVisible}
        onDismiss={handleCelebrationDismiss}
      />

      {/* Save error toast */}
      {saveErrorVisible && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + 56,
            left: 16,
            right: 16,
            opacity: saveErrorAnim,
            transform: [
              {
                translateY: saveErrorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
            zIndex: 100,
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.92)',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="alert-circle" size={16} color="white" />
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600', flex: 1 }}>
              Failed to save — please try again
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
