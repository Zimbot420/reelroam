import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trip } from '../types';
import {
  supabase,
  likeTrip, unlikeTrip, hasLikedTrip,
  saveTrip, unsaveTrip, hasSavedTrip,
  isFollowing, followUser, unfollowUser,
} from '../lib/supabase';
import { useAuth } from '../lib/context/AuthContext';
import { useLanguage } from '../lib/context/LanguageContext';

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

// ─── Photo fetching (Unsplash — free, replaces Google Places photos) ─────────

import { fetchTripPhotos as fetchTripPhotosFromService } from '../lib/api/photos';

// Module-level cache: trip.id → resolved photo URLs
const _feedPhotoCache = new Map<string, string[]>();

async function fetchTripPhotos(trip: Trip): Promise<string[]> {
  const destination = trip.itinerary?.destination ?? trip.title ?? '';
  const locationNames = (trip.locations ?? [])
    .slice(0, 4)
    .map((l) => l.name)
    .filter(Boolean) as string[];
  return fetchTripPhotosFromService(destination, locationNames);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FeedTripCardProps {
  trip: Trip;
  deviceId: string;
  cardHeight: number;
  isActive: boolean;
  onPress: () => void;
  savedKey?: number;
}

export default function FeedTripCard({ trip, deviceId, cardHeight, isActive, onPress, savedKey }: FeedTripCardProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { username: authUsername } = useAuth();
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
  const [commentCount, setCommentCount] = useState(trip.comment_count ?? 0);
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const iconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cached = _feedPhotoCache.get(trip.id);
    if (cached) { setPhotos(cached); return; }
    fetchTripPhotos(trip).then((urls) => {
      _feedPhotoCache.set(trip.id, urls);
      setPhotos(urls);
    });
  }, [trip.id]);

  useEffect(() => {
    if (!deviceId) return;
    hasLikedTrip(trip.id, deviceId).then(setLiked);
    hasSavedTrip(trip.id, deviceId).then(setSaved);
    // Fetch real comment count from trip_comments table
    supabase.from('trip_comments').select('*', { count: 'exact', head: true }).eq('trip_id', trip.id)
      .then(({ count }) => { if (count !== null) setCommentCount(count); })
      .catch(() => {});
    // Check follow status for creator
    if (trip.username && trip.username !== authUsername) {
      isFollowing(deviceId, trip.username).then(setIsFollowingCreator).catch(() => {});
    }
  }, [trip.id, deviceId, savedKey]);

  // Auto-playing slideshow — only runs when this card is visible on screen
  useEffect(() => {
    if (!isActive || paused || photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isActive, paused, photos.length]);

  // Prefetch the next image while the current one is showing
  useEffect(() => {
    if (photos.length <= 1) return;
    const next = (currentIndex + 1) % photos.length;
    if (photos[next]) Image.prefetch(photos[next]).catch(() => {});
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

  const presentPills = useMemo(() => {
    const activityTypes = new Set(
      itinerary?.days?.flatMap((d) => d.activities.map((a) => a.type)) ?? [],
    );
    return TYPE_PILLS.filter((p) => activityTypes.has(p.type as any));
  }, [trip.id]);
  const gradientColors = useMemo(() => getRegionGradient(destination), [destination]);
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

      {/* ── Photo layer — tappable to pause/resume ── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePhotoTap}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {currentPhoto && (
          <ExpoImage
            source={{ uri: currentPhoto }}
            contentFit="cover"
            transition={{ duration: 600, effect: 'cross-dissolve' }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
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

      {/* ── Cinematic vignette — transparent top 40%, deep black bottom ── */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)', 'rgba(0,0,0,0.97)']}
        locations={[0, 0.38, 0.58, 0.78, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Subtle top fade for status bar legibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }}
      />

      {/* Top area intentionally clear — content lives in bottom section */}

      {/* ── Right-side action column — frosted glass pill container ── */}
      <View
        style={{
          position: 'absolute',
          right: 12,
          bottom: actionsBottom,
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.38)',
          borderRadius: 28,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          paddingVertical: 14,
          paddingHorizontal: 10,
          gap: 20,
        }}
      >
        {/* Like */}
        <TouchableOpacity onPress={handleLike} style={{ alignItems: 'center', gap: 4 }}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? '#ef4444' : 'rgba(255,255,255,0.9)'}
            />
          </Animated.View>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>
            {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
          </Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity onPress={handleSave} style={{ alignItems: 'center', gap: 4 }}>
          <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={saved ? TEAL : 'rgba(255,255,255,0.9)'}
            />
          </Animated.View>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>
            {saveCount >= 1000 ? `${(saveCount / 1000).toFixed(1)}k` : saveCount}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (trip.share_slug) router.push({ pathname: '/trip/[slug]', params: { slug: trip.share_slug, openComments: '1' } });
          }}
          style={{ alignItems: 'center', gap: 4 }}
        >
          <Ionicons name="chatbubble-outline" size={24} color="rgba(255,255,255,0.9)" />
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>
            {commentCount >= 1000 ? `${(commentCount / 1000).toFixed(1)}k` : commentCount}
          </Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity onPress={handleShare} style={{ alignItems: 'center', gap: 4 }}>
          <Ionicons name="paper-plane-outline" size={24} color="rgba(255,255,255,0.9)" />
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>
            {t.feedCard.share}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Bottom-left content (leaves room for right column) ── */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.92}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 80,
          paddingHorizontal: 20,
          paddingBottom: 32,
        }}
      >
        {/* Username row + follow */}
        {trip.username && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                if (trip.username) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(('/profile/' + trip.username) as any);
                }
              }}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Text style={{ fontSize: 20, lineHeight: 24 }}>{trip.user_avatar_emoji ?? '🌍'}</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '400', letterSpacing: 0.2 }}>
                @{trip.username}
              </Text>
            </TouchableOpacity>
            {trip.username !== authUsername && !isFollowingCreator && (
              <TouchableOpacity
                onPress={async () => {
                  if (!deviceId || !trip.username) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsFollowingCreator(true);
                  try { await followUser(deviceId, trip.username); } catch { setIsFollowingCreator(false); }
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.25)',
                }}
              >
                <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>Follow</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Trip title — large and commanding; shared element to trip detail */}
        <Reanimated.Text
          numberOfLines={2}
          sharedTransitionTag={`trip-title-${trip.share_slug}`}
          style={{
            color: 'white',
            fontSize: 28,
            fontWeight: '800',
            lineHeight: 34,
            marginBottom: 6,
            letterSpacing: -0.5,
          }}
        >
          {itinerary?.title ?? trip.title}
        </Reanimated.Text>

        {/* Destination — thin weight for contrast */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 }}>
          <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.55)" />
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '300', letterSpacing: 0.3 }}>
            {destination}
            {totalDays > 0 ? `  ·  ${totalDays} ${t.feedCard.days}` : ''}
          </Text>
        </View>

        {/* Activity type pills */}
        {presentPills.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {presentPills.map((pill) => (
              <View
                key={pill.type}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  paddingHorizontal: 8, paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 10 }}>{pill.emoji}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' }}>{pill.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* View Trip button — gradient fill */}
        <LinearGradient
          colors={['#0D9488', '#0a7a70']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row', alignItems: 'center',
            borderRadius: 22,
            paddingHorizontal: 18, paddingVertical: 10,
            shadowColor: '#0D9488',
            shadowOpacity: 0.5,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, marginRight: 5 }}>{t.feedCard.viewTrip}</Text>
          <Ionicons name="arrow-forward" size={13} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
