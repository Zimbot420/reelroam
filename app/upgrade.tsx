import { useEffect, useRef, useState } from 'react';
import { Animated, ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { purchasePro, restorePurchases } from '../lib/purchases';

// ─── Types ────────────────────────────────────────────────────────────────────

type UpgradeReason = 'rate_limit' | 'vision' | undefined;

const REASON_COPY: Record<string, { title: string; subtitle: string }> = {
  rate_limit: {
    title: "You've used all 3 free trips",
    subtitle: 'Upgrade to Pro for unlimited trips and AI vision analysis.',
  },
  vision: {
    title: 'Vision analysis is a Pro feature',
    subtitle: 'This video requires vision analysis to extract locations accurately.',
  },
};

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

// ─── Floating hero card ───────────────────────────────────────────────────────

function FloatingCard({
  icon,
  label,
  sublabel,
  delay,
  side,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  delay: number;
  side: 'left' | 'right';
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-9, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Reanimated.View
      style={[
        {
          position: 'absolute',
          [side === 'left' ? 'left' : 'right']: 0,
          top: side === 'left' ? 28 : 52,
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderRadius: 14,
          paddingHorizontal: 10,
          paddingVertical: 9,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 5,
        },
        animStyle,
      ]}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: '#F0FDFA',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <Ionicons name={icon} size={15} color="#0D9488" />
      </View>
      <View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#111827' }}>{label}</Text>
        <Text style={{ fontSize: 10, color: '#6B7280' }}>{sublabel}</Text>
      </View>
    </Reanimated.View>
  );
}

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

// ─── Benefit card ─────────────────────────────────────────────────────────────

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View
      className="flex-1 bg-white rounded-2xl p-4 border border-gray-100"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-3"
        style={{ backgroundColor: '#F0FDFA' }}
      >
        <Ionicons name={icon} size={20} color="#0D9488" />
      </View>
      <Text className="text-sm font-bold text-gray-900 mb-1">{title}</Text>
      <Text className="text-xs text-gray-500 leading-relaxed">{description}</Text>
    </View>
  );
}

// ─── Testimonial card ─────────────────────────────────────────────────────────

