import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { pastTripDraft, resetPastTripDraft } from '../../lib/pastTripDraft';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const STEP_DOTS = [1, 2, 3, 4, 5];

interface Suggestion {
  place_id: string;
  description: string;
}

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {STEP_DOTS.map((s) => (
        <View
          key={s}
          style={{
            width: s === step ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: s === step ? TEAL : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </View>
  );
}

export default function PastTripDestination() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ name: string; placeId: string } | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [recentDestinations, setRecentDestinations] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset draft when entering this flow
  useEffect(() => {
    resetPastTripDraft();
    loadRecentDestinations();
  }, []);

  async function loadRecentDestinations() {
    try {
      const deviceId = await getOrCreateDeviceId();
      const query = supabase
        .from('trips')
        .select('title')
        .eq('is_past_trip', true)
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(8);

      const { data } = await query;
      if (data) {
        const unique = [...new Set(data.map((t: any) => t.title).filter(Boolean))];
        setRecentDestinations(unique.slice(0, 5) as string[]);
      }
    } catch {
      // ignore
    }
  }

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${API_KEY}&language=en`;
        const res = await fetch(url);
        const json = await res.json();
        setSuggestions(
          (json.predictions ?? []).map((p: any) => ({
            place_id: p.place_id,
            description: p.description,
          })),
        );
      } finally {
        setSearching(false);
      }
    }, 600);
  }, [query]);

  async function selectDestination(name: string, placeId: string) {
    setSelected({ name, placeId });
    setQuery(name);
    setSuggestions([]);
    Keyboard.dismiss();

    // Fetch cover photo (free via Unsplash/placeholders)
    setCoverLoading(true);
    setCoverUrl(null);
    try {
      const photos = await require('../../lib/api/photos').fetchLocationPhoto(name, 1);
      if (photos[0]) setCoverUrl(photos[0]);
    } finally {
      setCoverLoading(false);
    }
  }

  function handleContinue() {
    if (!selected) return;
    pastTripDraft.destination = selected.name;
    pastTripDraft.destinationPlaceId = selected.placeId;
    pastTripDraft.placesCoverUrl = coverUrl;
    router.push('/past-trip/when');
  }

  const showResults = suggestions.length > 0 && !selected;
  const showPreview = !!selected;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={20} color="white" />
          </TouchableOpacity>
          <ProgressDots step={1} />
          <View style={{ width: 36 }} />
        </View>

        <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
          Where did{'\n'}you go?
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, marginTop: 6 }}>
          Search for a city or destination
        </Text>
      </View>

      {/* Search input */}
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
            borderWidth: 1,
            borderColor: selected ? `${TEAL}60` : 'rgba(255,255,255,0.1)',
          }}
        >
          <Ionicons name="search" size={18} color={selected ? TEAL : 'rgba(255,255,255,0.4)'} />
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              if (selected) setSelected(null); // reset selection on new input
            }}
            placeholder="e.g. Tokyo, Bali, Paris..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={{ flex: 1, color: 'white', fontSize: 16 }}
            autoFocus
            returnKeyType="search"
          />
          {(searching) && <ActivityIndicator size="small" color={TEAL} />}
          {selected && (
            <TouchableOpacity onPress={() => { setSelected(null); setQuery(''); setCoverUrl(null); }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Autocomplete results */}
      {showResults && (
        <View
          style={{
            marginHorizontal: 16, marginTop: 6,
            backgroundColor: '#111827',
            borderRadius: 14, borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            overflow: 'hidden', maxHeight: 240,
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={s.place_id}
                onPress={() => selectDestination(s.description.split(',')[0], s.place_id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: 14, paddingVertical: 13,
                  borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <View
                  style={{
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: 'rgba(13,148,136,0.15)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="location-outline" size={14} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                    {s.description.split(',')[0]}
                  </Text>
                  <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 }}>
                    {s.description.split(',').slice(1).join(',').trim()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Destination preview */}
      {showPreview && (
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View
            style={{
              borderRadius: 16, overflow: 'hidden',
              height: 160,
              backgroundColor: '#1a2030',
            }}
          >
            {coverLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={TEAL} />
              </View>
            ) : coverUrl ? (
              <ExpoImage
                source={{ uri: coverUrl }}
                contentFit="cover"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            ) : (
              <LinearGradient
                colors={['#004d40', '#006064', '#01579b']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View style={{ position: 'absolute', bottom: 12, left: 14 }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>
                {selected.name}
              </Text>
              <Text style={{ color: TEAL, fontSize: 13, marginTop: 3, fontWeight: '600' }}>
                Looks amazing! When did you go? →
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent destinations */}
      {recentDestinations.length > 0 && !selected && suggestions.length === 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Recent
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {recentDestinations.map((dest) => (
              <TouchableOpacity
                key={dest}
                onPress={() => selectDestination(dest, '')}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.5)" />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{dest}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Continue button */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 20, left: 16, right: 16 }}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
          style={{
            backgroundColor: selected ? TEAL : 'rgba(255,255,255,0.1)',
            borderRadius: 16, paddingVertical: 18, alignItems: 'center',
            shadowColor: selected ? TEAL : 'transparent',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
          }}
        >
          <Text
            style={{
              color: selected ? 'white' : 'rgba(255,255,255,0.3)',
              fontSize: 17, fontWeight: '700',
            }}
          >
            Continue →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
