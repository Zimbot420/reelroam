import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Callout, Marker } from 'react-native-maps';
import { supabase, unpublishTrip } from '../../lib/supabase';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import ShareToFeedModal from '../../components/ShareToFeedModal';

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
}

const TYPE_CONFIG = {
  food:          { emoji: '🍽️', color: '#F97316' },
  activity:      { emoji: '🎯', color: '#0D9488' },
  accommodation: { emoji: '🏨', color: '#8B5CF6' },
  transport:     { emoji: '🚗', color: '#9CA3AF' },
} as const;

const TEAL = '#0D9488';

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
      style={{ opacity, height: h, borderRadius: 12, backgroundColor: '#E5E7EB', width: w, marginBottom: 10 }}
    />
  );
}

function TripSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ height: 224, backgroundColor: '#E5E7EB' }} />
      <View style={{ padding: 20 }}>
        <SkeletonBlock w="75%" h={28} />
        <SkeletonBlock w="50%" h={16} />
        <SkeletonBlock w="66%" h={16} />
        <View style={{ marginTop: 16 }}>
          <SkeletonBlock w="100%" h={90} />
          <SkeletonBlock w="100%" h={90} />
          <SkeletonBlock w="100%" h={90} />
        </View>
      </View>
    </View>
  );
}

function NotFoundScreen({ onHome }: { onHome: () => void }) {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
      <Text className="text-5xl mb-4">🗺️</Text>
      <Text className="text-xl font-bold text-gray-900 text-center mb-2">Trip not found</Text>
      <Text className="text-gray-500 text-sm text-center mb-8">
        This trip link may have expired or been removed.
      </Text>
      <TouchableOpacity onPress={onHome} className="px-8 py-3 rounded-2xl" style={{ backgroundColor: TEAL }}>
        <Text className="text-white font-semibold">Go Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function ActivityCard({
  activity,
  isSelected,
  onPress,
}: {
  activity: ItineraryActivity;
  isSelected: boolean;
  onPress: () => void;
}) {
  const config = TYPE_CONFIG[activity.type] ?? TYPE_CONFIG.activity;
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3"
      style={{ borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? TEAL : '#F3F4F6' }}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="w-9 h-9 rounded-xl items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: config.color + '18' }}
        >
          <Text style={{ fontSize: 17 }}>{config.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-base leading-snug">{activity.name}</Text>
          <Text className="text-gray-400 text-xs mt-0.5">{activity.locationName}</Text>
          <View className="flex-row gap-3 mt-2">
            {!!activity.duration && <Text className="text-gray-500 text-xs">⏱ {activity.duration}</Text>}
            {!!activity.estimatedCost && <Text className="text-gray-500 text-xs">💰 {activity.estimatedCost}</Text>}
          </View>
          {!!activity.description && (
            <Text className="text-gray-600 text-sm mt-2 leading-relaxed">{activity.description}</Text>
          )}
          {!!activity.tips && (
            <View className="mt-3 px-3 py-2 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
              <Text className="text-green-700 text-xs leading-relaxed">💡 {activity.tips}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TripDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<TripRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [isPublic, setIsPublic] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  const mapRef = useRef<MapView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const dayOffsets = useRef<Record<number, number>>({});

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);

    async function load() {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('share_slug', slug)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setTrip(data as TripRow);
        setIsPublic(data.is_public ?? false);
        supabase.from('trip_views').insert({ trip_id: data.id }).then(() => {});
      }
      setLoading(false);
    }
    if (slug) load();
  }, [slug]);

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

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const offsets = dayOffsets.current;
    const days = Object.keys(offsets).map(Number).sort((a, b) => a - b);
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

  async function handleShare() {
    if (!trip) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out this trip I planned with ReelRoam!\n\n${trip.itinerary?.title ?? trip.title}\n\nreelroam://trip/${slug}`,
        title: trip.itinerary?.title ?? trip.title,
      });
    } catch { /* dismissed */ }
  }

  function handlePublicBadgePress() {
    if (!trip) return;
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
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }

  if (loading) return <TripSkeleton />;
  if (notFound) return <NotFoundScreen onHome={() => router.replace('/')} />;
  if (!trip) return null;

  const itinerary = trip.itinerary;
  const markers = itinerary?.days
    ?.flatMap((d) => d.activities)
    .filter((a) => a.coordinates?.lat && a.coordinates?.lng) ?? [];

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ height: 224, width: '100%' }}>
        <MapView ref={mapRef} style={{ flex: 1 }} onMapReady={onMapReady}>
          {markers.map((activity) => {
            const config = TYPE_CONFIG[activity.type] ?? TYPE_CONFIG.activity;
            return (
              <Marker
                key={activity.id}
                coordinate={{ latitude: activity.coordinates.lat, longitude: activity.coordinates.lng }}
                onPress={() => handlePinPress(activity)}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 18, backgroundColor: config.color,
                  borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14 }}>{config.emoji}</Text>
                </View>
                <Callout>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontWeight: '600', fontSize: 12, color: '#111827' }}>{activity.name}</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>{activity.locationName}</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      </View>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: 'absolute', top: 48, left: 16, width: 36, height: 36,
          borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
        }}
      >
        <Ionicons name="arrow-back" size={18} color="#111827" />
      </TouchableOpacity>

      <View className="bg-white px-5 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xl font-bold text-gray-900 leading-snug" numberOfLines={2}>
              {itinerary?.title ?? trip.title}
            </Text>
            <Text className="text-gray-500 text-sm mt-0.5">{itinerary?.destination}</Text>
          </View>
          <View className="items-end gap-1">
            <View className="flex-row items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: '#F0FDFA' }}>
              <Ionicons name="calendar-outline" size={12} color={TEAL} />
              <Text className="text-xs font-medium" style={{ color: TEAL }}>{itinerary?.totalDays ?? 0} days</Text>
            </View>
            {trip.is_pro && (
              <View className="px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7' }}>
                <Text className="text-xs font-semibold text-amber-700">✦ Pro</Text>
              </View>
            )}
            {isPublic && (
              <TouchableOpacity
                onPress={handlePublicBadgePress}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: '#F0FDF4' }}
              >
                <Ionicons name="earth" size={11} color="#16a34a" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#16a34a' }}>Public</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {!!itinerary?.totalEstimatedCost && (
          <Text className="text-gray-400 text-xs mt-1">Est. cost: {itinerary.totalEstimatedCost}</Text>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        onScroll={handleScroll}
        scrollEventThrottle={100}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {(itinerary?.tips?.length ?? 0) > 0 && (
          <View className="mb-5 px-4 py-3 rounded-2xl" style={{ backgroundColor: '#F0FDF4' }}>
            <Text className="text-green-800 font-semibold text-sm mb-1">Travel Tips</Text>
            {itinerary.tips.map((tip, i) => (
              <Text key={i} className="text-green-700 text-xs leading-relaxed">• {tip}</Text>
            ))}
          </View>
        )}

        {itinerary?.days?.map((day) => (
          <View key={day.day} onLayout={(e) => { dayOffsets.current[day.day] = e.nativeEvent.layout.y; }}>
            <View className="flex-row items-center gap-3 mb-3">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: activeDay === day.day ? TEAL : '#F3F4F6' }}
              >
                <Text className="text-xs font-bold" style={{ color: activeDay === day.day ? 'white' : '#6B7280' }}>
                  {day.day}
                </Text>
              </View>
              <Text className="font-semibold text-gray-900 text-base">{day.label}</Text>
            </View>

            {day.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
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
            ))}
            <View style={{ height: 8 }} />
          </View>
        ))}

        {!!itinerary?.bestTimeToVisit && (
          <View className="mt-2 mb-4 px-4 py-3 rounded-2xl bg-gray-50">
            <Text className="text-gray-500 text-xs">
              <Text className="font-semibold text-gray-700">Best time to visit: </Text>
              {itinerary.bestTimeToVisit}
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 flex-row gap-3 px-5 pb-8 pt-4 bg-white border-t border-gray-100"
        style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 6 }}
      >
        <TouchableOpacity
          onPress={handleShare}
          className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-2xl border border-gray-200"
        >
          <Ionicons name="share-outline" size={18} color={TEAL} />
          <Text className="font-semibold text-gray-800">Share</Text>
        </TouchableOpacity>

        {/* Share to Feed */}
        {!isPublic && (
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowShareModal(true); }}
            className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-2xl border"
            style={{ borderColor: TEAL, backgroundColor: 'rgba(13,148,136,0.06)' }}
          >
            <Ionicons name="earth-outline" size={18} color={TEAL} />
            <Text style={{ fontWeight: '600', color: TEAL, fontSize: 14 }}>To Feed</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.replace('/')}
          className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-2xl"
          style={{ backgroundColor: TEAL }}
        >
          <Ionicons name="add-outline" size={18} color="white" />
          <Text className="text-white font-semibold">New Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Share to Feed modal */}
      {trip && (
        <ShareToFeedModal
          tripId={trip.id}
          deviceId={deviceId}
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          onShared={(uname, emoji) => {
            setIsPublic(true);
            setShowShareModal(false);
          }}
        />
      )}
    </View>
  );
}
