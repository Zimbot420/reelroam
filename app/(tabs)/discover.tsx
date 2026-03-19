import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { useLanguage } from '../../lib/context/LanguageContext';

// ─── Category detection ───────────────────────────────────────────────────────

const CATEGORY_IDS = ['all', 'beach', 'city', 'nature', 'food', 'culture', 'budget'] as const;
type CategoryId = typeof CATEGORY_IDS[number];

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
  isActive,
  onPress,
  savedKey,
}: {
  trip: Trip;
  deviceId: string;
  cardHeight: number;
  isActive: boolean;
  onPress: () => void;
  savedKey: number;
}) {
  return <FeedTripCard trip={trip} deviceId={deviceId} cardHeight={cardHeight} isActive={isActive} onPress={onPress} savedKey={savedKey} />;
});

// ─── Discover screen ──────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  // Card fills screen minus tab bar (base + bottom inset)
  const cardHeight = screenHeight - TAB_BAR_BASE - insets.bottom;

  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [deviceId, setDeviceId] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [savedKey, setSavedKey] = useState(0);
  const pageRef = useRef(0);
  const fetchedAllRef = useRef(false);

  // Stable refs for FlatList viewability tracking
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
  }, []);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
    loadInitial();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSavedKey((k) => k + 1);
    }, [])
  );

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

  const renderItem = useCallback(({ item, index }: { item: Trip; index: number }) => (
    <MemoCard
      trip={item}
      deviceId={deviceId}
      cardHeight={cardHeight}
      isActive={index === activeIndex}
      savedKey={savedKey}
      onPress={() => { if (item.share_slug) router.push({ pathname: '/trip/[slug]' as any, params: { slug: item.share_slug } }); }}
    />
  ), [deviceId, cardHeight, activeIndex, savedKey]);

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
          <View style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: 'rgba(13,148,136,0.15)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: 'rgba(13,148,136,0.3)',
          }}>
            <ActivityIndicator color="#0D9488" size="small" />
          </View>
        </View>
      );
    }
    if (!hasMore && filteredTrips.length > 0) {
      return (
        <View style={{ height: cardHeight, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a1a', paddingHorizontal: 40 }}>
          <Ionicons name="checkmark-circle-outline" size={48} color="rgba(13,148,136,0.5)" style={{ marginBottom: 16 }} />
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 20, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 }}>
            {t.discover.seenItAll}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
            {t.discover.adventurePrompt}
          </Text>
          <TouchableOpacity
            onPress={() => router.navigate('/' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#0D9488', '#0a7a70']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 28, paddingHorizontal: 28, paddingVertical: 14,
                shadowColor: '#0D9488', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{t.discover.generateYourOwn}</Text>
            </LinearGradient>
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
        {activeCategory === 'all' ? t.discover.noTrips : t.discover.noCategoryTrips.replace('{category}', t.discover.categories[activeCategory])}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>
        {activeCategory === 'all' ? t.discover.beFirst : t.discover.tryDifferent}
      </Text>
      <TouchableOpacity
        onPress={() => router.navigate('/' as any)}
        style={{ backgroundColor: '#0D9488', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 }}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{t.discover.generateTrip}</Text>
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
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={2}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
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
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 2 }}
        >
          {CATEGORY_IDS.map((catId) => {
            const isActive = activeCategory === catId;
            const label = t.discover.categories[catId];
            return (
              <TouchableOpacity
                key={catId}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(catId);
                }}
                activeOpacity={0.75}
              >
                {isActive ? (
                  <LinearGradient
                    colors={['#0D9488', '#0a8f83']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      shadowColor: '#0D9488',
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 5,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', letterSpacing: 0.2 }}>
                      {label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.18)',
                    }}
                  >
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '400', letterSpacing: 0.2 }}>
                      {label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
