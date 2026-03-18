import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getFlagEmoji, getCountryName } from '../lib/countryUtils';
import { Ionicons } from '@expo/vector-icons';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const TEAL = '#0D9488';
const PREVIEW_LIMIT = 5;

interface AutoPopulateModalProps {
  visible: boolean;
  countryCodes: string[]; // ISO codes detected from trips
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function AutoPopulateModal({
  visible,
  countryCodes,
  onConfirm,
  onDismiss,
}: AutoPopulateModalProps) {
  const slideAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(80);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 220,
        }),
      ]).start();
    }
  }, [visible]);

  const preview = countryCodes.slice(0, PREVIEW_LIMIT);
  const overflow = countryCodes.length - PREVIEW_LIMIT;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}
        onPress={onDismiss}
      >
        {/* Sheet — stop tap propagation */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={{
              backgroundColor: '#12132a',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 40,
              borderTopWidth: 1,
              borderColor: 'rgba(255,255,255,0.07)',
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 4 }}>
              <View
                style={{
                  width: 36, height: 4, borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}
              />
            </View>

            {/* Globe icon */}
            <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 4 }}>
              <View
                style={{
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: `${TEAL}18`,
                  borderWidth: 1.5,
                  borderColor: `${TEAL}40`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="earth" size={28} color={TEAL} />
              </View>
            </View>

            {/* Title */}
            <Text
              style={{
                color: 'white',
                fontSize: 20,
                fontWeight: '800',
                textAlign: 'center',
                marginTop: 14,
                paddingHorizontal: 24,
                letterSpacing: -0.3,
              }}
            >
              We found trips to {countryCodes.length}{' '}
              {countryCodes.length === 1 ? 'country' : 'countries'}
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 14,
                textAlign: 'center',
                marginTop: 8,
                paddingHorizontal: 32,
                lineHeight: 20,
              }}
            >
              Want to mark them as visited on your scratch map?
            </Text>

            {/* Country pills */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 8,
                paddingHorizontal: 24,
                marginTop: 20,
                marginBottom: 4,
              }}
            >
              {preview.map((iso) => (
                <View
                  key={iso}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: `${TEAL}15`,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: `${TEAL}35`,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{getFlagEmoji(iso)}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' }}>
                    {getCountryName(iso)}
                  </Text>
                </View>
              ))}
              {overflow > 0 && (
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                    +{overflow} more
                  </Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={{ paddingHorizontal: 24, marginTop: 24, gap: 10 }}>
              <TouchableOpacity
                onPress={onConfirm}
                activeOpacity={0.85}
                style={{
                  backgroundColor: TEAL,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  shadowColor: TEAL,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color="white" />
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                  Yes, add them all
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onDismiss}
                activeOpacity={0.8}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
                  I'll do it manually
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
