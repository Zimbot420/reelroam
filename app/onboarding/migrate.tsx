import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import { getOrCreateDeviceId } from '../../lib/deviceId';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

const CONFETTI_ITEMS = ['🎉', '🌍', '✈️', '🎉', '🌍', '✈️', '🎊', '⭐'];

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

function ConfettiPiece({ emoji, delay, x }: { emoji: string; delay: number; x: number }) {
  const anim = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(anim, {
          toValue: 400,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    Animated.loop(animation).start();
  }, [anim, opacity, delay]);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        top: 0,
        left: x,
        fontSize: 22,
        transform: [{ translateY: anim }],
        opacity,
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

export default function MigrateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [tripsCount, setTripsCount] = useState(0);
  const [savesCount, setSavesCount] = useState(0);
  const [hasData, setHasData] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    async function checkDeviceData() {
      try {
        const deviceId = await getOrCreateDeviceId();

        const [tripsResult, savesResult] = await Promise.all([
          supabase
            .from('trips')
            .select('id', { count: 'exact', head: true })
            .eq('device_id', deviceId),
          supabase
            .from('trip_saves')
            .select('id', { count: 'exact', head: true })
            .eq('device_id', deviceId),
        ]);

        const trips = tripsResult.count ?? 0;
        const saves = savesResult.count ?? 0;

        if (trips === 0 && saves === 0) {
          // No data — skip this screen
          router.replace('/onboarding/complete');
          return;
        }

        setTripsCount(trips);
        setSavesCount(saves);
        setHasData(true);
      } catch {
        // On error, skip migration
        router.replace('/onboarding/complete');
      } finally {
        setLoading(false);
      }
    }

    checkDeviceData();
  }, [router]);

  async function handleImport() {
    if (!user?.id) return;
    try {
      setMigrating(true);
      const deviceId = await getOrCreateDeviceId();

      await supabase.rpc('migrate_device_to_user', {
        p_device_id: deviceId,
        p_user_id: user.id,
      });

      setShowConfetti(true);

      // Navigate after a brief celebration
      setTimeout(() => {
        router.replace('/onboarding/complete');
      }, 2500);
    } catch (e: any) {
      // Even on error, continue
      router.replace('/onboarding/complete');
    } finally {
      setMigrating(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={TEAL} size="large" />
      </View>
    );
  }

  if (!hasData) return null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Confetti overlay */}
      {showConfetti && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          {CONFETTI_ITEMS.map((emoji, i) => (
            <ConfettiPiece
              key={i}
              emoji={emoji}
              delay={i * 150}
              x={40 + (i * 37) % 280}
            />
          ))}
        </View>
      )}

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
            <ProgressDots current={5} total={5} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Center content */}
        <View style={{ alignItems: 'center', gap: 24 }}>
          {/* Trophy icon */}
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 24,
              backgroundColor: 'rgba(13,148,136,0.12)',
              borderWidth: 1.5,
              borderColor: 'rgba(13,148,136,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 44 }}>🎉</Text>
          </View>

          <View style={{ alignItems: 'center', gap: 10 }}>
            <Text
              style={{
                color: 'white',
                fontSize: 26,
                fontWeight: '800',
                textAlign: 'center',
                letterSpacing: -0.5,
                lineHeight: 32,
              }}
            >
              We found your travel history!
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              You've built up some great data on this device. Import it to your new account to keep everything.
            </Text>
          </View>

          {/* Stats */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              width: '100%',
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(13,148,136,0.1)',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(13,148,136,0.2)',
                padding: 16,
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ color: TEAL, fontSize: 28, fontWeight: '800' }}>{tripsCount}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                {tripsCount === 1 ? 'Trip' : 'Trips'} Generated
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(13,148,136,0.1)',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(13,148,136,0.2)',
                padding: 16,
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ color: TEAL, fontSize: 28, fontWeight: '800' }}>{savesCount}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                {savesCount === 1 ? 'Trip' : 'Trips'} Saved
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom buttons */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={handleImport}
            disabled={migrating || showConfetti}
            activeOpacity={0.85}
            style={{
              backgroundColor: TEAL,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: migrating ? 0.7 : 1,
            }}
          >
            {migrating ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="white" />
                <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>
                  Import to my account
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/onboarding/complete')}
            disabled={migrating || showConfetti}
            activeOpacity={0.7}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>Start fresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
