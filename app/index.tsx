import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import SpinningGlobe from '../components/SpinningGlobe';
import { Trip } from '../types';
import { useRecentTrips } from '../hooks/useRecentTrips';
import { FREE_TRIP_LIMIT, useProStatus } from '../hooks/useProStatus';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Platform detection ───────────────────────────────────────────────────────

const PLATFORM_HOSTS: Record<string, string> = {
  'tiktok.com': 'tiktok',
  'www.tiktok.com': 'tiktok',
  'vm.tiktok.com': 'tiktok',
  'vt.tiktok.com': 'tiktok',
  'instagram.com': 'instagram',
  'www.instagram.com': 'instagram',
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'm.youtube.com': 'youtube',
};

function detectPlatform(url: string): string | null {
  try {
    return PLATFORM_HOSTS[new URL(url).hostname] ?? null;
  } catch {
    return null;
  }
}

const PLATFORM_META: Record<string, { icon: string; color: string; label: string }> = {
  tiktok:    { icon: 'musical-notes', color: '#000000', label: 'TikTok' },
  instagram: { icon: 'camera',        color: '#E1306C', label: 'Instagram' },
  youtube:   { icon: 'logo-youtube',  color: '#FF0000', label: 'YouTube' },
};

// ─── Star field ───────────────────────────────────────────────────────────────

function StarField() {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      key: i,
      left: Math.random() * SCREEN_WIDTH,
      top: Math.random() * 900,
      opacity: 0.2 + Math.random() * 0.5,
      size: 1 + Math.random() * 2,
    }));
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {stars.map((s) => (
        <View
          key={s.key}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: 'white',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function SkeletonShimmer({ width, height, borderRadius = 10 }: { width: number | string; height: number; borderRadius?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ opacity, width, height, borderRadius, backgroundColor: '#ffffff15', marginRight: 12 }} />
  );
}

// ─── Trip image card ──────────────────────────────────────────────────────────

async function fetchCardImage(locationName: string): Promise<string | null> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(locationName)}&inputtype=textquery&fields=photos&key=${apiKey}`,
    );
    const json = await res.json();
    const ref = json.candidates?.[0]?.photos?.[0]?.photo_reference;
    if (!ref) return null;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${ref}&key=${apiKey}`;
  } catch {
    return null;
  }
}

function TripImageCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const destination =
    trip.title ??
    (trip.locations?.[0]?.name ? `Trip to ${trip.locations[0].name}` : 'Untitled Trip');
  const dayCount = trip.itinerary?.length ?? 0;

  useEffect(() => {
    const locationName = trip.locations?.[0]?.name ?? trip.title;
    if (locationName) {
      fetchCardImage(locationName).then(setImageUrl);
    }
  }, [trip.id]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ width: 150, height: 180, borderRadius: 16, marginRight: 12, overflow: 'hidden' }}
    >
      {imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          contentFit="cover"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0D9488' }} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 }}
      />
      <Text
        numberOfLines={2}
        style={{
          position: 'absolute', bottom: 24, left: 10, right: 10,
          color: 'white', fontSize: 14, fontWeight: '700', lineHeight: 18,
        }}
      >
        {destination}
      </Text>
      {dayCount > 0 && (
        <Text style={{ position: 'absolute', bottom: 8, left: 10, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
          {dayCount} {dayCount === 1 ? 'day' : 'days'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trips, isLoading } = useRecentTrips();
  const { isPro, tripsRemaining, isLoaded } = useProStatus();
  const [inputUrl, setInputUrl] = useState('');
  const detectedPlatform = detectPlatform(inputUrl);
  const btnScale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  }
  function pressOut() {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  }

  function handleGenerate() {
    const platform = detectPlatform(inputUrl);
    if (!inputUrl.trim() || !platform) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: re-enable rate limit gate before launch
    // if (isLoaded && !isPro && tripsRemaining === 0) {
    //   router.push({ pathname: '/upgrade', params: { reason: 'rate_limit' } } as any);
    //   return;
    // }
    router.push({ pathname: '/processing', params: { url: inputUrl.trim(), platform } });
  }

  const bannerHeight = 52 + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Star field */}
      <StarField />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: isPro ? insets.bottom + 20 : bannerHeight + 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={{ paddingTop: 60, alignItems: 'center', position: 'relative', paddingBottom: 4 }}>
          <Text style={{ fontSize: 42, fontWeight: '700', color: 'white', letterSpacing: -0.5 }}>
            ScrollAway
          </Text>
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginTop: 6 }}>
            Share. Explore. Go.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            style={{ position: 'absolute', top: 60, right: 20 }}
          >
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* ── Globe ── */}
        <View style={{ position: 'relative', alignItems: 'center' }}>
          {/* Teal glow behind globe */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 40,
              width: 280,
              height: 280,
              borderRadius: 140,
              backgroundColor: '#0D9488',
              opacity: 0.15,
              shadowColor: '#0D9488',
              shadowOpacity: 0.8,
              shadowRadius: 60,
              elevation: 40,
            }}
          />
          <SpinningGlobe />
        </View>

        {/* ── Platform icons ── */}
        <View style={{ alignItems: 'center', marginTop: -8 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['tiktok', 'instagram', 'youtube'] as const).map((p) => (
              <View
                key={p}
                style={{
                  width: 52, height: 52, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name={PLATFORM_META[p].icon as any} size={24} color="white" />
              </View>
            ))}
          </View>
          <Ionicons name="chevron-down" size={20} color="#0D9488" style={{ marginTop: 12 }} />
        </View>

        {/* ── URL input ── */}
        <View style={{ marginHorizontal: 20, marginTop: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              height: 56,
              borderRadius: 50,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              paddingLeft: 20,
              paddingRight: 6,
            }}
          >
            {detectedPlatform ? (
              <View
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: PLATFORM_META[detectedPlatform].color,
                  alignItems: 'center', justifyContent: 'center', marginRight: 10,
                }}
              >
                <Ionicons name={PLATFORM_META[detectedPlatform].icon as any} size={14} color="white" />
              </View>
            ) : (
              <Ionicons name="link-outline" size={18} color="rgba(255,255,255,0.25)" style={{ marginRight: 10 }} />
            )}
            <TextInput
              style={{ flex: 1, color: 'white', fontSize: 14 }}
              placeholder="https://www.link.on/URL"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleGenerate}
            />
            {inputUrl.length > 0 && !detectedPlatform && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setInputUrl(''); }}
                style={{ padding: 6 }}
              >
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
            {/* Inline Generate Trip button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                onPress={handleGenerate}
                onPressIn={pressIn}
                onPressOut={pressOut}
                disabled={!detectedPlatform}
                activeOpacity={0.85}
                style={{
                  height: 44,
                  borderRadius: 44,
                  paddingHorizontal: 16,
                  backgroundColor: detectedPlatform ? '#0D9488' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: detectedPlatform ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: '600', fontSize: 14 }}>
                  Generate Trip
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Helper text */}
          <Text style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
            Share any travel video to get your AI itinerary instantly
          </Text>
        </View>

        {/* ── Discover button ── */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/discover' as any); }}
          activeOpacity={0.85}
          style={{
            marginHorizontal: 20, marginTop: 20,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: 'rgba(13,148,136,0.15)',
            borderWidth: 1, borderColor: 'rgba(13,148,136,0.3)',
            borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="compass-outline" size={22} color="#0D9488" />
            <View>
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Discover Trips</Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1 }}>Browse trips from around the world</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* ── Recent trips ── */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: 'white', marginLeft: 20, marginBottom: 12 }}>
            Recent Trips
          </Text>

          {isLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
              <SkeletonShimmer width={150} height={180} borderRadius={16} />
              <SkeletonShimmer width={150} height={180} borderRadius={16} />
              <SkeletonShimmer width={150} height={180} borderRadius={16} />
            </ScrollView>
          ) : trips.length === 0 ? (
            <Text style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontSize: 14, marginHorizontal: 20 }}>
              Your generated trips will appear here
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
            >
              {trips.map((trip) => (
                <TripImageCard
                  key={trip.id}
                  trip={trip}
                  onPress={() =>
                    router.push({ pathname: '/trip/[slug]' as any, params: { slug: trip.share_slug } })
                  }
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* ── Pro banner (fixed bottom) ── */}
      {!isPro && (
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/upgrade' as any); }}
          activeOpacity={0.85}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <LinearGradient
            colors={['#0D9488', '#0a7a70']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 14 + insets.bottom,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles" size={16} color="white" />
              <Text style={{ color: 'white', fontSize: 14 }}>
                {isLoaded ? (
                  tripsRemaining === 0
                    ? <Text style={{ fontWeight: '600' }}>No free trips remaining</Text>
                    : <Text><Text style={{ fontWeight: '600' }}>{tripsRemaining} free {tripsRemaining === 1 ? 'trip' : 'trips'} remaining</Text> · Upgrade to Pro</Text>
                ) : (
                  <Text><Text style={{ fontWeight: '600' }}>{FREE_TRIP_LIMIT} free trips/month</Text> · Upgrade to Pro</Text>
                )}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}
