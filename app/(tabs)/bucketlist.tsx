import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FeedTripCard, { FeedTripCardSkeleton } from '../../components/FeedTripCard';
import { getSavedTrips } from '../../lib/supabase';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { Trip } from '../../types';

const CARD_HEIGHT = 480;
const CARD_GAP = 16;
const ITEM_HEIGHT = CARD_HEIGHT + CARD_GAP;

export default function BucketListScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    getOrCreateDeviceId().then((id) => {
      setDeviceId(id);
      loadSavedTrips(id);
    });
  }, []);

  async function loadSavedTrips(id: string) {
    try {
      setLoading(true);
      const data = await getSavedTrips(id);
      setTrips(data);
    } catch (e) {
      console.error('Bucket list load error:', e);
    } finally {
      setLoading(false);
    }
  }

  const renderItem = useCallback(({ item }: { item: Trip }) => (
    <View style={{ paddingHorizontal: 20 }}>
      <FeedTripCard
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

  const ListEmpty = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🔖</Text>
      <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
        No saved trips yet
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, textAlign: 'center', marginHorizontal: 32, marginBottom: 28, lineHeight: 22 }}>
        Bookmark trips you love in the Discover feed and they'll appear here
      </Text>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.navigate('/discover' as any);
        }}
        style={{ backgroundColor: '#0D9488', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 13 }}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Browse Discover</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: '700' }}>Bucket List</Text>
        </View>

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
            data={trips}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
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
