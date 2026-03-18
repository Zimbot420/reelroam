import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window')
const SHEET_HEIGHT = SCREEN_H * 0.78
const TEAL = '#0D9488'
const NAVY = '#1a1a2e'
const BG = '#0d0d18'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIItineraryStop {
  order: number
  place_name: string
  category: string
  emoji: string
  duration_minutes: number
  travel_time_from_previous_minutes: number
  estimated_cost: string
  tip: string
  coordinates: { lat: number; lng: number }
}

export interface AIItinerary {
  summary: { total_time: string; total_cost: string; stops: number }
  itinerary: AIItineraryStop[]
  tips: string[]
}

interface NearbyPlaceSlim {
  name: string
  category: string
  lat: number
  lng: number
  rating?: number
  vicinity?: string
}

interface Props {
  visible: boolean
  onDismiss: () => void
  currentLat: number
  currentLng: number
  locationName: string
  prefillPrompt?: string
  nearbyPlaces?: NearbyPlaceSlim[]
  onPlotOnMap: (itinerary: AIItinerary) => void
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  '6 hour layover — best route nearby',
  'Best restaurants within 1km right now',
  'Hidden gems near me',
  'Full afternoon itinerary from here',
]

// ─── Supabase edge function URL ───────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

// ─── Component ────────────────────────────────────────────────────────────────

