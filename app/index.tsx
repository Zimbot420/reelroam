import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';
import { useRecentTrips } from '../hooks/useRecentTrips';
import { FREE_TRIP_LIMIT, useProStatus } from '../hooks/useProStatus';

// ─── Platform detection ───────────────────────────────────────────────────────

const PLATFORM_HOSTS: Record<string, string> = {
  'tiktok.com': 'tiktok',
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

// ─── Step animation ───────────────────────────────────────────────────────────

function StepAnimation() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    return () => pulse.stopAnimation();
  }, []);

  const PlatformIcon = ({
    iconName,
    bg,
  }: {
    iconName: string;
    bg: string;
  }) => (
    <View
      className="w-10 h-10 rounded-xl items-center justify-center mb-1"
      style={{ backgroundColor: bg }}
    >
      <Ionicons name={iconName as any} size={20} color="white" />
    </View>
  );

  return (
    <View className="flex-row items-center justify-center mt-6 mb-2">
      {/* Platform icons stacked */}
      <View className="items-center gap-1">
        <PlatformIcon iconName="musical-notes" bg="#000000" />
        <PlatformIcon iconName="camera"        bg="#E1306C" />
        <PlatformIcon iconName="logo-youtube"  bg="#FF0000" />
      </View>

      <Animated.View className="mx-3" style={{ opacity: pulse }}>
        <Ionicons name="arrow-forward" size={22} color="#0D9488" />
      </Animated.View>

      {/* Share icon */}
      <View className="w-14 h-14 rounded-2xl bg-teal-50 items-center justify-center border border-teal-200">
        <Ionicons name="share-outline" size={26} color="#0D9488" />
      </View>

      <Animated.View className="mx-3" style={{ opacity: pulse }}>
        <Ionicons name="arrow-forward" size={22} color="#0D9488" />
      </Animated.View>

      {/* ReelRoam icon */}
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center"
        style={{ backgroundColor: '#0D9488' }}
      >
        <Ionicons name="map" size={26} color="white" />
      </View>
    </View>
  );
}

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const dayCount = trip.itinerary?.length ?? 0;
  const destination =
    trip.title ??
    (trip.locations?.[0]?.name ? `Trip to ${trip.locations[0].name}` : 'Untitled Trip');

  const date = new Date(trip.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const platformMeta = trip.platform ? PLATFORM_META[trip.platform] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-gray-900 font-semibold text-base" numberOfLines={1}>
            {destination}
          </Text>
          <View className="flex-row items-center mt-1 gap-3">
            {dayCount > 0 && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                <Text className="text-gray-500 text-xs">
                  {dayCount} {dayCount === 1 ? 'day' : 'days'}
                </Text>
              </View>
            )}
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={13} color="#6B7280" />
              <Text className="text-gray-500 text-xs">{date}</Text>
            </View>
            {trip.is_pro && (
              <View className="bg-teal-50 rounded-full px-2 py-0.5">
                <Text className="text-teal-700 text-xs font-medium">Pro</Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {platformMeta && (
            <View
              className="w-7 h-7 rounded-lg items-center justify-center"
              style={{ backgroundColor: platformMeta.color }}
            >
              <Ionicons name={platformMeta.icon as any} size={14} color="white" />
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { trips, isLoading } = useRecentTrips();
  const { isPro, tripsRemaining, isLoaded } = useProStatus();
  const [inputUrl, setInputUrl] = useState('');
  const detectedPlatform = detectPlatform(inputUrl);

  function handleGenerate() {
    const platform = detectPlatform(inputUrl);
    if (!inputUrl.trim() || !platform) return;
    if (isLoaded && !isPro && tripsRemaining === 0) {
      router.push({ pathname: '/upgrade', params: { reason: 'rate_limit' } } as any);
      return;
    }
    router.push({ pathname: '/processing', params: { url: inputUrl.trim(), platform } });
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <View className="flex-row items-center gap-2">
            <View
              className="w-8 h-8 rounded-lg items-center justify-center"
              style={{ backgroundColor: '#0D9488' }}
            >
              <Ionicons name="map" size={16} color="white" />
            </View>
            <Text className="text-xl font-bold text-gray-900">ReelRoam</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            className="w-9 h-9 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons name="settings-outline" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* ── Hero ── */}
        <View className="px-5 pt-6">
          <Text className="text-3xl font-bold text-gray-900 leading-tight">
            See it.{'\n'}Plan it.{'\n'}Go.
          </Text>
          <Text className="text-gray-500 text-base mt-3 leading-relaxed">
            Share any travel video to get an instant AI itinerary
          </Text>
          <StepAnimation />
          <Text className="text-center text-xs text-gray-400 mt-1 mb-2">
            Tap Share in TikTok, Instagram, or YouTube — then select ReelRoam
          </Text>
        </View>

        {/* ── Divider ── */}
        <View className="flex-row items-center px-5 my-5">
          <View className="flex-1 h-px bg-gray-100" />
          <Text className="mx-3 text-xs text-gray-400 uppercase tracking-widest">or</Text>
          <View className="flex-1 h-px bg-gray-100" />
        </View>

        {/* ── Manual URL input ── */}
        <View className="px-5">
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-13 gap-2">
            {detectedPlatform ? (
              <View
                className="w-7 h-7 rounded-lg items-center justify-center"
                style={{ backgroundColor: PLATFORM_META[detectedPlatform].color }}
              >
                <Ionicons
                  name={PLATFORM_META[detectedPlatform].icon as any}
                  size={14}
                  color="white"
                />
              </View>
            ) : (
              <Ionicons name="link-outline" size={18} color="#9CA3AF" />
            )}
            <TextInput
              className="flex-1 text-gray-900 text-sm py-3"
              placeholder="Paste a URL here"
              placeholderTextColor="#9CA3AF"
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleGenerate}
            />
            {inputUrl.length > 0 && (
              <TouchableOpacity onPress={() => setInputUrl('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleGenerate}
            disabled={!detectedPlatform}
            activeOpacity={0.8}
            className="mt-3 h-13 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: detectedPlatform ? '#0D9488' : '#E5E7EB',
            }}
          >
            <Text
              className="font-semibold text-base"
              style={{ color: detectedPlatform ? 'white' : '#9CA3AF' }}
            >
              Generate Trip
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent trips ── */}
        <View className="px-5 mt-8">
          <Text className="text-lg font-bold text-gray-900 mb-4">Your Recent Trips</Text>

          {isLoading ? (
            <ActivityIndicator color="#0D9488" />
          ) : trips.length === 0 ? (
            <View className="bg-gray-50 rounded-2xl px-5 py-8 items-center">
              <View
                className="w-14 h-14 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: '#CCFBF1' }}
              >
                <Ionicons name="map-outline" size={28} color="#0D9488" />
              </View>
              <Text className="text-gray-700 font-medium text-center">
                No trips yet
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                Your generated trips will appear here
              </Text>
            </View>
          ) : (
            trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() =>
                  router.push({ pathname: '/trip/[id]' as any, params: { id: trip.id } })
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Upgrade banner (hidden for Pro users) ── */}
      {!isPro && (
        <TouchableOpacity
          onPress={() => router.push('/upgrade' as any)}
          activeOpacity={0.85}
          className="mx-5 mb-4 rounded-2xl overflow-hidden"
          style={{ backgroundColor: tripsRemaining === 0 ? '#DC2626' : '#0D9488' }}
        >
          <View className="flex-row items-center justify-between px-5 py-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={16} color="white" />
              {isLoaded ? (
                <Text className="text-white text-sm">
                  <Text className="font-semibold">
                    {tripsRemaining === 0
                      ? 'No free trips remaining'
                      : `${tripsRemaining} free ${tripsRemaining === 1 ? 'trip' : 'trips'} remaining this month`}
                  </Text>
                  {'  ·  '}Upgrade to Pro
                </Text>
              ) : (
                <Text className="text-white text-sm">
                  <Text className="font-semibold">{FREE_TRIP_LIMIT} free trips/month</Text>
                  {'  ·  '}Upgrade to Pro
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
