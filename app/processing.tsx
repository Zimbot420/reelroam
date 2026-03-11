import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { extractLocations } from '../lib/api/extract';
import { generateItinerary } from '../lib/api/itinerary';
import { saveTrip } from '../lib/api/trips';

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

function GlobeIcon({ pulseAnim }) {
  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View className="w-24 h-24 rounded-full items-center justify-center" style={{ backgroundColor: '#CCFBF1' }}>
        <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: '#0D9488' }}>
          <Ionicons name="earth-outline" size={44} color="white" />
        </View>
      </View>
    </Animated.View>
  );
}

export default function ProcessingScreen() {
  const router = useRouter();
  const { url, platform } = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const [isDone, setIsDone] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, []);

  function advanceTo(step) {
    Animated.timing(messageOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentStep(step);
      Animated.timing(messageOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
    Animated.timing(progressAnim, { toValue: STEPS[step].progress, duration: 500, useNativeDriver: false }).start();
  }

  useEffect(() => {
    if (!url || !platform) { setError('No URL provided.'); return; }
    async function run() {
      try {
        advanceTo(0);
        await new Promise((r) => setTimeout(r, 500));
        advanceTo(1);
        await new Promise((r) => setTimeout(r, 600));
        advanceTo(2);
        const extraction = await extractLocations(url, platform);
        if (extraction.needsVision) {
          router.replace({ pathname: '/upgrade', params: { reason: 'vision', url, platform } });
          return;
        }
        advanceTo(3);
        const { title, itinerary } = await generateItinerary(extraction.locations, platform);
        advanceTo(4);
        const trip = await saveTrip({ sourceUrl: url, platform, title, locations: extraction.locations, itinerary, extractionMethod: extraction.extractionMethod, isPro: false });
        Animated.timing(progressAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start(() => {
          setIsDone(true);
          setTimeout(() => { router.replace({ pathname: '/trip/[slug]', params: { slug: trip.share_slug } }); }, 400);
        });
      } catch (err) {
        setError(err?.message?.includes('Failed to save')
          ? 'We could not save your trip. Please check your connection and try again.'
          : 'Something went wrong. The link may be private or unsupported.');
      }
    }
    run();
  }, []);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const platformMeta = platform ? PLATFORM_META[platform] : null;
  const shortUrl = url ? url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 45) : '';

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        </View>
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">Something went wrong</Text>
        <Text className="text-gray-500 text-sm text-center leading-relaxed mb-8">{error}</Text>
        <TouchableOpacity onPress={() => router.replace({ pathname: '/', params: { prefillUrl: url } })} className="w-full h-13 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: '#0D9488' }}>
          <Text className="text-white font-semibold text-base">Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/')} className="w-full h-13 rounded-2xl items-center justify-center bg-gray-100">
          <Text className="text-gray-700 font-semibold text-base">Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="h-1 bg-gray-100 w-full">
        <Animated.View className="h-1 rounded-full" style={{ width: progressWidth, backgroundColor: '#0D9488' }} />
      </View>
      <View className="flex-1 items-center justify-center px-8">
        {platformMeta && (
          <View className="flex-row items-center gap-2 px-3 py-1.5 rounded-full mb-10" style={{ backgroundColor: platformMeta.color + '18' }}>
            <View className="w-5 h-5 rounded-md items-center justify-center" style={{ backgroundColor: platformMeta.color }}>
              <Ionicons name={platformMeta.icon} size={11} color="white" />
            </View>
            <Text className="text-xs font-medium" style={{ color: platformMeta.color }}>{platformMeta.label}</Text>
          </View>
        )}
        <GlobeIcon pulseAnim={pulseAnim} />
        <Animated.View className="mt-10 items-center" style={{ opacity: messageOpacity }}>
          <Text className="text-lg font-semibold text-gray-900 text-center">{isDone ? 'Done!' : STEPS[currentStep].message}</Text>
          <Text className="text-gray-400 text-xs mt-2 text-center" numberOfLines={1}>{shortUrl}</Text>
        </Animated.View>
        <View className="flex-row gap-1.5 mt-8">
          {STEPS.map((_, i) => (
            <View key={i} className="rounded-full" style={{ width: i === currentStep ? 18 : 6, height: 6, backgroundColor: i <= currentStep ? '#0D9488' : '#E5E7EB' }} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
