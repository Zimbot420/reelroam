import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import LottieView from 'lottie-react-native';
import { extractLocations } from '../lib/api/extract';
import { generateItinerary } from '../lib/api/itinerary';
import { fetchPlaceImages, SlideImage } from '../lib/api/fetchPlaceImages';
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

const SLIDE_DISPLAY_MS = 2200; // ms each image is fully visible
const MAP_ZOOM_WAIT_MS = 4200; // ms to wait for map zoom + brief destination view

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

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function ProcessingScreen() {
  const router = useRouter();
  const { url, platform } = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [statusMessage, setStatusMessage] = useState(STEPS[0].message);
  const [error, setError] = useState<string | null>(null);

  // Map phase
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Slideshow phase
  const [currentSlide, setCurrentSlide] = useState<SlideImage | null>(null);
  const [slideImages, setSlideImages] = useState<SlideImage[]>([]);
  const [slideIdx, setSlideIdx] = useState(0);

  // Completion
  const [showReady, setShowReady] = useState(false);

  // ── Animated values ──────────────────────────────────────────────────
  const progressAnim    = useRef(new Animated.Value(0)).current;
  const messageOpacity  = useRef(new Animated.Value(1)).current;
  const screenOpacity   = useRef(new Animated.Value(1)).current;
  const lottieOpacity   = useRef(new Animated.Value(1)).current;
  const mapOpacity      = useRef(new Animated.Value(0)).current;
  const slideshowOpacity = useRef(new Animated.Value(0)).current;
  const slideImageOpacity = useRef(new Animated.Value(0)).current;
  const pinScale        = useRef(new Animated.Value(0)).current;
  const readyScale      = useRef(new Animated.Value(0.6)).current;
  const readyOpacity    = useRef(new Animated.Value(0)).current;

  // ── Refs ─────────────────────────────────────────────────────────────
  const mapRef      = useRef<MapView>(null);
  const lottieRef   = useRef<LottieView>(null);

  // Slideshow control refs (avoid stale closures)
  const slideImagesRef      = useRef<SlideImage[]>([]);
  const slideIdxRef         = useRef(0);
  const slideshowActiveRef  = useRef(false);
  const itineraryReadyRef   = useRef(false);
  const pendingSlugRef      = useRef<string | null>(null);
  const slideTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigatedRef        = useRef(false);

  // ── Cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      slideshowActiveRef.current = false;
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, []);

  // ── Navigate when ready overlay appears ─────────────────────────────
  useEffect(() => {
    if (!showReady) return;
    if (navigatedRef.current) return;
    const slug = pendingSlugRef.current;
    if (!slug) return;
    navigatedRef.current = true;
    setTimeout(() => {
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        router.replace({ pathname: '/trip/[slug]', params: { slug } });
      });
    }, 800);
  }, [showReady]);

  // ── Pin pop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showPin) return;
    Animated.spring(pinScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start();
  }, [showPin]);

  // ── Ready overlay entrance ───────────────────────────────────────────
  useEffect(() => {
    if (!showReady) return;
    Animated.parallel([
      Animated.spring(readyScale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
      Animated.timing(readyOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [showReady]);

  // ── Helpers ──────────────────────────────────────────────────────────

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
    Animated.timing(progressAnim, { toValue: STEPS[step].progress, duration: 500, useNativeDriver: false }).start();
  }

  function setStatus(msg: string) {
    animateMessage(() => setStatusMessage(msg));
  }

  // Phase 2: cross-fade Lottie → Map, zoom camera
  function transitionToMap(coords: { lat: number; lng: number }) {
    Animated.parallel([
      Animated.timing(lottieOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(mapOpacity,    { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      mapRef.current?.animateCamera(
        { center: { latitude: coords.lat, longitude: coords.lng }, pitch: 45, heading: 0, altitude: 50_000, zoom: 11 },
        { duration: 3000 },
      );
      setTimeout(() => setShowPin(true), 3100);
    }, 200);
  }

  // Crossfade from current slide to next image
  function crossfadeToSlide(img: SlideImage, onComplete: () => void) {
    Animated.timing(slideImageOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setCurrentSlide(img);
      // Prefetch the one after next
      const nextNextIdx = (slideIdxRef.current + 1) % Math.max(1, slideImagesRef.current.length);
      const nextNext = slideImagesRef.current[nextNextIdx];
      if (nextNext) ExpoImage.prefetch(nextNext.url);
      Animated.timing(slideImageOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
        onComplete();
      });
    });
  }

  // Schedule the next slide tick — recursive, checks itinerary ready each time
  function scheduleNextSlide() {
    if (!slideshowActiveRef.current) return;
    slideTimerRef.current = setTimeout(() => {
      if (!slideshowActiveRef.current) return;

      if (itineraryReadyRef.current) {
        // Itinerary is ready — show completion overlay (navigation handled by useEffect)
        advanceTo(4);
        setShowReady(true);
        return;
      }

      // Advance to next slide (loop)
      const images = slideImagesRef.current;
      const nextIdx = (slideIdxRef.current + 1) % images.length;
      slideIdxRef.current = nextIdx;
      setSlideIdx(nextIdx);

      crossfadeToSlide(images[nextIdx], () => scheduleNextSlide());
    }, SLIDE_DISPLAY_MS);
  }

  // Phase 3: fade map → slideshow, start looping slides
  function startSlideshow(images: SlideImage[]) {
    slideImagesRef.current = images;
    slideIdxRef.current = 0;
    setSlideIdx(0);
    slideshowActiveRef.current = true;
    setSlideImages(images);
    setCurrentSlide(images[0]);

    // Prefetch second image while first is loading
    if (images.length > 1) ExpoImage.prefetch(images[1].url);

    // Give React one frame to render the slideshow layer before fading it in
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(mapOpacity,       { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(slideshowOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(slideImageOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start(() => {
          scheduleNextSlide();
        });
      });
    }, 100);
  }

  // ── Main processing pipeline ─────────────────────────────────────────
  useEffect(() => {
    if (!url || !platform) { setError('No URL provided.'); return; }

    const urlStr     = Array.isArray(url)      ? url[0]      : url;
    const platformStr = (Array.isArray(platform) ? platform[0] : platform) as 'tiktok' | 'instagram' | 'youtube';

    async function run() {
      try {
        // Step 0
        advanceTo(0);
        const [device_id] = await Promise.all([getOrCreateDeviceId(), getProStatusAsync()]);

        // TODO: re-enable rate limit gate before launch
        // if (!proStatus.isPro && proStatus.tripsRemaining === 0) { ... }

        await delay(500);
        advanceTo(1);
        await delay(400);

        // Step 2: extract locations
        advanceTo(2);
        const extraction = await extractLocations(urlStr, platformStr, device_id);

        // TODO: re-enable vision gate before launch

        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

        // Start image fetch + itinerary generation immediately (run in background)
        const imageFetchPromise = fetchPlaceImages(
          extraction.region,
          extraction.locations.map((l) => l.name),
          apiKey,
        );
        const itineraryPromise = generateItinerary({
          ...extraction,
          device_id,
          is_pro: false,
          source_url: urlStr,
          platform: platformStr,
        });

        // Step 3: show progress while things run
        advanceTo(3);

        // Geocode and start map zoom
        let mapZoomed = false;
        if (extraction.region && apiKey) {
          const coords = await geocodeRegion(extraction.region, apiKey);
          if (coords) {
            const shortName = extraction.region.split(',')[0];
            setStatus(`Found ${shortName}! Building your itinerary...`);
            setDestCoords(coords);
            transitionToMap(coords);
            mapZoomed = true;
          }
        }

        // Wait for map zoom + brief destination view before starting slideshow
        if (mapZoomed) await delay(MAP_ZOOM_WAIT_MS);

        // Collect images (should be ready since fetch started before the wait)
        const images = await imageFetchPromise;

        if (images.length > 0) {
          // ── SLIDESHOW PATH ───────────────────────────────────────────
          startSlideshow(images);

          // Wait for itinerary, then arm the "ready" flag
          const { slug } = await itineraryPromise;
          await incrementTripCount();
          Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
          pendingSlugRef.current = slug;
          itineraryReadyRef.current = true;
          // scheduleNextSlide() will detect itineraryReadyRef and call setShowReady(true)

        } else {
          // ── FALLBACK PATH (no images) ────────────────────────────────
          const { slug } = await itineraryPromise;
          advanceTo(4);
          await incrementTripCount();
          pendingSlugRef.current = slug;
          setShowReady(true);
        }

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

  // ── Derived display values ────────────────────────────────────────────
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const platformStr   = platform ? (Array.isArray(platform) ? platform[0] : platform) : null;
  const urlStr        = url ? (Array.isArray(url) ? url[0] : url) : '';
  const platformMeta  = platformStr ? PLATFORM_META[platformStr] : null;
  const shortUrl      = urlStr ? urlStr.replace(/^https?:\/\/(www\.)?/, '').slice(0, 45) : '';

  // ── Error screen ─────────────────────────────────────────────────────
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
        <TouchableOpacity onPress={() => router.replace('/')} className="w-full h-13 rounded-2xl items-center justify-center bg-gray-100">
          <Text className="text-gray-700 font-semibold text-base">Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────
  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#0a0a0a', opacity: screenOpacity }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── LAYER 1: Map (hidden at start, fades in during Phase 2) ── */}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '28%', opacity: mapOpacity }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          mapType="hybrid"
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          initialCamera={{ center: { latitude: 20, longitude: 0 }, pitch: 45, heading: 0, altitude: 8_000_000, zoom: 2 }}
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
      </Animated.View>

      {/* ── LAYER 2: Lottie globe (Phase 1, fades out when destination found) ── */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: '28%',
        alignItems: 'center', justifyContent: 'center',
        opacity: lottieOpacity,
      }}>
        <LottieView
          ref={lottieRef}
          source={require('../assets/animations/globe.json')}
          autoPlay
          loop
          style={{ width: '90%', aspectRatio: 1 }}
        />
      </Animated.View>

      {/* ── LAYER 3: Slideshow (Phase 3, fades in after map zoom) ── */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: '28%',
        overflow: 'hidden',
        opacity: slideshowOpacity,
      }}>
        {currentSlide && (
          <Animated.View style={{ flex: 1, opacity: slideImageOpacity }}>
            <ExpoImage
              source={{ uri: currentSlide.url }}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={0}
            />
            {/* Dark gradient overlay with location name */}
            <View style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 90,
              backgroundColor: 'rgba(0,0,0,0.65)',
              paddingHorizontal: 16, paddingBottom: 14,
              justifyContent: 'flex-end',
            }}>
              <Text style={{ color: 'white', fontSize: 24, fontWeight: '700' }} numberOfLines={1}>
                {currentSlide.locationName}
              </Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>

      {/* ── LAYER 4: "Your trip is ready!" overlay ── */}
      {showReady && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: '28%',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <Animated.View style={{ alignItems: 'center', transform: [{ scale: readyScale }], opacity: readyOpacity }}>
            <View style={{
              width: 84, height: 84, borderRadius: 42, backgroundColor: '#0D9488',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              shadowColor: '#0D9488', shadowOpacity: 0.5, shadowRadius: 24, elevation: 12,
            }}>
              <Ionicons name="checkmark" size={46} color="white" />
            </View>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>Your trip is ready!</Text>
          </Animated.View>
        </View>
      )}

      {/* ── STATUS PANEL — bottom 28% ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%',
        backgroundColor: '#0D0D0D',
        paddingHorizontal: 24, paddingTop: 18, paddingBottom: 40,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
      }}>
        {/* Progress bar */}
        <View style={{ height: 2, backgroundColor: '#374151', borderRadius: 1, marginBottom: 18, overflow: 'hidden' }}>
          <Animated.View style={{ height: 2, width: progressWidth, backgroundColor: '#0D9488', borderRadius: 1 }} />
        </View>

        {/* Platform chip */}
        {platformMeta && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 20, marginBottom: 12, alignSelf: 'flex-start',
            backgroundColor: platformMeta.color + '30',
          }}>
            <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: platformMeta.color, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={platformMeta.icon as any} size={10} color="white" />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)' }}>{platformMeta.label}</Text>
          </View>
        )}

        {/* Status message */}
        <Animated.View style={{ opacity: messageOpacity }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>{statusMessage}</Text>
          <Text style={{ color: '#6B7280', fontSize: 12 }} numberOfLines={1}>{shortUrl}</Text>
        </Animated.View>

        {/* Step progress dots (hidden during slideshow, replaced by slide dots) */}
        {slideImages.length === 0 && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
            {STEPS.map((_, i) => (
              <View key={i} style={{
                height: 6, borderRadius: 3,
                width: i === currentStep ? 18 : 6,
                backgroundColor: i <= currentStep ? '#0D9488' : '#374151',
              }} />
            ))}
          </View>
        )}

        {/* Slide image dots (shown during slideshow) */}
        {slideImages.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 16, flexWrap: 'wrap' }}>
            {slideImages.map((_, i) => (
              <View key={i} style={{
                height: 4, borderRadius: 2,
                width: i === slideIdx ? 16 : 4,
                backgroundColor: i === slideIdx ? 'white' : 'rgba(255,255,255,0.25)',
              }} />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}
