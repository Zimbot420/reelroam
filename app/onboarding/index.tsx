import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const { width, height } = Dimensions.get('window');

const STAR_COUNT = 80;

function generateStars() {
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2.5 + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
  }));
}

const STARS = generateStars();

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current - 1 ? 20 : 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: i === current - 1 ? TEAL : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </View>
  );
}

function FeatureItem({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, gap: 6 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: 'rgba(13,148,136,0.12)',
          borderWidth: 1,
          borderColor: 'rgba(13,148,136,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text
        style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 11,
          textAlign: 'center',
          lineHeight: 15,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function OnboardingWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Star field */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {STARS.map((star) => (
          <View
            key={star.id}
            style={{
              position: 'absolute',
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: 'white',
              opacity: star.opacity,
            }}
          />
        ))}
      </View>

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 24,
          justifyContent: 'space-between',
        }}
      >
        {/* Top: progress dots */}
        <View style={{ alignItems: 'center' }}>
          <ProgressDots current={1} total={5} />
        </View>

        {/* Center: logo + headline */}
        <View style={{ alignItems: 'center', gap: 20 }}>
          {/* Logo with glow */}
          <Animated.View
            style={{
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 38,
                fontWeight: '800',
                color: TEAL,
                letterSpacing: -0.5,
                textShadowColor: TEAL,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 20,
              }}
            >
              ScrollAway
            </Text>
            <View
              style={{
                width: 120,
                height: 2,
                borderRadius: 1,
                backgroundColor: TEAL,
                opacity: 0.4,
                marginTop: 4,
              }}
            />
          </Animated.View>

          <View style={{ alignItems: 'center', gap: 10 }}>
            <Text
              style={{
                color: 'white',
                fontSize: 28,
                fontWeight: '700',
                textAlign: 'center',
                lineHeight: 34,
              }}
            >
              Your travel story{'\n'}starts here
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
                maxWidth: 300,
              }}
            >
              Create an account to save your journey, earn badges, and inspire other travelers
            </Text>
          </View>

          {/* Feature highlights */}
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              marginTop: 8,
              paddingHorizontal: 8,
            }}
          >
            <FeatureItem icon="🗺️" label={`Save your trips\nforever`} />
            <FeatureItem icon="🏅" label={`Earn travel\nbadges`} />
            <FeatureItem icon="🌍" label={`Inspire other\ntravelers`} />
          </View>
        </View>

        {/* Bottom: CTA buttons */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.push('/onboarding/signup')}
            activeOpacity={0.85}
            style={{
              backgroundColor: TEAL,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>
              Get Started
            </Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
              Maybe later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
