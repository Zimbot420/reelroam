import { useEffect, useRef } from 'react';
import { Animated, Modal, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Badge } from '../types';
import { TIER_COLORS } from '../lib/badges';

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 14;
const AUTO_DISMISS_MS = 3200;

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
};

// Pre-compute particle angles so they're stable across renders
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (i / PARTICLE_COUNT) * 2 * Math.PI);
const PARTICLE_DISTANCES = [80, 95, 70, 110, 90, 100, 75, 105, 85, 95, 70, 100, 80, 90];
const PARTICLE_COLORS = ['#FFD700', '#0D9488', '#ffffff', '#CD7F32', '#A8A9AD', '#f59e0b', '#22d3ee'];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  badge: Badge | null;
  visible: boolean;
  onDismiss: () => void;
}

export default function BadgeCelebrationModal({ badge, visible, onDismiss }: Props) {
  // Core entrance animations
  const badgeScale   = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate  = useRef(new Animated.Value(20)).current;
  const textOpacity    = useRef(new Animated.Value(0)).current;

  // Pulsing glow ring
  const ringScale   = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;

  // Particle burst — one Animated.Value per particle (distance 0 → PARTICLE_DISTANCES[i])
  const particleAnims = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0)),
  ).current;
  const particleOpacities = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(1)),
  ).current;

  // Auto-dismiss timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      // Reset all values immediately
      badgeScale.setValue(0);
      badgeOpacity.setValue(0);
      overlayOpacity.setValue(0);
      textTranslate.setValue(20);
      textOpacity.setValue(0);
      ringScale.setValue(0.8);
      ringOpacity.setValue(0.8);
      particleAnims.forEach((a) => a.setValue(0));
      particleOpacities.forEach((a) => a.setValue(1));
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 1. Fade in overlay
    Animated.timing(overlayOpacity, {
      toValue: 1, duration: 250, useNativeDriver: true,
    }).start();

    // 2. Badge spring entrance
    Animated.parallel([
      Animated.spring(badgeScale, {
        toValue: 1, useNativeDriver: true,
        tension: 60, friction: 7,
      }),
      Animated.timing(badgeOpacity, {
        toValue: 1, duration: 200, useNativeDriver: true,
      }),
    ]).start();

    // 3. Particle burst
    const particleBursts = particleAnims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1, duration: 550, delay: 80, useNativeDriver: true,
        }),
        Animated.timing(particleOpacities[i], {
          toValue: 0, duration: 550, delay: 300, useNativeDriver: true,
        }),
      ]),
    );
    Animated.parallel(particleBursts).start();

    // 4. Text slide up after badge appears
    Animated.parallel([
      Animated.timing(textOpacity,    { toValue: 1, duration: 300, delay: 250, useNativeDriver: true }),
      Animated.timing(textTranslate,  { toValue: 0, duration: 300, delay: 250, useNativeDriver: true }),
    ]).start();

    // 5. Pulsing glow ring
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1.18, duration: 700, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.3,  duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 0.92, duration: 700, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.8,  duration: 700, useNativeDriver: true }),
        ]),
      ]),
    ).start();

    // 6. Auto-dismiss
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!badge) return null;

  const tierColor = TIER_COLORS[badge.tier] ?? '#0D9488';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onDismiss}
        style={{ flex: 1 }}
      >
        {/* Dark overlay */}
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.82)',
            opacity: overlayOpacity,
          }}
        />

        {/* Content — centred */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>

          {/* "New Badge Earned!" header */}
          <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslate }], marginBottom: 32 }}>
            <Text style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 13, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 3,
              textAlign: 'center',
            }}>
              New Badge Earned!
            </Text>
          </Animated.View>

          {/* Badge + ring + particles container */}
          <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>

            {/* Particle burst */}
            {PARTICLE_ANGLES.map((angle, i) => {
              const distance = PARTICLE_DISTANCES[i];
              const x = Math.cos(angle) * distance;
              const y = Math.sin(angle) * distance;
              const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
              const size = 4 + (i % 3) * 2;

              const translateX = particleAnims[i].interpolate({
                inputRange: [0, 1], outputRange: [0, x],
              });
              const translateY = particleAnims[i].interpolate({
                inputRange: [0, 1], outputRange: [0, y],
              });

              return (
                <Animated.View
                  key={i}
                  style={{
                    position: 'absolute',
                    width: size, height: size, borderRadius: size / 2,
                    backgroundColor: color,
                    opacity: particleOpacities[i],
                    transform: [{ translateX }, { translateY }],
                  }}
                />
              );
            })}

            {/* Pulsing glow ring */}
            <Animated.View
              style={{
                position: 'absolute',
                width: 130, height: 130, borderRadius: 65,
                borderWidth: 2,
                borderColor: tierColor,
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              }}
            />

            {/* Badge circle */}
            <Animated.View
              style={{
                width: 110, height: 110, borderRadius: 55,
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderWidth: 2.5,
                borderColor: tierColor,
                alignItems: 'center', justifyContent: 'center',
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
                shadowColor: tierColor,
                shadowOpacity: 0.7,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 0 },
                elevation: 12,
              }}
            >
              {/* Inner highlight */}
              <View style={{
                position: 'absolute', top: 0, left: 10, right: 10, height: 1,
                backgroundColor: 'rgba(255,255,255,0.25)',
              }} />
              <Text style={{ fontSize: 48 }}>{badge.icon}</Text>
            </Animated.View>
          </View>

          {/* Badge info */}
          <Animated.View
            style={{
              alignItems: 'center', marginTop: 24,
              opacity: textOpacity, transform: [{ translateY: textTranslate }],
            }}
          >
            {/* Tier pill */}
            <View style={{
              backgroundColor: `${tierColor}20`,
              borderRadius: 12, borderWidth: 1,
              borderColor: `${tierColor}60`,
              paddingHorizontal: 12, paddingVertical: 4,
              marginBottom: 10,
            }}>
              <Text style={{ color: tierColor, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {TIER_LABELS[badge.tier] ?? badge.tier}
              </Text>
            </View>

            <Text style={{ color: 'white', fontSize: 22, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' }}>
              {badge.name}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 }}>
              {badge.description}
            </Text>

            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 28 }}>
              Tap anywhere to continue
            </Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
