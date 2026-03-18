import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const COOLDOWN_SECONDS = 60;

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

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Bounce animation for envelope icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -12,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.delay(1200),
      ]),
    ).start();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bounceAnim]);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (cooldown > 0 || !email) return;
    try {
      setResending(true);
      await supabase.auth.resend({ type: 'signup', email });
      startCooldown();
    } catch {
      // Silently fail — user may not notice
    } finally {
      setResending(false);
    }
  }

  function handleOpenEmail() {
    if (Platform.OS === 'ios') {
      Linking.openURL('message://').catch(() => {
        Linking.openURL('mailto:').catch(() => {});
      });
    } else {
      Linking.openURL('mailto:').catch(() => {});
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          justifyContent: 'space-between',
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <ProgressDots current={3} total={5} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Center content */}
        <View style={{ alignItems: 'center', gap: 20 }}>
          {/* Animated envelope */}
          <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 28,
                backgroundColor: 'rgba(13,148,136,0.12)',
                borderWidth: 1.5,
                borderColor: 'rgba(13,148,136,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="mail-outline" size={48} color={TEAL} />
            </View>
          </Animated.View>

          <View style={{ alignItems: 'center', gap: 10 }}>
            <Text
              style={{
                color: 'white',
                fontSize: 28,
                fontWeight: '800',
                letterSpacing: -0.5,
              }}
            >
              Check your email
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              We sent a verification link to
            </Text>
            <Text
              style={{
                color: 'white',
                fontSize: 15,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              {email ?? 'your email'}
            </Text>
          </View>

          {/* Resend */}
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
            activeOpacity={0.7}
            style={{ paddingVertical: 6 }}
          >
            <Text
              style={{
                color: cooldown > 0 ? 'rgba(255,255,255,0.3)' : TEAL,
                fontSize: 15,
                fontWeight: '600',
              }}
            >
              {cooldown > 0
                ? `Resend in ${cooldown}s...`
                : resending
                ? 'Sending...'
                : 'Resend email'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom buttons */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={handleOpenEmail}
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
            <Ionicons name="open-outline" size={18} color="white" />
            <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>
              Open Email App
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/onboarding/profile')}
            activeOpacity={0.7}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