function TestimonialCard({
  quote,
  name,
  role,
  initials,
  color,
}: {
  quote: string;
  name: string;
  role: string;
  initials: string;
  color: string;
}) {
  return (
    <View
      className="bg-white rounded-2xl p-4 border border-gray-100 mr-3"
      style={{
        width: 236,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View className="flex-row mb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Ionicons key={i} name="star" size={12} color="#F59E0B" />
        ))}
      </View>
      <Text className="text-sm text-gray-700 leading-relaxed mb-3" numberOfLines={4}>
        {quote}
      </Text>
      <View className="flex-row items-center gap-2">
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Text className="text-white text-xs font-bold">{initials}</Text>
        </View>
        <View>
          <Text className="text-xs font-semibold text-gray-900">{name}</Text>
          <Text className="text-xs text-gray-400">{role}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Upgrade screen ───────────────────────────────────────────────────────────

export default function UpgradeScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const enterY = useSharedValue(28);
  const enterOpacity = useSharedValue(0);

  useEffect(() => {
    enterOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    enterY.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, []);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterY.value }],
  }));

  const copy = reason ? REASON_COPY[reason] : null;

  function showToast(message: string) {
    setToastMessage(message);
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 50);
  }

  async function handleUpgrade() {
    setLoading(true);
    const result = await purchasePro();
    setLoading(false);
    if (result.success) {
      router.replace('/');
    } else if (result.error && result.error !== 'cancelled') {
      showToast('Purchase failed. Please try again.');
    }
  }

  async function handleRestore() {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.isPro) {
      showToast('Pro restored successfully!');
      setTimeout(() => router.replace('/'), 1500);
    } else {
      showToast('No active subscription found.');
    }
  }

  function handleMaybeLater() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Close button ── */}
      <TouchableOpacity
        onPress={handleMaybeLater}
        className="absolute top-14 right-5 z-10 w-9 h-9 rounded-full items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={['#0A2622', '#0F766E', '#0D9488']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ paddingTop: 80, paddingBottom: 72, paddingHorizontal: 24 }}
        >
          {/* Decorative circles */}
          <View
            style={{
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: 'rgba(255,255,255,0.04)',
              top: -60,
              right: -50,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'rgba(255,255,255,0.03)',
              bottom: 10,
              left: -40,
            }}
          />

          {/* Floating cards + center icon */}
          <View style={{ height: 150, position: 'relative' }}>
            <FloatingCard
              icon="location"
              label="Paris, France"
              sublabel="5 locations found"
              delay={400}
              side="left"
            />
            <FloatingCard
              icon="calendar-outline"
              label="7-day itinerary"
              sublabel="Ready to explore"
              delay={700}
              side="right"
            />
            {/* Central globe icon */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 32,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.22)',
                }}
              >
                <Ionicons name="globe-outline" size={36} color="white" />
              </View>
            </View>
          </View>

          {/* Reason-specific banner */}
          {copy ? (
            <View
              className="flex-row items-center gap-2 rounded-2xl px-4 py-3 mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <Ionicons name="information-circle" size={16} color="rgba(255,255,255,0.9)" />
              <Text className="text-white text-sm font-medium flex-shrink">{copy.title}</Text>
            </View>
          ) : null}

          {/* Headline */}
          <View className="items-center">
            <Text className="text-white text-4xl font-bold text-center leading-tight">
              Unlock{'\n'}ReelRoam Pro
            </Text>
            <Text
              className="text-base text-center mt-3 leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.75)' }}
            >
              Turn any travel video into a full AI{'\n'}itinerary — without limits
            </Text>
          </View>
        </LinearGradient>

        {/* ── Content (fade-in on mount) ── */}
        <Reanimated.View style={enterStyle}>

          {/* ── Social proof strip ── */}
          <View
            className="mx-5 bg-white rounded-2xl px-5 py-4 flex-row items-center justify-between"
            style={{
              marginTop: -22,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.10,
              shadowRadius: 14,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center gap-3">
              {/* Overlapping avatars */}
              <View style={{ flexDirection: 'row' }}>
                {[
                  { bg: '#6366F1', initial: 'S' },
                  { bg: '#EC4899', initial: 'M' },
                  { bg: '#F59E0B', initial: 'J' },
                  { bg: '#10B981', initial: 'A' },
                ].map((av, i) => (
                  <View
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: av.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: i === 0 ? 0 : -9,
                      borderWidth: 2,
                      borderColor: 'white',
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>
                      {av.initial}
                    </Text>
                  </View>
                ))}
              </View>
              <View>
                <Text className="text-gray-900 font-bold text-sm">10,000+ travelers</Text>
                <Text className="text-gray-400 text-xs">already exploring</Text>
              </View>
            </View>
            <View className="w-px h-10 bg-gray-100" />
            <View className="items-center gap-1">
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text className="text-gray-900 font-bold text-sm">4.8</Text>
              </View>
              <Text className="text-gray-400 text-xs">App Store</Text>
            </View>
          </View>

          {/* ── Pro benefit cards ── */}
          <View className="px-5 mt-7">
            <Text className="text-gray-900 font-bold text-lg mb-3">Everything in Pro</Text>
            <View className="flex-row gap-3">
              <BenefitCard
                icon="infinite-outline"
                title="Unlimited"
                description="No monthly cap — plan as many trips as you want"
              />
              <BenefitCard
                icon="eye-outline"
                title="AI Vision"
                description="Claude reads video frames for precise locations"
              />
              <BenefitCard
                icon="flash-outline"
                title="Priority"
                description="Faster processing and early feature access"
              />
            </View>
          </View>

          {/* ── Testimonials ── */}
          <View className="mt-7">
            <Text className="text-gray-900 font-bold text-lg px-5 mb-3">Loved by travelers</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              <TestimonialCard
                quote="Finally planned my Japan trip from a TikTok video! The AI pulled out every single location perfectly."
                name="Sarah M."
                role="Pro member"
                initials="SM"
                color="#6366F1"
              />
              <TestimonialCard
                quote="Generated 15 trips in a weekend for a group vacation. Worth every penny — saves hours of research."
                name="Marcus T."
                role="Pro member"
                initials="MT"
                color="#EC4899"
              />
              <TestimonialCard
                quote="The vision analysis is insane. It found hidden gems I would have completely missed from just the caption."
                name="Aiko R."
                role="Pro member"
                initials="AR"
                color="#F59E0B"
              />
            </ScrollView>
          </View>

          {/* ── Comparison table ── */}
          <View className="mx-5 mt-7 rounded-3xl border border-gray-100 overflow-hidden">
            <View className="flex-row items-center bg-gray-50 px-4 py-3">
              <View className="flex-1" />
              <View className="w-20 items-center">
                <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Free</Text>
              </View>
              <View className="w-20 items-center">
                <View className="rounded-full px-3 py-1" style={{ backgroundColor: '#0D9488' }}>
                  <Text className="text-white text-xs font-bold">Pro</Text>
                </View>
              </View>
            </View>
            <View className="px-4">
              <FeatureRow label="Trips per month"     free="3 / month"  pro="Unlimited" />
              <FeatureRow label="Location extraction" free="Text-based" pro="AI Vision" />
              <FeatureRow label="Interactive map"     free={true}       pro={true} />
              <FeatureRow label="Day-by-day plan"     free={true}       pro={true} />
              <FeatureRow label="Vision analysis"     free={false}      pro={true} />
              <FeatureRow label="Priority processing" free={false}      pro={true} />
              <FeatureRow label="Early access"        free={false}      pro={true} />
            </View>
          </View>

          {/* ── Price card ── */}
          <LinearGradient
            colors={['#0F766E', '#0D9488']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="mx-5 mt-4 rounded-3xl px-5 py-5"
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white font-bold text-xl">Pro Plan</Text>
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              >
                <Text className="text-white text-xs font-semibold">Most Popular</Text>
              </View>
            </View>
            <View className="flex-row items-end gap-1 mb-1">
              <Text className="text-white font-bold" style={{ fontSize: 44, lineHeight: 48 }}>
                $9
              </Text>
              <Text className="text-white text-base mb-1" style={{ opacity: 0.75 }}>
                /month
              </Text>
            </View>
            <Text className="text-white text-sm" style={{ opacity: 0.65 }}>
              Cancel anytime · No commitment
            </Text>
          </LinearGradient>

          {/* ── CTAs ── */}
          <View className="px-5 mt-4">
            <TouchableOpacity
              onPress={handleUpgrade}
              disabled={loading}
              activeOpacity={0.85}
              style={{ opacity: loading ? 0.7 : 1 }}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro"
            >
              <LinearGradient
                colors={['#0F766E', '#0D9488']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="h-14 rounded-2xl items-center justify-center mb-3"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="sparkles" size={18} color="white" />
                    <Text className="text-white font-bold text-base">Upgrade to Pro — $9/mo</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              activeOpacity={0.7}
              className="h-11 items-center justify-center mb-1"
              accessibilityRole="button"
              accessibilityLabel="Restore Purchases"
            >
              {restoring ? (
                <ActivityIndicator size="small" color="#9CA3AF" />
              ) : (
                <Text className="text-gray-400 text-sm">Restore Purchases</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleMaybeLater}
              activeOpacity={0.7}
              className="h-11 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Maybe later"
            >
              <Text className="text-gray-400 text-sm">Maybe later</Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </ScrollView>

      <Toast message={toastMessage} visible={toastVisible} />
    </SafeAreaView>
  );
}
