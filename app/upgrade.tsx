import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type UpgradeReason = 'rate_limit' | 'vision' | undefined;

// ─── Feature row ──────────────────────────────────────────────────────────────

function FeatureRow({
  label,
  free,
  pro,
}: {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}) {
  return (
    <View className="flex-row items-center py-3 border-b border-gray-50">
      <Text className="flex-1 text-sm text-gray-700">{label}</Text>
      <View className="w-20 items-center">
        {typeof free === 'boolean' ? (
          <Ionicons
            name={free ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={free ? '#0D9488' : '#D1D5DB'}
          />
        ) : (
          <Text className="text-xs text-gray-500 text-center">{free}</Text>
        )}
      </View>
      <View className="w-20 items-center">
        {typeof pro === 'boolean' ? (
          <Ionicons
            name={pro ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={pro ? '#0D9488' : '#D1D5DB'}
          />
        ) : (
          <Text className="text-xs font-semibold text-teal-700 text-center">{pro}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ opacity, position: 'absolute', bottom: 100, left: 20, right: 20, alignItems: 'center', zIndex: 99 }}
    >
      <View className="bg-gray-900 rounded-2xl px-5 py-3">
        <Text className="text-white text-sm font-medium">{message}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Upgrade screen ───────────────────────────────────────────────────────────

const REASON_COPY: Record<string, { title: string; subtitle: string }> = {
  rate_limit: {
    title: "You've used all 3 free trips",
    subtitle: "Upgrade to Pro for unlimited trips and AI vision analysis.",
  },
  vision: {
    title: 'Vision analysis is a Pro feature',
    subtitle: "This video requires vision analysis to extract locations accurately.",
  },
};

export default function UpgradeScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [toastVisible, setToastVisible] = useState(false);

  const copy = reason ? REASON_COPY[reason] : null;

  function handleUpgrade() {
    setToastVisible(true);
  }

  function handleMaybeLater() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Close button */}
      <TouchableOpacity
        onPress={handleMaybeLater}
        className="absolute top-14 right-5 z-10 w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
      >
        <Ionicons name="close" size={20} color="#374151" />
      </TouchableOpacity>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View className="items-center pt-16 pb-6 px-6">
          {/* App icon */}
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center mb-5"
            style={{ backgroundColor: '#0D9488' }}
          >
            <Ionicons name="map" size={38} color="white" />
          </View>

          {/* Trigger-specific message */}
          {copy ? (
            <>
              <View className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-5 w-full">
                <View className="flex-row items-center gap-2 mb-1">
                  <Ionicons name="information-circle" size={16} color="#D97706" />
                  <Text className="text-amber-700 font-semibold text-sm">{copy.title}</Text>
                </View>
                <Text className="text-amber-600 text-xs leading-relaxed">{copy.subtitle}</Text>
              </View>
            </>
          ) : null}

          <Text className="text-3xl font-bold text-gray-900 text-center leading-tight">
            Unlock{'\n'}ReelRoam Pro
          </Text>
          <Text className="text-gray-500 text-base text-center mt-3 leading-relaxed">
            Turn any travel video into a full AI itinerary — without limits
          </Text>
        </View>

        {/* ── Feature comparison ── */}
        <View className="mx-5 rounded-3xl border border-gray-100 overflow-hidden mb-6">
          {/* Header row */}
          <View className="flex-row items-center bg-gray-50 px-4 py-3">
            <View className="flex-1" />
            <View className="w-20 items-center">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Free</Text>
            </View>
            <View className="w-20 items-center">
              <View className="bg-teal-600 rounded-full px-3 py-1">
                <Text className="text-white text-xs font-bold">Pro</Text>
              </View>
            </View>
          </View>

          <View className="px-4">
            <FeatureRow label="Trips per month"    free="3 / month"  pro="Unlimited" />
            <FeatureRow label="Location extraction" free="Text-based" pro="AI Vision" />
            <FeatureRow label="Interactive map"    free={true}       pro={true} />
            <FeatureRow label="Day-by-day plan"    free={true}       pro={true} />
            <FeatureRow label="Vision analysis"    free={false}      pro={true} />
            <FeatureRow label="Priority processing" free={false}     pro={true} />
            <FeatureRow label="Early access"       free={false}      pro={true} />
          </View>
        </View>

        {/* ── Price callout ── */}
        <View className="mx-5 rounded-3xl bg-teal-50 border border-teal-100 px-5 py-4 mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-teal-900 font-bold text-lg">Pro Plan</Text>
            <Text className="text-teal-600 text-sm">Cancel anytime</Text>
          </View>
          <View className="items-end">
            <Text className="text-teal-900 font-bold text-2xl">$9</Text>
            <Text className="text-teal-600 text-sm">/ month</Text>
          </View>
        </View>

        {/* ── CTA ── */}
        <View className="px-5">
          <TouchableOpacity
            onPress={handleUpgrade}
            activeOpacity={0.85}
            className="h-14 rounded-2xl items-center justify-center mb-3"
            style={{ backgroundColor: '#0D9488' }}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={18} color="white" />
              <Text className="text-white font-bold text-base">Upgrade to Pro</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleUpgrade}
            activeOpacity={0.7}
            className="h-10 items-center justify-center mb-2"
          >
            <Text className="text-gray-400 text-sm">Restore Purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleMaybeLater}
            activeOpacity={0.7}
            className="h-10 items-center justify-center"
          >
            <Text className="text-gray-400 text-sm">Maybe later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Toast message="Payments coming soon! 🎉" visible={toastVisible} />
    </SafeAreaView>
  );
}
