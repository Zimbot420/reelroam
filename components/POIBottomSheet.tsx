import React, { useRef, useEffect, useCallback } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { buildPhotoUrl, priceLevelText, type PlaceDetail } from '../lib/placesApi'

const { height: SCREEN_H } = Dimensions.get('window')
const SHEET_HEIGHT = SCREEN_H * 0.58
const TEAL = '#0D9488'
const NAVY = '#1a1a2e'
const BG = '#0d0d18'

interface Props {
  place: PlaceDetail | null
  apiKey: string
  visible: boolean
  onDismiss: () => void
  onAskAI: (placeName: string) => void
  onSaveToTrip?: (place: PlaceDetail) => void
}

export default function POIBottomSheet({ place, apiKey, visible, onDismiss, onAskAI, onSaveToTrip }: Props) {
  const insets = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT + 50)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current

  // ── Open / close animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SHEET_HEIGHT + 50, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start()
    }
  }, [visible])

  // ── Swipe-to-dismiss pan responder ─────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, g) => g.dy > 0,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy)
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > SHEET_HEIGHT * 0.35 || g.vy > 0.8) {
          onDismiss()
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 2 }).start()
        }
      },
    }),
  ).current

  const openDirections = useCallback(() => {
    if (!place) return
    const query = encodeURIComponent(place.formatted_address ?? place.name)
    const scheme = Platform.OS === 'ios' ? 'maps://?q=' : 'geo:0,0?q='
    Linking.openURL(`${scheme}${query}`).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${query}`),
    )
  }, [place])

  if (!place && !visible) return null

  const photoUrl = place?.photo_reference ? buildPhotoUrl(place.photo_reference, apiKey, 600) : null
  const isOpen = place?.opening_hours?.open_now

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          opacity: backdropOpacity,
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onDismiss} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SHEET_HEIGHT,
          backgroundColor: BG,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderColor: 'rgba(13,148,136,0.3)',
          transform: [{ translateY }],
          shadowColor: '#000',
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 25,
          overflow: 'hidden',
        }}
        {...panResponder.panHandlers}
      >
        {/* Handle bar */}
        <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Photo */}
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={{ width: '100%', height: 180, backgroundColor: NAVY }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 120,
                backgroundColor: NAVY,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 48 }}>{place?.emoji ?? '📍'}</Text>
            </View>
          )}

          <View style={{ padding: 18, paddingBottom: insets.bottom + 20 }}>
            {/* Name */}
            <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 6 }}>
              {place?.name}
            </Text>

            {/* Category + Rating row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(13,148,136,0.15)',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(13,148,136,0.3)',
                }}
              >
                <Text style={{ fontSize: 13 }}>{place?.emoji}</Text>
                <Text style={{ color: TEAL, fontSize: 12, fontWeight: '600', marginLeft: 5 }}>
                  {categoryLabel(place?.type)}
                </Text>
              </View>

              {place?.rating != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="star" size={13} color="#f59e0b" />
                  <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '600', marginLeft: 3 }}>
                    {place.rating.toFixed(1)}
                  </Text>
                  {place.user_ratings_total != null && (
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginLeft: 3 }}>
                      ({place.user_ratings_total.toLocaleString()})
                    </Text>
                  )}
                </View>
              )}

              {place?.price_level != null && (
                <Text style={{ color: '#86efac', fontSize: 13, fontWeight: '600' }}>
                  {priceLevelText(place.price_level)}
                </Text>
              )}
            </View>

            {/* Address */}
            {(place?.formatted_address ?? place?.vicinity) && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.4)" style={{ marginTop: 1 }} />
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginLeft: 5, flex: 1, lineHeight: 18 }}>
                  {place?.formatted_address ?? place?.vicinity}
                </Text>
              </View>
            )}

            {/* Open / Closed */}
            {place?.opening_hours != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: isOpen ? '#4ade80' : '#f87171',
                    marginRight: 6,
                  }}
                />
                <Text style={{ color: isOpen ? '#4ade80' : '#f87171', fontSize: 13, fontWeight: '600' }}>
                  {isOpen ? 'Open now' : 'Closed'}
                </Text>
              </View>
            )}

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <ActionButton
                icon="navigate-outline"
                label="Directions"
                onPress={openDirections}
                variant="primary"
              />
              <ActionButton
                icon="bookmark-outline"
                label="Save to Trip"
                onPress={() => place && onSaveToTrip?.(place)}
                variant="secondary"
              />
              <ActionButton
                icon="sparkles-outline"
                label="Ask AI"
                onPress={() => place && onAskAI(place.name)}
                variant="teal"
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  )
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onPress,
  variant,
}: {
  icon: string
  label: string
  onPress: () => void
  variant: 'primary' | 'secondary' | 'teal'
}) {
  const bg =
    variant === 'teal'
      ? TEAL
      : variant === 'primary'
      ? 'rgba(13,148,136,0.18)'
      : 'rgba(255,255,255,0.07)'

  const textColor = variant === 'teal' ? '#fff' : variant === 'primary' ? TEAL : 'rgba(255,255,255,0.75)'
  const borderColor = variant === 'primary' ? 'rgba(13,148,136,0.35)' : 'rgba(255,255,255,0.1)'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        borderRadius: 14,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: variant === 'teal' ? 'transparent' : borderColor,
        minHeight: 52,
        gap: 4,
      }}
    >
      <Ionicons name={icon as any} size={18} color={textColor} />
      <Text style={{ color: textColor, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function categoryLabel(type?: string): string {
  const map: Record<string, string> = {
    restaurant: 'Restaurant',
    tourist_attraction: 'Attraction',
    cafe: 'Café',
    bar: 'Bar',
    museum: 'Museum',
    park: 'Park',
    shopping_mall: 'Shopping',
  }
  return map[type ?? ''] ?? 'Place'
}
