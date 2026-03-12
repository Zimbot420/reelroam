import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { extractLocations } from '../lib/api/extract';
import { generateItinerary } from '../lib/api/itinerary';
import { getOrCreateDeviceId } from '../lib/deviceId';
import { getProStatusAsync, incrementTripCount } from '../hooks/useProStatus';

type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = [
  { message: 'Detecting platform...', progress: 0.10 },
  { message: 'Fetching video details...', progress: 0.30 },
  { message: 'Extracting locations...', progress: 0.60 },
  { message: 'Building your itinerary...', progress: 0.85 },
  { message: 'Almost ready...', progress: 1.00 },
];

const PLATFORM_META = {
  tiktok:    { label: 'TikTok',    icon: 'musical-notes', color: '#000000' },
  instagram: { label: 'Instagram', icon: 'camera',        color: '#E1306C' },
  youtube:   { label: 'YouTube',   icon: 'logo-youtube',  color: '#FF0000' },
};

async function geocodeRegion(
  region: string,
  apiKey: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(region)}&key=${apiKey}`,
    );
    const json = await res.json();
    const loc = json.results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat, lng: loc.lng } : null;
  } catch {
    return null;
  }
}

export default function ProcessingScreen() {
  const router = useRouter();
  const { url, platform } = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [statusMessage, setStatusMessage] = useState(STEPS[0].message);
  const [error, setError] = useState<string | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showPin, setShowPin] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const pinScale = useRef(new Animated.Value(0)).current;

  const mapRef = useRef<MapView>(null);
  const panLngRef = useRef(0);
  const panIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panActiveRef = useRef(true);

  // Globe slow-pan: start after map mounts, rotate longitude every 3s
  useEffect(() => {
    const startDelay = setTimeout(() => {
      panIntervalRef.current = setInterval(() => {
        if (!panActiveRef.current) return;
        panLngRef.current = (panLngRef.current + 35) % 360;
        mapRef.current?.animateCamera(
          {
            center: { latitude: 20, longitude: panLngRef.current },
            pitch: 0,
            heading: 0,
            altitude: 20_000_000,
            zoom: 1,
          },
          { duration: 2800 },
        );
      }, 3200);
    }, 1200);

    return () => {
      clearTimeout(startDelay);
      if (panIntervalRef.current) clearInterval(panIntervalRef.current);
    };
  }, []);

  // Pin spring pop when shown
  useEffect(() => {
    if (!showPin) return;
    Animated.spring(pinScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 6,
    }).start();
  }, [showPin]);

  function animateMessage(next: () => void) {
    Animated.timing(messageOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      next();
      Animated.timing(messageOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }

  function advanceTo(step: Step) {
    animateMessage(() => {
      setCurrentStep(step);
      setStatusMessage(STEPS[step].message);
    });
    Animated.timing(progressAnim, {
      toValue: STEPS[step].progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }

  function setStatus(msg: string) {
    animateMessage(() => setStatusMessage(msg));
  }

  useEffect(() => {
    if (!url || !platform) { setError('No URL provided.'); return; }

    const urlStr = Array.isArray(url) ? url[0] : url;
    const platformStr = (Array.isArray(platform) ? platform[0] : platform) as 'tiktok' | 'instagram' | 'youtube';

    async function run() {
      try {
        // Step 0: Detect platform
        advanceTo(0);
        const [device_id, proStatus] = await Promise.all([
          getOrCreateDeviceId(),
          getProStatusAsync(),
        ]);

        if (!proStatus.isPro && proStatus.tripsRemaining === 0) {
          router.replace({ pathname: '/upgrade', params: { reason: 'rate_limit' } });
          return;
        }

        await new Promise((r) => setTimeout(r, 500));

        // Step 1: Fetch video details
        advanceTo(1);
        await new Promise((r) => setTimeout(r, 400));

        // Step 2: Extract locations
        advanceTo(2);
        const extraction = await extractLocations(urlStr, platformStr, device_id);

        // TODO: re-enable vision gate before launch
        // if (extraction.needsVision) {
        //   router.replace({ pathname: '/upgrade', params: { reason: 'vision', url: urlStr, platform: platformStr } });
        //   return;
        // }

        // Phase 2: zoom the globe to the destination
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
        if (extraction.region && apiKey) {
          const coords = await geocodeRegion(extraction.region, apiKey);
          if (coords) {
            panActiveRef.current = false;
            setStatus('Found it! Building your itinerary...');
            mapRef.current?.animateCamera(
              {
                center: { latitude: coords.lat, longitude: coords.lng },
                pitch: 0,
                heading: 0,
                altitude: 50_000,
                zoom: 11,
              },
              { duration: 2500 },
            );
            setDestCoords(coords);
            setTimeout(() => setShowPin(true), 2600);
          }
        }

        // Step 3: Generate itinerary (runs while zoom is animating)
        advanceTo(3);
        const { slug } = await generateItinerary({
          ...extraction,
          device_id,
          is_pro: false,
          source_url: urlStr,
          platform: platformStr,
        });

        // Step 4: Done
        advanceTo(4);
        await incrementTripCount();
        Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();

        setTimeout(() => {
          Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
            router.replace({ pathname: '/trip/[slug]', params: { slug } });
          });
        }, 600);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '';
        if (message === 'RATE_LIMIT_EXCEEDED') {
          router.replace({ pathname: '/upgrade', params: { reason: 'rate_limit' } });
          return;
        }
        setError(
          message.includes('Failed to save')
            ? 'We could not save your trip. Please check your connection and try again.'
            : message.includes('private') || message.includes('login') || message.includes('deleted')
            ? message
            : 'Something went wrong. The link may be private or unsupported.',
        );
      }
    }
    run();
  }, []);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const platformStr = platform ? (Array.isArray(platform) ? platform[0] : platform) : null;
  const urlStr = url ? (Array.isArray(url) ? url[0] : url) : '';
  const platformMeta = platformStr ? PLATFORM_META[platformStr] : null;
  const shortUrl = urlStr ? urlStr.replace(/^https?:\/\/(www\.)?/, '').slice(0, 45) : '';

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        </View>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">Something went wrong</Text>
        <Text className="text-gray-500 text-sm text-center leading-relaxed mb-8">{error}</Text>
        <TouchableOpacity
          onPress={() => router.replace({ pathname: '/', params: { prefillUrl: urlStr } })}
          className="w-full h-13 rounded-2xl items-center justify-center mb-3"
          style={{ backgroundColor: '#0D9488' }}
        >
          <Text className="text-white font-semibold text-base">Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.replace('/')}
          className="w-full h-13 rounded-2xl items-center justify-center bg-gray-100"
        >
          <Text className="text-gray-700 font-semibold text-base">Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#000', opacity: screenOpacity }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Full-screen globe map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        mapType="hybrid"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        initialCamera={{
          center: { latitude: 20, longitude: 0 },
          pitch: 0,
          heading: 0,
          altitude: 20_000_000,
          zoom: 1,
        }}
      >
        {showPin && destCoords && (
          <Marker coordinate={{ latitude: destCoords.lat, longitude: destCoords.lng }}>
            <Animated.View style={{ transform: [{ scale: pinScale }] }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: '#0D9488', borderWidth: 3, borderColor: 'white',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, elevation: 10,
              }}>
                <Ionicons name="location" size={22} color="white" />
              </View>
            </Animated.View>
          </Marker>
        )}
      </MapView>

      {/* Status panel overlaid at the bottom */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.82)',
        paddingHorizontal: 24, paddingTop: 18, paddingBottom: 44,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
      }}>
        {/* Progress bar */}
        <View style={{
          height: 2, backgroundColor: '#374151', borderRadius: 1,
          marginBottom: 18, overflow: 'hidden',
        }}>
          <Animated.View style={{
            height: 2, width: progressWidth,
            backgroundColor: '#0D9488', borderRadius: 1,
          }} />
        </View>

        {/* Platform chip */}
        {platformMeta && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 20, marginBottom: 12, alignSelf: 'flex-start',
            backgroundColor: platformMeta.color + '30',
          }}>
            <View style={{
              width: 18, height: 18, borderRadius: 4,
              backgroundColor: platformMeta.color,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={platformMeta.icon as any} size={10} color="white" />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)' }}>
              {platformMeta.label}
            </Text>
          </View>
        )}

        {/* Status message */}
        <Animated.View style={{ opacity: messageOpacity }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
            {statusMessage}
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 12 }} numberOfLines={1}>{shortUrl}</Text>
        </Animated.View>

        {/* Step dots */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                height: 6, borderRadius: 3,
                width: i === currentStep ? 18 : 6,
                backgroundColor: i <= currentStep ? '#0D9488' : '#374151',
              }}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
