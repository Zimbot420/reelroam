import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import FeedTripCard, { FeedTripCardSkeleton } from '../components/FeedTripCard';
import { getPublicFeedTrips } from '../lib/supabase';
import { getOrCreateDeviceId } from '../lib/deviceId';
import { Trip } from '../types';

// ─── Category detection ───────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',     label: '✨ All' },
  { id: 'beach',   label: '🏖️ Beach' },
  { id: 'city',    label: '🏙️ City' },
  { id: 'nature',  label: '🏔️ Nature' },
  { id: 'food',    label: '🍜 Food' },
  { id: 'culture', label: '🎭 Culture' },
  { id: 'budget',  label: '💰 Budget' },
];

function detectCategory(trip: Trip): string {
  const text = `${trip.title ?? ''} ${trip.itinerary?.destination ?? ''} ${trip.locations?.[0]?.name ?? ''}`.toLowerCase();

  if (/beach|bali|maldives|santorini|amalfi|rio|caribbean|ibiza|phuket|hawaii/.test(text)) return 'beach';
  if (/safari|kenya|iceland|patagonia|amazon|yellowstone|himalaya|mountain|nature|fjord/.test(text)) return 'nature';
  if (/food|bangkok|mexico|street food|culinary|ramen|pasta|cuisine|taste|eat/.test(text)) return 'food';
  if (/temple|kyoto|marrakech|rome|culture|museum|history|heritage|ancient|art/.test(text)) return 'culture';
  if (/budget|cheap|backpacker|hostel|affordable|free|low.cost/.test(text)) return 'budget';
  if (/tokyo|paris|new york|london|dubai|barcelona|sydney|amsterdam|lisbon|city|urban/.test(text)) return 'city';
  return 'city'; // default
}

// ─── Card height constants ────────────────────────────────────────────────────

const CARD_HEIGHT = 480;
const CARD_GAP = 16;
const ITEM_HEIGHT = CARD_HEIGHT + CARD_GAP;

// ─── Memoised card wrapper ────────────────────────────────────────────────────

const MemoCard = React.memo(function MemoCard({
  trip,
  deviceId,
  onPress,
}: {
  trip: Trip;
  deviceId: string;
  onPress: () => void;
}) {
  return <FeedTripCard trip={trip} deviceId={deviceId} onPress={onPress} />;
});

// ─── Discover screen ──────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const router = useRouter();
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [deviceId, setDeviceId] = useState('');
  const pageRef = useRef(0);
  const fetchedAllRef = useRef(false);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      setLoading(true);
      pageRef.current = 0;
      fetchedAllRef.current = false;
      const data = await getPublicFeedTrips(0);
      setAllTrips(data);
      setHasMore(data.length === 20);
    } catch (e) {
      console.error('Feed load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore || fetchedAllRef.current) return;
    try {
      setLoadingMore(true);
      pageRef.current += 1;
      const data = await getPublicFeedTrips(pageRef.current);
      if (data.length === 0) {
        setHasMore(false);
        fetchedAllRef.current = true;
      } else {
        setAllTrips((prev) => {
          const ids = new Set(prev.map((t) => t.id));
          return [...prev, ...data.filter((t: Trip) => !ids.has(t.id))];
        });
        if (data.length < 20) {
          setHasMore(false);
          fetchedAllRef.current = true;
        }
      }
    } catch (e) {
      console.error('Load more error:', e);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      pageRef.current = 0;
      fetchedAllRef.current = false;
      const data = await getPublicFeedTrips(0);
      // Shuffle slightly for freshness
      const shuffled = [...data].sort(() => Math.random() - 0.48);
      setAllTrips(shuffled);
      setHasMore(data.length === 20);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }

  // Filter trips by active category (client-side)
  const filteredTrips = useMemo(() => {
    if (activeCategory === 'all') return allTrips;
    return allTrips.filter((t) => detectCategory(t) === activeCategory);
  }, [allTrips, activeCategory]);

  const renderItem = useCallback(({ item }: { item: Trip }) => (
    <View style={{ paddingHorizontal: 20 }}>
      <MemoCard
        trip={item}
        deviceId={deviceId}
        onPress={() => router.push({ pathname: '/trip/[slug]' as any, params: { slug: item.share_slug } })}
      />
    </View>
  ), [deviceId]);

  const keyExtractor = useCallback((item: Trip) => item.id, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color="#0D9488" />
        </View>
      );
    }
    if (!hasMore && filteredTrips.length > 0) {
      return (
        <TouchableOpacity
          onPress={() => router.replace('/')}
          style={{ paddingVertical: 32, alignItems: 'center' }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 8 }}>
            You've seen it all
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#0D9488', fontSize: 14, fontWeight: '600' }}>
              Generate your own →
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const ListEmpty = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🌍</Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
        {activeCategory === 'all'
          ? 'No trips yet — be the first to share one'
          : `No ${activeCategory} trips yet`}
      </Text>
      <TouchableOpacity
        onPress={() => router.replace('/')}
        style={{ backgroundColor: '#0D9488', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12 }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>Generate a Trip</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: '700' }}>Discover</Text>
          <TouchableOpacity>
            <Ionicons name="search-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* ── Category pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveCategory(cat.id);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: activeCategory === cat.id ? '#0D9488' : 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                borderColor: activeCategory === cat.id ? '#0D9488' : 'rgba(255,255,255,0.12)',
              }}
            >
              <Text style={{ color: 'white', fontSize: 13, fontWeight: activeCategory === cat.id ? '600' : '400' }}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Feed ── */}
        {loading ? (
          <FlatList
            data={[1, 2, 3]}
            keyExtractor={(i) => String(i)}
            renderItem={() => (
              <View style={{ paddingHorizontal: 20 }}>
                <FeedTripCardSkeleton />
              </View>
            )}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
          />
        ) : (
          <FlatList
            data={filteredTrips}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListFooterComponent={ListFooter}
            ListEmptyComponent={ListEmpty}
            removeClippedSubviews
            maxToRenderPerBatch={3}
            windowSize={5}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
