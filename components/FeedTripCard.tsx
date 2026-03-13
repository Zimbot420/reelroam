import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trip } from '../types';
import {
  likeTrip, unlikeTrip, hasLikedTrip,
  saveTrip, unsaveTrip, hasSavedTrip,
} from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#0D9488';

// Region-based gradient fallbacks
const REGION_GRADIENTS: Record<string, [string, string, string]> = {
  europe:   ['#1a237e', '#4a148c', '#880e4f'],
  asia:     ['#004d40', '#006064', '#01579b'],
  americas: ['#bf360c', '#4e342e', '#3e2723'],
  africa:   ['#f57f17', '#bf360c', '#4e342e'],
  oceania:  ['#006064', '#01579b', '#0d47a1'],
  default:  ['#0a0a1a', '#0d2137', '#0D9488'],
};

function getRegionGradient(destination: string): [string, string, string] {
  const d = destination.toLowerCase();
  if (/japan|china|thailand|bali|indonesia|vietnam|india|korea|kyoto|bangkok|tokyo/.test(d)) return REGION_GRADIENTS.asia;
  if (/france|italy|spain|greece|portugal|netherlands|amsterdam|paris|barcelona|santorini|amalfi|lisbon/.test(d)) return REGION_GRADIENTS.europe;
  if (/usa|new york|brazil|mexico|rio|canada|peru|colombia/.test(d)) return REGION_GRADIENTS.americas;
  if (/africa|kenya|safari|cape town|morocco|marrakech|egypt/.test(d)) return REGION_GRADIENTS.africa;
  if (/australia|sydney|new zealand|oceania/.test(d)) return REGION_GRADIENTS.oceania;
  return REGION_GRADIENTS.default;
}

// Activity type pills config
const TYPE_PILLS: { type: string; emoji: string; label: string }[] = [
  { type: 'food',          emoji: '🍽️', label: 'Food' },
  { type: 'activity',      emoji: '🎯', label: 'Activities' },
  { type: 'accommodation', emoji: '🏨', label: 'Hotels' },
  { type: 'transport',     emoji: '🚗', label: 'Transport' },
];

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

export function FeedTripCardSkeleton({ height }: { height: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  return (
    <Animated.View
      style={{
        width: '100%',
        height,
        backgroundColor: '#1a1a2e',
        opacity,
      }}
    />
  );
}

// ─── Photo fetching ───────────────────────────────────────────────────────────

async function fetchLocationPhotos(locationName: string, apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(locationName)}&inputtype=textquery&fields=photos&key=${apiKey}`,
    );
    const json = await res.json();
    const photos: any[] = json.candidates?.[0]?.photos ?? [];
    // Sort by width descending — highest resolution first
    const sorted = [...photos].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    return sorted.slice(0, 3).map((p: any) =>
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&maxheight=1600&photo_reference=${p.photo_reference}&key=${apiKey}`,
    );
  } catch {
    return [];
  }
}

