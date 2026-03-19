import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { searchAll } from '../lib/supabase';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

type Tab = 'all' | 'trips' | 'users';

// ─── Trip result row ─────────────────────────────────────────────────────────

function TripRow({ trip, onPress }: { trip: any; onPress: () => void }) {
  const destination = trip.itinerary?.destination ?? '';
  const days = trip.itinerary?.totalDays ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        gap: 12,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: 'rgba(13,148,136,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="map-outline" size={20} color={TEAL} />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' }}
          numberOfLines={1}
        >
          {trip.title ?? 'Untitled Trip'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {destination ? (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }} numberOfLines={1}>
              {destination}
            </Text>
          ) : null}
          {days > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
              {days} {days === 1 ? 'day' : 'days'}
            </Text>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {(trip.like_count ?? 0) > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name="heart" size={12} color="rgba(255,255,255,0.3)" />
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{trip.like_count}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
      </View>
    </TouchableOpacity>
  );
}

// ─── User result row ─────────────────────────────────────────────────────────

function UserRow({ user, onPress }: { user: any; onPress: () => void }) {
  const countriesCount = (user.visited_countries as string[] | undefined)?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        gap: 12,
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(13,148,136,0.12)',
          borderWidth: 1,
          borderColor: 'rgba(13,148,136,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22 }}>{user.avatar_emoji ?? '🌍'}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' }}
          numberOfLines={1}
        >
          {user.display_name ?? user.username}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            @{user.username}
          </Text>
          {countriesCount > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
              {countriesCount} {countriesCount === 1 ? 'country' : 'countries'}
            </Text>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
        gap: 6,
      }}
    >
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>{count}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [trips, setTrips] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setTrips([]);
      setUsers([]);
      setSearched(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchAll(query);
        setTrips(results.trips);
        setUsers(results.users);
        setSearched(true);
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Filter by tab
  const showTrips = tab === 'all' || tab === 'trips';
  const showUsers = tab === 'all' || tab === 'users';
  const visibleTrips = showTrips ? trips : [];
  const visibleUsers = showUsers ? users : [];

  // Build flat list data with section headers
  const listData = useCallback(() => {
    const items: { type: 'section' | 'trip' | 'user'; data: any; key: string }[] = [];
    if (visibleUsers.length > 0) {
      items.push({ type: 'section', data: { label: 'Users', count: visibleUsers.length }, key: 'section-users' });
      visibleUsers.forEach((u) => items.push({ type: 'user', data: u, key: `user-${u.username}` }));
    }
    if (visibleTrips.length > 0) {
      items.push({ type: 'section', data: { label: 'Trips', count: visibleTrips.length }, key: 'section-trips' });
      visibleTrips.forEach((t) => items.push({ type: 'trip', data: t, key: `trip-${t.id}` }));
    }
    return items;
  }, [visibleTrips, visibleUsers]);

  const totalResults = trips.length + users.length;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header: back + search input */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius: 14,
            paddingHorizontal: 12,
            height: 44,
            borderWidth: 1,
            borderColor: query ? 'rgba(13,148,136,0.3)' : 'rgba(255,255,255,0.08)',
          }}
        >
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search trips, users, destinations..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={{ flex: 1, color: 'white', fontSize: 15 }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab pills */}
      {searched && totalResults > 0 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {(['all', 'trips', 'users'] as Tab[]).map((t) => {
            const active = tab === t;
            const count = t === 'all' ? totalResults : t === 'trips' ? trips.length : users.length;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t); }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: active ? TEAL : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: active ? TEAL : 'rgba(255,255,255,0.1)',
                }}
              >
                <Text style={{ color: active ? 'white' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Results */}
      {loading && (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={TEAL} />
        </View>
      )}

      {!loading && searched && totalResults === 0 && (
        <View style={{ paddingTop: 60, alignItems: 'center', gap: 8 }}>
          <Ionicons name="search-outline" size={36} color="rgba(255,255,255,0.12)" />
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>No results found</Text>
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Try a different search term</Text>
        </View>
      )}

      {!loading && !searched && (
        <View style={{ paddingTop: 60, alignItems: 'center', gap: 8 }}>
          <Ionicons name="search" size={36} color="rgba(255,255,255,0.08)" />
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
            Search for trips, destinations, or travelers
          </Text>
        </View>
      )}

      {!loading && searched && totalResults > 0 && (
        <FlatList
          data={listData()}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return <SectionLabel label={item.data.label} count={item.data.count} />;
            }
            if (item.type === 'user') {
              return (
                <UserRow
                  user={item.data}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/profile/${item.data.username}` as any);
                  }}
                />
              );
            }
            return (
              <TripRow
                trip={item.data}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (item.data.share_slug) {
                    router.push({ pathname: '/trip/[slug]', params: { slug: item.data.share_slug } } as any);
                  }
                }}
              />
            );
          }}
        />
      )}
    </View>
  );
}
