import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import FeedTripCard, { FeedTripCardSkeleton } from '../../components/FeedTripCard';
import { getPublicFeedTrips } from '../../lib/supabase';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { Trip } from '../../types';

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
  return 'city';
}

// Standard tab bar heights (used to compute available card height)
const TAB_BAR_BASE = Platform.OS === 'ios' ? 49 : 56;

// ─── Memoised card wrapper ────────────────────────────────────────────────────

const MemoCard = React.memo(function MemoCard({
  trip,
  deviceId,
  cardHeight,
  onPress,
}: {
  trip: Trip;
  deviceId: string;
  cardHeight: number;
  onPress: () => void;
}) {
  return <FeedTripCard trip={trip} deviceId={deviceId} cardHeight={cardHeight} onPress={onPress} />;
});

// ─── Discover screen ──────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Card fills screen minus tab bar (base + bottom inset)
  const cardHeight = screenHeight - TAB_BAR_BASE - insets.bottom;

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
      const shuffled = [...data].sort(() => Math.random() - 0.48);
      setAllTrips(shuffled);
      setHasMore(data.length === 20);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }

  const filteredTrips = useMemo(() => {
    if (activeCategory === 'all') return allTrips;
    return allTrips.filter((t) => detectCategory(t) === activeCategory);
  }, [allTrips, activeCategory]);

  const renderItem = useCallback(({ item }: { item: Trip }) => (
    <MemoCard
      trip={item}
      deviceId={deviceId}
      cardHeight={cardHeight}
      onPress={() => router.push({ pathname: '/trip/[slug]' as any, params: { slug: item.share_slug } })}
    />
  ), [deviceId, cardHeight]);

  const keyExtractor = useCallback((item: Trip) => item.id, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: cardHeight,
    offset: cardHeight * index,
    index,
  }), [cardHeight]);

  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={{ height: cardHeight, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a1a' }}>
          <ActivityIndicator color="#0D9488" size="large" />
        </View>
      );
    }
    if (!hasMore && filteredTrips.length > 0) {
      return (
        <View style={{ height: cardHeight, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a1a' }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🌍</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginBottom: 24 }}>
            You've seen it all
          </Text>
          <TouchableOpacity
            onPress={() => router.navigate('/' as any)}
            style={{ backgroundColor: '#0D9488', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Generate your own →</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const ListEmpty = () => (
    <View style={{ height: cardHeight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, backgroundColor: '#0a0a1a' }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🌍</Text>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
        {activeCategory === 'all' ? 'No trips yet' : `No ${activeCategory} trips`}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>
        {activeCategory === 'all'
          ? 'Be the first to share a trip to the feed'
          : 'Try a different category or check back later'}
      </Text>
      <TouchableOpacity
        onPress={() => router.navigate('/' as any)}
        style={{ backgroundColor: '#0D9488', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 }}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Generate a Trip</Text>
      </TouchableOpacity>
    </View>
  );

  // Top of category pills — just below the status bar
  const pillsTop = insets.top + 8;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* ── Full-screen paginated FlatList ── */}
      {loading ? (
        <FeedTripCardSkeleton height={cardHeight} />
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          pagingEnabled
          decelerationRate="fast"
          snapToAlignment="start"
          snapToInterval={cardHeight}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={2}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
          style={{ flex: 1 }}
        />
      )}

      {/* ── Category pills overlay (floats above the feed) ── */}
      {/* Top gradient so pills are legible over the image */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: pillsTop + 60,
          zIndex: 9,
        }}
        pointerEvents="none"
      />
      <View
        style={{
          position: 'absolute',
          top: pillsTop,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveCategory(cat.id);
              }}
              style={{
                paddingHorizontal: 13,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: activeCategory === cat.id
                  ? '#0D9488'
                  : 'rgba(0,0,0,0.45)',
                borderWidth: 1,
                borderColor: activeCategory === cat.id
                  ? '#0D9488'
                  : 'rgba(255,255,255,0.25)',
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 12,
                  fontWeight: activeCategory === cat.id ? '700' : '400',
                }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