async function fetchTripPhotos(trip: Trip): Promise<string[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  // Destination first for the hero shot, then individual locations for variety
  const names: string[] = [];
  const destination = trip.itinerary?.destination ?? trip.title ?? '';
  if (destination) names.push(destination);
  (trip.locations ?? []).slice(0, 4).forEach((loc) => {
    if (loc.name && !names.includes(loc.name)) names.push(loc.name);
  });

  const all: string[] = [];
  for (const name of names) {
    if (all.length >= 12) break;
    const photos = await fetchLocationPhotos(name, apiKey);
    all.push(...photos);
  }
  return all.slice(0, 12);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FeedTripCardProps {
  trip: Trip;
  deviceId: string;
  cardHeight: number;
  isActive: boolean;
  onPress: () => void;
}

export default function FeedTripCard({ trip, deviceId, cardHeight, isActive, onPress }: FeedTripCardProps) {
  const insets = useSafeAreaInsets();
  const itinerary = trip.itinerary;
  const destination = itinerary?.destination ?? trip.title ?? 'Unknown destination';
  const totalDays = itinerary?.totalDays ?? 0;

  const [photos, setPhotos] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [slideshowIcon, setSlideshowIcon] = useState<'pause' | 'play' | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(trip.like_count ?? 0);
  const [saveCount, setSaveCount] = useState(trip.save_count ?? 0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const iconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchTripPhotos(trip).then(setPhotos);
    hasLikedTrip(trip.id, deviceId).then(setLiked);
    hasSavedTrip(trip.id, deviceId).then(setSaved);
  }, [trip.id]);

  // Auto-playing slideshow — only runs when this card is visible on screen
  useEffect(() => {
    if (!isActive || paused || photos.length <= 1) return;
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [isActive, paused, photos.length]);

  // Prefetch the next image while the current one is showing
  useEffect(() => {
    if (photos.length <= 1) return;
    const next = (currentIndex + 1) % photos.length;
    Image.prefetch(photos[next]).catch(() => {});
  }, [currentIndex, photos]);

  function flashIcon(type: 'pause' | 'play') {
    setSlideshowIcon(type);
    iconAnim.stopAnimation();
    iconAnim.setValue(1);
    Animated.timing(iconAnim, { toValue: 0, duration: 700, delay: 500, useNativeDriver: true })
      .start(() => setSlideshowIcon(null));
  }

  function handlePhotoTap() {
    if (photos.length <= 1) return;
    if (paused) { setPaused(false); flashIcon('play'); }
    else { setPaused(true); flashIcon('pause'); }
  }

  async function handleLike() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    if (liked) {
      setLiked(false);
      setLikeCount((n) => Math.max(0, n - 1));
      try { await unlikeTrip(trip.id, deviceId); } catch { setLiked(true); setLikeCount((n) => n + 1); }
    } else {
      setLiked(true);
      setLikeCount((n) => n + 1);
      try { await likeTrip(trip.id, deviceId); } catch { setLiked(false); setLikeCount((n) => Math.max(0, n - 1)); }
    }
  }

  async function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(bookmarkScale, { toValue: 1.3, useNativeDriver: true, speed: 40 }),
      Animated.spring(bookmarkScale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    if (saved) {
      setSaved(false);
      setSaveCount((n) => Math.max(0, n - 1));
      try { await unsaveTrip(trip.id, deviceId); } catch { setSaved(true); setSaveCount((n) => n + 1); }
    } else {
      setSaved(true);
      setSaveCount((n) => n + 1);
      try { await saveTrip(trip.id, deviceId); } catch { setSaved(false); setSaveCount((n) => Math.max(0, n - 1)); }
    }
  }

  async function handleShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this trip: ${itinerary?.title ?? trip.title}\n\nscrollaway://trip/${trip.share_slug}`,
        title: itinerary?.title ?? trip.title,
      });
    } catch { /* dismissed */ }
  }

  const activityTypes = new Set(
    itinerary?.days?.flatMap((d) => d.activities.map((a) => a.type)) ?? [],
  );
  const presentPills = TYPE_PILLS.filter((p) => activityTypes.has(p.type as any));
  const gradientColors = getRegionGradient(destination);
  const currentPhoto = photos[currentIndex] ?? null;

  // Right-side action buttons sit 100px from the bottom of the card
  const actionsBottom = 100;

  return (
    <View style={{ width: '100%', height: cardHeight, overflow: 'hidden' }}>
      {/* ── Gradient base — visible during load and crossfade transitions ── */}
      <LinearGradient
        colors={gradientColors}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* ── Animated photo layer — tappable to pause/resume ── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePhotoTap}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {currentPhoto && (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ExpoImage
              source={{ uri: currentPhoto }}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
            />
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* ── Pause / play icon flash ── */}
      {slideshowIcon && (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: iconAnim }}
        >
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={slideshowIcon === 'pause' ? 'pause' : 'play'} size={36} color="white" />
          </View>
        </Animated.View>
      )}

      {/* ── Dark vignette overlay — stronger at bottom ── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.25, 0.6, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* ── Top row: username + day count ── */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 56,
          left: 16,
          right: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
          }}
        >
          <Text style={{ fontSize: 13, color: 'white' }}>
            {trip.user_avatar_emoji ?? '🌍'}  {trip.username ?? 'traveler'}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
          }}
        >
          <Text style={{ fontSize: 13, color: 'white', fontWeight: '600' }}>
            {totalDays > 0 ? `${totalDays} days` : ''}
          </Text>
        </View>
      </View>

      {/* ── Right-side action column (TikTok style) ── */}
      <View
        style={{
          position: 'absolute',
          right: 14,
          bottom: actionsBottom,
          alignItems: 'center',
          gap: 22,
        }}
      >
        {/* Like */}
        <TouchableOpacity onPress={handleLike} style={{ alignItems: 'center', gap: 5 }}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={34}
              color={liked ? '#ef4444' : 'white'}
            />
          </Animated.View>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 }}>
            {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
          </Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity onPress={handleSave} style={{ alignItems: 'center', gap: 5 }}>
          <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={32}
              color={saved ? TEAL : 'white'}
            />
          </Animated.View>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 }}>
            {saveCount >= 1000 ? `${(saveCount / 1000).toFixed(1)}k` : saveCount}
          </Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity onPress={handleShare} style={{ alignItems: 'center', gap: 5 }}>
          <Ionicons name="paper-plane-outline" size={30} color="white" />
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 }}>
            Share
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Bottom-left content (leaves room for right column) ── */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.95}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 76,
          paddingHorizontal: 16,
          paddingBottom: 28,
        }}
      >
        {/* Trip title */}
        <Text
          numberOfLines={2}
          style={{
            color: 'white',
            fontSize: 26,
            fontWeight: '800',
            lineHeight: 32,
            marginBottom: 6,
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowRadius: 8,
          }}
        >
          {itinerary?.title ?? trip.title}
        </Text>

        {/* Destination */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
          <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            {destination}
          </Text>
        </View>

        {/* Activity type pills */}
        {presentPills.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {presentPills.map((pill) => (
              <View
                key={pill.type}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 11 }}>{pill.emoji}</Text>
                <Text style={{ color: 'white', fontSize: 11 }}>{pill.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* View Trip button */}
        <View
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: TEAL,
            borderRadius: 22,
            paddingHorizontal: 16, paddingVertical: 9,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>View Trip</Text>
          <Ionicons name="arrow-forward" size={14} color="white" />
        </View>
      </TouchableOpacity>
    </View>
  );
}