export default function AskAIPanel({
  visible,
  onDismiss,
  currentLat,
  currentLng,
  locationName,
  prefillPrompt,
  nearbyPlaces,
  onPlotOnMap,
}: Props) {
  const insets = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT + 50)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current
  const shimmerAnim = useRef(new Animated.Value(0)).current

  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AIItinerary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<TextInput>(null)

  // Pre-fill from external trigger (e.g. "Ask AI" from POI sheet)
  useEffect(() => {
    if (prefillPrompt && visible) {
      setPrompt(prefillPrompt)
    }
  }, [prefillPrompt, visible])

  // Open / close animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 3 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SHEET_HEIGHT + 50, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(() => {
        // Reset state on close
        setResult(null)
        setError(null)
        setPrompt('')
      })
    }
  }, [visible])

  // Shimmer animation loop
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
      ).start()
    } else {
      shimmerAnim.setValue(0)
    }
  }, [isLoading])

  // Swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, g) => g.dy > 0,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy) },
      onPanResponderRelease: (_, g) => {
        if (g.dy > SHEET_HEIGHT * 0.3 || g.vy > 0.7) {
          onDismiss()
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 2 }).start()
        }
      },
    }),
  ).current

  // Send prompt to edge function
  const sendPrompt = useCallback(async (text: string) => {
    if (!text.trim()) return
    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/map-ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          prompt: text.trim(),
          lat: currentLat,
          lng: currentLng,
          location_name: locationName,
          current_time: new Date().toISOString(),
          nearby_places: nearbyPlaces ?? [],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'AI request failed')
      setResult(data as AIItinerary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setIsLoading(false)
    }
  }, [currentLat, currentLng, locationName, nearbyPlaces])

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        pointerEvents="auto"
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropOpacity }}
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
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 1,
          borderColor: 'rgba(13,148,136,0.35)',
          transform: [{ translateY }],
          shadowColor: TEAL,
          shadowOpacity: 0.25,
          shadowRadius: 30,
          elevation: 30,
          overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <View {...panResponder.panHandlers} style={{ paddingTop: 10, paddingBottom: 4, alignItems: 'center' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18 }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>✨ Ask AI</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                  Your local travel guide
                </Text>
              </View>
              <TouchableOpacity onPress={onDismiss} activeOpacity={0.7} style={{ padding: 8 }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* ── Suggestion chips ─────────────────────────────────────────────── */}
            {!result && !isLoading && (
              <View style={{ paddingHorizontal: 20, marginBottom: 18 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
                  Try asking…
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => { setPrompt(s); sendPrompt(s) }}
                      activeOpacity={0.75}
                      style={{
                        backgroundColor: 'rgba(13,148,136,0.12)',
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: 'rgba(13,148,136,0.35)',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── Text input ───────────────────────────────────────────────────── */}
            <View style={{ paddingHorizontal: 20, marginBottom: 18 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  backgroundColor: NAVY,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: 'rgba(13,148,136,0.35)',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  minHeight: 52,
                }}
              >
                <TextInput
                  ref={inputRef}
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="Ask anything about where you are…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    flex: 1,
                    color: '#fff',
                    fontSize: 15,
                    lineHeight: 22,
                    maxHeight: 100,
                  }}
                  multiline
                  returnKeyType="send"
                  blurOnSubmit
                  onSubmitEditing={() => sendPrompt(prompt)}
                />
                <TouchableOpacity
                  onPress={() => sendPrompt(prompt)}
                  disabled={!prompt.trim() || isLoading}
                  activeOpacity={0.75}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: prompt.trim() ? TEAL : 'rgba(13,148,136,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8,
                  }}
                >
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Loading shimmer ──────────────────────────────────────────────── */}
            {isLoading && (
              <View style={{ paddingHorizontal: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <ActivityIndicator size="small" color={TEAL} />
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginLeft: 10 }}>
                    Exploring nearby options…
                  </Text>
                </View>
                {[120, 80, 100, 60].map((w, i) => (
                  <Animated.View
                    key={i}
                    style={{
                      height: 16,
                      width: `${w}%` as any,
                      borderRadius: 8,
                      backgroundColor: NAVY,
                      marginBottom: 10,
                      opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
                    }}
                  />
                ))}
              </View>
            )}

            {/* ── Error ──────────────────────────────────────────────────────── */}
            {error && (
              <View
                style={{
                  marginHorizontal: 20,
                  padding: 14,
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.3)',
                }}
              >
                <Text style={{ color: '#fca5a5', fontSize: 13 }}>{error}</Text>
              </View>
            )}

            {/* ── AI Result ────────────────────────────────────────────────────── */}
            {result && (
              <View style={{ paddingHorizontal: 20 }}>
                {/* Summary header */}
                <View
                  style={{
                    backgroundColor: 'rgba(13,148,136,0.12)',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(13,148,136,0.3)',
                    padding: 14,
                    marginBottom: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                  }}
                >
                  <SummaryStat icon="time-outline" label={result.summary.total_time} />
                  <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <SummaryStat icon="cash-outline" label={result.summary.total_cost} />
                  <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <SummaryStat icon="location-outline" label={`${result.summary.stops} stops`} />
                </View>

                {/* Itinerary stops */}
                {result.itinerary.map((stop, i) => (
                  <ItineraryCard key={i} stop={stop} isLast={i === result.itinerary.length - 1} />
                ))}

                {/* Tips */}
                {result.tips.length > 0 && (
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ color: TEAL, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
                      💡 Local tips
                    </Text>
                    {result.tips.map((tip, i) => (
                      <Text key={i} style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18, marginBottom: 4 }}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Plot on Map button */}
                <TouchableOpacity
                  onPress={() => { onPlotOnMap(result); onDismiss() }}
                  activeOpacity={0.82}
                  style={{
                    backgroundColor: TEAL,
                    borderRadius: 16,
                    paddingVertical: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    shadowColor: TEAL,
                    shadowOpacity: 0.45,
                    shadowRadius: 12,
                    elevation: 8,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="map-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Plot on Map</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStat({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon as any} size={16} color={TEAL} />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  )
}

function ItineraryCard({ stop, isLast }: { stop: AIItineraryStop; isLast: boolean }) {
  return (
    <View style={{ marginBottom: isLast ? 16 : 4 }}>
      <View
        style={{
          backgroundColor: NAVY,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          padding: 14,
        }}
      >
        {/* Row: emoji + name + cost */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {/* Order circle */}
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: TEAL,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{stop.order}</Text>
            </View>
            <Text style={{ fontSize: 20, marginRight: 8 }}>{stop.emoji}</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 }} numberOfLines={2}>
              {stop.place_name}
            </Text>
          </View>
          {stop.estimated_cost && (
            <Text style={{ color: '#86efac', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
              {stop.estimated_cost}
            </Text>
          )}
        </View>

        {/* Duration row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              {stop.duration_minutes} min
            </Text>
          </View>
          {stop.travel_time_from_previous_minutes > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="walk-outline" size={12} color="rgba(255,255,255,0.4)" />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                +{stop.travel_time_from_previous_minutes} min travel
              </Text>
            </View>
          )}
        </View>

        {/* Tip */}
        {stop.tip && (
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 6, lineHeight: 17 }}>
            {stop.tip}
          </Text>
        )}
      </View>

      {/* Connector line */}
      {!isLast && (
        <View style={{ alignItems: 'center', paddingVertical: 3 }}>
          <View style={{ width: 1.5, height: 14, backgroundColor: 'rgba(13,148,136,0.35)' }} />
        </View>
      )}
    </View>
  )
}
