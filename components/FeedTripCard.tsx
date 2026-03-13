import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip } from '../types';
import {
  likeTrip, unlikeTrip, hasLikedTrip,
  saveTrip, unsaveTrip, hasSavedTrip,
} from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#0D9488';
const CARD_HEIGHT = 480;

// Region-based gradient fallbacks
const REGION_GRADIENTS: Record<string, [string, string]> = {
  europe:  ['#1a237e', '#6a1b9a'],
  asia:    ['#004d40', '#00695c'],
  americas:['#bf360c', '#e65100'],
  africa:  ['#f57f17', '#e65100'],
  oceania: ['#006064', '#0277bd'],
  default: ['#0a0a1a', '#0D9488'],
};

function getRegionGradient(destination: string): [string, string] {
  const d = destination.toLowerCase();
  if (/japan|china|thailand|bali|indonesia|vietnam|india|korea|kyoto|bangkok|tokyo/.test(d)) return REGION_GRADIENTS.asia;
  if (/france|italy|spain|greece|portugal|netherlands|amsterdam|paris|barcelona|santorini|amalfi|lisbon/.test(d)) return REGION_GRADIENTS.europe;
  if (/usa|new york|brazil|mexico|rio|canada|peru|colombia/.test(d)) return REGION_GRADIENTS.americas;
  if (/africa|kenya|safari|cape town|morocco|marrakech|egypt/.test(d)) return REGION_GRADIENTS.africa;
  if (/australia|sydney|new zealand|oceania/.test(d)) return REGION_GRADIENTS.oceania;
  if (/maldives|iceland|dubai|uae/.test(d)) return REGION_GRADIENTS.default;
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

export function FeedTripCardSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={{
        width: '100%',
        height: CARD_HEIGHT,
        borderRadius: 20,
        backgroundColor: '#1a1a2e',
        opacity,
        marginBottom: 16,
      }}
    />
  );
}

// ─── Google Places image fetch ────────────────────────────────────────────────

async function fetchCoverImage(query: string): Promise<string | null> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=photos&key=${apiKey}`,
    );
    const json = await res.json();
    const ref = json.candidates?.[0]?.photos?.[0]?.photo_reference;
    if (!ref) return null;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${apiKey}`;
  } catch {
    return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FeedTripCardProps {
  trip: Trip;
  deviceId: string;
  onPress: () => void;
}

export default function FeedTripCard({ trip, deviceId, onPress }: FeedTripCardProps) {
  const itinerary = trip.itinerary;
  const destination = itinerary?.destination ?? trip.title ?? 'Unknown destination';
  const totalDays = itinerary?.totalDays ?? 0;
  const coverQuery = itinerary?.coverImageQuery ?? destination;

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(trip.like_count ?? 0);
  const [saveCount, setSaveCount] = useState(trip.save_count ?? 0);

  // Animate like button
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchCoverImage(coverQuery).then(setCoverUrl);
    hasLikedTrip(trip.id, deviceId).then(setLiked);
    hasSavedTrip(trip.id, deviceId).then(setSaved);
  }, [trip.id]);

  async function handleLike() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Animate heart
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    // Optimistic update
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

  // Determine which activity types are present
  const activityTypes = new Set(
    itinerary?.days?.flatMap((d) => d.activities.map((a) => a.type)) ?? [],
  );
  const presentPills = TYPE_PILLS.filter((p) => activityTypes.has(p.type as any));

  const gradientColors = getRegionGradient(destination);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.97}
      style={{ width: '100%', height: CARD_HEIGHT, borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}
    >
      {/* Background image or gradient */}
      {coverUrl ? (
        <ExpoImage
          source={{ uri: coverUrl }}
          contentFit="cover"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : (
        <LinearGradient
          colors={gradientColors}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      {/* Dark gradient overlay — bottom 65% */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.93)']}
        locations={[0, 0.35, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: CARD_HEIGHT * 0.65 }}
      />

      {/* ── Top row ── */}
      <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Username pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontSize: 13, color: 'white' }}>
            {trip.user_avatar_emoji ?? '🌍'} {trip.username ?? 'traveler'}
          </Text>
        </View>

        {/* Day count pill */}
        <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontSize: 13, color: 'white', fontWeight: '600' }}>
            {totalDays} days
          </Text>
        </View>
      </View>

      {/* ── Bottom section ── */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 }}>
        {/* Title */}
        <Text
          numberOfLines={2}
          style={{ color: 'white', fontSize: 24, fontWeight: '700', lineHeight: 30, marginBottom: 4 }}
        >
          {itinerary?.title ?? trip.title}
        </Text>

        {/* Destination */}
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 12 }}>
          {destination}
        </Text>

        {/* Activity type pills */}
        {presentPills.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {presentPills.map((pill) => (
              <View
                key={pill.type}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 12 }}>{pill.emoji}</Text>
                <Text style={{ color: 'white', fontSize: 12 }}>{pill.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: like, save, share */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {/* Like */}
            <TouchableOpacity onPress={handleLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#ef4444' : 'white'} />
              </Animated.View>
              <Text style={{ color: 'white', fontSize: 13 }}>{likeCount}</Text>
            </TouchableOpacity>

            {/* Save */}
            <TouchableOpacity onPress={handleSave} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? TEAL : 'white'} />
              <Text style={{ color: 'white', fontSize: 13 }}>{saveCount}</Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Right: View Trip button */}
          <TouchableOpacity
            onPress={onPress}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: TEAL, borderRadius: 20,
              paddingHorizontal: 14, paddingVertical: 8,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>View Trip</Text>
            <Ionicons name="arrow-forward" size={14} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
