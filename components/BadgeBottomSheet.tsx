import { useEffect, useRef } from 'react';
import { Animated, Modal, Share, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Badge } from '../types';
import { TIER_COLORS, TIER_GLOW } from '../lib/badges';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
};

function formatEarnedDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  badge: (Badge & { earned_at?: string }) | null;
  visible: boolean;
  earned: boolean;
  onClose: () => void;
}

export default function BadgeBottomSheet({ badge, visible, earned, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim   = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  async function handleShare() {
    if (!badge || !earned) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `I just earned the "${badge.name}" badge on ReelRoam! ${badge.icon} ${badge.description}`,
      });
    } catch { /* dismissed */ }
  }

  if (!badge) return null;

  const tierColor = TIER_COLORS[badge.tier] ?? '#0D9488';
  const tierGlow  = TIER_GLOW[badge.tier]  ?? 'rgba(13,148,136,0.25)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Scrim */}
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1 }}>
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            opacity: overlayAnim,
          }}
        />
      </TouchableOpacity>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View
          style={{
            backgroundColor: '#111827',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: insets.bottom + 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}
        >
          {/* Top highlight line */}
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />

          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          </View>

          {/* Badge hero */}
          <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 24 }}>
            {/* Glow backdrop */}
            <View
              style={{
                width: 100, height: 100, borderRadius: 50,
                backgroundColor: tierGlow,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2,
                borderColor: earned ? tierColor : 'rgba(255,255,255,0.1)',
                shadowColor: tierColor,
                shadowOpacity: earned ? 0.5 : 0,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 0 },
                elevation: earned ? 8 : 0,
                opacity: earned ? 1 : 0.45,
              }}
            >
              {/* Inner top highlight */}
              <View style={{
                position: 'absolute', top: 0, left: 8, right: 8, height: 1,
                backgroundColor: earned ? 'rgba(255,255,255,0.2)' : 'transparent',
              }} />
              <Text style={{ fontSize: 44, opacity: earned ? 1 : 0.5 }}>
                {earned ? badge.icon : (badge.is_secret ? '🔒' : badge.icon)}
              </Text>
            </View>

            {/* Tier pill */}
            <View style={{
              marginTop: 16,
              backgroundColor: `${tierColor}18`,
              borderRadius: 12, borderWidth: 1,
              borderColor: `${tierColor}50`,
              paddingHorizontal: 12, paddingVertical: 4,
            }}>
              <Text style={{ color: tierColor, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {TIER_LABELS[badge.tier] ?? badge.tier}
              </Text>
            </View>

            <Text style={{ color: 'white', fontSize: 22, fontWeight: '800', marginTop: 12, letterSpacing: -0.3, textAlign: 'center' }}>
              {earned || !badge.is_secret ? badge.name : '???'}
            </Text>
          </View>

          {/* Divider */}
          <View style={{ height: 1, marginHorizontal: 24, backgroundColor: 'rgba(255,255,255,0.07)' }} />

          {/* Description */}
          <View style={{ paddingHorizontal: 28, paddingTop: 20, paddingBottom: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              {earned ? 'Achievement' : 'How to earn'}
            </Text>
            <Text style={{ color: earned ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 22 }}>
              {earned || !badge.is_secret ? badge.description : 'This is a secret badge. Keep exploring to unlock it!'}
            </Text>

            {/* Earned date */}
            {earned && badge.earned_at && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
                <Ionicons name="calendar-outline" size={14} color="#0D9488" />
                <Text style={{ color: '#0D9488', fontSize: 13, fontWeight: '500' }}>
                  Earned {formatEarnedDate(badge.earned_at)}
                </Text>
              </View>
            )}

            {/* Locked state */}
            {!earned && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                marginTop: 14, padding: 12, borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
              }}>
                <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.3)" />
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Not yet earned</Text>
              </View>
            )}
          </View>

          {/* Share button — only if earned */}
          {earned && (
            <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: 'rgba(13,148,136,0.12)',
                  borderRadius: 16, paddingVertical: 14,
                  borderWidth: 1, borderColor: 'rgba(13,148,136,0.3)',
                }}
              >
                <Ionicons name="share-social-outline" size={18} color="#0D9488" />
                <Text style={{ color: '#0D9488', fontSize: 15, fontWeight: '700' }}>Share Achievement</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}
