import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import SpinningGlobe from '../../components/SpinningGlobe';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const { width } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#0D9488', '#6366f1', '#f59e0b', '#ec4899', '#22c55e',
  '#3b82f6', '#f97316', '#a855f7', '#14b8a6', '#ef4444',
];

const CONFETTI_COUNT = 20;

function ConfettoDot({
  color,
  delay,
  startX,
  size,
}: {
  color: string;
  delay: number;
  startX: number;
  size: number;
}) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: 700,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    Animated.loop(animation).start();
  }, [translateY, opacity, rotate, delay]);

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: startX,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { rotate: rotation }],
      }}
    />
  );
}

const confettiDots = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  id: i,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: i * 120,
  startX: (i * (width / CONFETTI_COUNT)) + (Math.random() * 12 - 6),
  size: 6 + Math.random() * 6,
}));

export default function CompleteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUsername } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🌍');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    async function loadProfile() {
      try {
        const deviceId = await getOrCreateDeviceId();
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_emoji')
          .eq('device_id', deviceId)
          .maybeSingle();

        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.avatar_emoji) setAvatarEmoji(data.avatar_emoji);
      } catch {
        // Use defaults
      }

      // Mark onboarding as complete so the NavigationGuard stops redirecting
      await refreshUsername();
      await AsyncStorage.setItem('onboarding_completed', 'true');
    }
    loadProfile();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleIn, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // Bounce emoji
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -16,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ]),
    ).start();
  }, [bounceAnim, fadeIn, scaleIn]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Confetti */}
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
        pointerEvents="none"
      >
        {confettiDots.map((dot) => (
          <ConfettoDot
            key={dot.id}
            color={dot.color}
            delay={dot.delay}
            startX={dot.startX}
            size={dot.size}
          />
        ))}
      </View>

      <Animated.View
        style={{
          flex: 1,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: fadeIn,
          transform: [{ scale: scaleIn }],
        }}
      >
        {/* Top spacer */}
        <View style={{ height: 20 }} />

        {/* Globe + avatar */}
        <View style={{ alignItems: 'center', gap: 0 }}>
          {/* Floating emoji above globe */}
          <Animated.Text
            style={{
              fontSize: 52,
              transform: [{ translateY: bounceAnim }],
              marginBottom: -10,
              zIndex: 10,
            }}
          >
            {avatarEmoji}
          </Animated.Text>

          {/* Spinning globe */}
          <SpinningGlobe />
        </View>

        {/* Text content */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Text
            style={{
              color: 'white',
              fontSize: 26,
              fontWeight: '800',
              textAlign: 'center',
              letterSpacing: -0.5,
              lineHeight: 34,
            }}
          >
            Welcome to ScrollAway{displayName ? `,\n${displayName}` : ''}! ✈️
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: 16,
              textAlign: 'center',
            }}
          >
            Your adventure begins now
          </Text>

          {/* Feature pills */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Save Trips', 'Earn Badges', 'Share Stories'].map((label) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(13,148,136,0.12)',
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: 'rgba(13,148,136,0.25)',
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: TEAL,
                  }}
                />
                <Text style={{ color: TEAL, fontSize: 12, fontWeight: '600' }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={{ width: '100%' }}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/')}
            activeOpacity={0.85}
            style={{
              backgroundColor: TEAL,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              shadowColor: TEAL,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 }}>
              Start Exploring 🌍
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}
