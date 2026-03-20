import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import { getSavedTrips } from '../../lib/supabase';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { Trip } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 8) / 2;
const CARD_HEIGHT = 210;
const SORT_KEY = '@bucketlist_sort';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOption = 'Recently Saved' | 'Most Popular' | 'By Destination';
type SavedTrip = Trip & { saved_at: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { fetchLocationPhoto } from '../../lib/api/photos';

async function fetchCardImage(query: string): Promise<string | null> {
  try {
    const urls = await fetchLocationPhoto(query, 1);
    return urls[0] ?? null;
  } catch {
    return null;
  }
}

function getCoords(trip: Trip): { latitude: number; longitude: number } | null {
  const first = trip.itinerary?.days?.[0]?.activities?.[0]?.coordinates;
  if (first?.lat && first?.lng) return { latitude: first.lat, longitude: first.lng };
  const loc = trip.locations?.[0];
  if (loc?.latitude && loc?.longitude) return { latitude: loc.latitude, longitude: loc.longitude };
  return null;
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function CardSkeleton() {
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
    <Animated.View
      style={{ opacity, width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 16, backgroundColor: '#1a1a2e' }}
    />
  );
}

// ─── Bucketlist card ──────────────────────────────────────────────────────────

function BucketlistCard({ trip, onPress }: { trip: SavedTrip; onPress: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const destination = trip.itinerary?.destination ?? trip.title ?? 'Unknown';
  const days = trip.itinerary?.totalDays ?? 0;

  useEffect(() => {
    fetchCardImage(destination).then(setImageUrl);
  }, [trip.id]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{
        width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 16, overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }, elevation: 6,
      }}
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
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: CARD_HEIGHT * 0.65 }}
      />

      {/* Creator pill */}
      {trip.username && (
        <View style={{
          position: 'absolute', top: 8, left: 8,
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
          paddingHorizontal: 7, paddingVertical: 3,
        }}>
          <Text style={{ fontSize: 11, color: 'white' }}>
            {trip.user_avatar_emoji ?? '🌍'} @{trip.username}
          </Text>
        </View>
      )}

      {/* Bottom info */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 }}>
        <Text
          numberOfLines={2}
          style={{ color: 'white', fontSize: 13, fontWeight: '700', lineHeight: 17, marginBottom: 4 }}
        >
          {destination}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {days > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{days} days</Text>
          )}
          {(trip.like_count ?? 0) > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="heart" size={11} color="#ef4444" />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{trip.like_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Bucketlist screen ────────────────────────────────────────────────────────

export default function BucketListScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('Recently Saved');
  const mapRef = useRef<MapView>(null);
  const mapReadyRef = useRef(false);
  const hasLoadedOnce = useRef(false);

  // Load sort preference once on mount
  useEffect(() => {
    AsyncStorage.getItem(SORT_KEY).then((v) => {
      if (v) setSortBy(v as SortOption);
    });
  }, []);

  // Refetch every time this tab comes into focus so saves made elsewhere appear immediately
  useFocusEffect(
    useCallback(() => {
      getOrCreateDeviceId().then((id) => {
        setDeviceId(id);
        loadTrips(id, !hasLoadedOnce.current);
        hasLoadedOnce.current = true;
      });
    }, [])
  );

  async function loadTrips(id: string, showSkeleton = false) {
    try {
      if (showSkeleton) setLoading(true);
      const data = await getSavedTrips(id) as SavedTrip[];
      setTrips(data);
    } catch (e) {
      console.error('Bucketlist load error:', e);
    } finally {
      setLoading(false);
    }
  }

  const allCoords = useMemo(
    () => trips.map(getCoords).filter(Boolean) as { latitude: number; longitude: number }[],
    [trips],
  );

  function fitMap() {
    if (allCoords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 24, right: 24, bottom: 24, left: 24 },
        animated: false,
      });
    }
  }

  function onMapReady() {
    mapReadyRef.current = true;
    fitMap();
  }

  useEffect(() => {
    if (mapReadyRef.current) fitMap();
  }, [allCoords]);

  const sortedTrips = useMemo(() => {
    const copy = [...trips];
    if (sortBy === 'Most Popular') {
      copy.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
    } else if (sortBy === 'By Destination') {
      copy.sort((a, b) => {
        const da = a.itinerary?.destination ?? a.title ?? '';
        const db = b.itinerary?.destination ?? b.title ?? '';
        return da.localeCompare(db);
      });
    } else {
      // Recently Saved — use saved_at
      copy.sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());
    }
    return copy;
  }, [trips, sortBy]);

  function openSortPicker() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options: SortOption[] = ['Recently Saved', 'Most Popular', 'By Destination'];
    Alert.alert(
      'Sort by',
      undefined,
      [
        ...options.map((opt) => ({
          text: opt === sortBy ? `✓ ${opt}` : opt,
          onPress: () => {
            setSortBy(opt);
            AsyncStorage.setItem(SORT_KEY, opt);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }

  const renderItem = useCallback(({ item, index }: { item: SavedTrip; index: number }) => (
    <View style={{ marginLeft: index % 2 === 0 ? 16 : 4, marginRight: index % 2 === 0 ? 4 : 16, marginBottom: 8 }}>
      <BucketlistCard
        trip={item}
        onPress={() => { if (item.share_slug) router.push({ pathname: '/trip/[slug]' as any, params: { slug: item.share_slug } }); }}
      />
    </View>
  ), []);

  const ListHeader = () => (
    <>
      {/* World map */}
      <View style={{ height: 200, marginBottom: 20, overflow: 'hidden' }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          mapType="hybrid"
          liteMode
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          onMapReady={onMapReady}
          initialRegion={{ latitude: 20, longitude: 0, latitudeDelta: 120, longitudeDelta: 120 }}
        >
          {allCoords.map((coord, i) => (
            <Marker
              key={i}
              coordinate={coord}
              pinColor="#0D9488"
            />
          ))}
        </MapView>
        {/* Fade edges */}
        <LinearGradient
          colors={['#0a0a1a', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24 }}
        />
        <LinearGradient
          colors={['transparent', '#0a0a1a']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24 }}
        />
      </View>

      {/* Section header with sort */}
      {sortedTrips.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            {sortedTrips.length} {sortedTrips.length === 1 ? 'trip' : 'trips'} saved
          </Text>
          <TouchableOpacity
            onPress={openSortPicker}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(13,148,136,0.1)',
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
              borderWidth: 1, borderColor: 'rgba(13,148,136,0.25)',
            }}
          >
            <Ionicons name="swap-vertical-outline" size={12} color="rgba(13,148,136,0.85)" />
            <Text style={{ color: 'rgba(13,148,136,0.85)', fontSize: 12, fontWeight: '500' }}>{sortBy}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const ListEmpty = () => (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 40, paddingHorizontal: 32 }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🔖</Text>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
        Your bucketlist is empty
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>
        Save trips from the Discover feed to build your travel wishlist
      </Text>
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate('/discover' as any); }}
        style={{ backgroundColor: '#0D9488', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 }}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Explore the Feed</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
          <Text style={{ color: 'white', fontSize: 32, fontWeight: '800', letterSpacing: -0.8 }}>
            Bucket List
          </Text>
          <View style={{ width: 32, height: 2, borderRadius: 1, backgroundColor: '#0D9488', marginTop: 6, opacity: 0.8 }} />
          {!loading && (
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 6, fontWeight: '300' }}>
              {trips.length === 0
                ? 'No trips saved yet'
                : `${trips.length} ${trips.length === 1 ? 'destination' : 'destinations'} saved`}
            </Text>
          )}
        </View>

        {loading ? (
          <>
            {/* Map placeholder */}
            <View style={{ height: 200, backgroundColor: '#1a1a2e', marginBottom: 20 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </View>
          </>
        ) : (
          <FlatList
            data={sortedTrips}
            numColumns={2}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            columnWrapperStyle={undefined}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={6}
            windowSize={5}
            initialNumToRender={6}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
