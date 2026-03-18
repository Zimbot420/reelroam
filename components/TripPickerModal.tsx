import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getUserTrips } from '../lib/supabase'
import { addLocationToTrip } from '../lib/api/trips'
import { getOrCreateDeviceId } from '../lib/deviceId'
import { cacheMyTripsList, getCachedMyTripsList } from '../lib/offlineCache'
import { type Location } from '../types'

const BG = '#0d0d18'
const CARD = '#161625'
const TEAL = '#0D9488'
const BORDER = 'rgba(255,255,255,0.08)'

interface TripRow {
  id: string
  title: string | null
  created_at: string
  itinerary?: { destination?: string } | null
}

interface Props {
  visible: boolean
  location: Location | null
  onDismiss: () => void
  onSaved: (tripTitle: string) => void
}

export default function TripPickerModal({ visible, location, onDismiss, onSaved }: Props) {
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(600)).current

  const [trips, setTrips] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)

  // Slide in / out
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }).start()
      loadTrips()
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 240,
        useNativeDriver: true,
      }).start()
      // Reset state when closed
      setSavedId(null)
      setError(null)
    }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTrips = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsOffline(false)
    try {
      const deviceId = await getOrCreateDeviceId()
      const rows = await getUserTrips(deviceId)
      setTrips(rows as TripRow[])
      cacheMyTripsList(rows) // fire-and-forget — update offline copy
    } catch {
      // Network failure — try serving from cache
      const cached = await getCachedMyTripsList()
      if (cached && cached.length > 0) {
        setTrips(cached as TripRow[])
        setIsOffline(true)
      } else {
        setError('Could not load your trips.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSave = useCallback(
    async (trip: TripRow) => {
      if (!location || savingId) return
      setSavingId(trip.id)
      setError(null)
      try {
        await addLocationToTrip(trip.id, location)
        setSavedId(trip.id)
        const title = trip.title ?? 'Your trip'
        setTimeout(() => {
          onSaved(title)
          onDismiss()
        }, 700)
      } catch {
        setError('Failed to save. Please try again.')
      } finally {
        setSavingId(null)
      }
    },
    [location, savingId, onSaved, onDismiss],
  )

  const destination = (trip: TripRow) =>
    trip.itinerary?.destination ?? trip.title ?? 'Untitled Trip'

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onDismiss}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
      />

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateY: slideAnim }],
          backgroundColor: BG,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 16,
          maxHeight: '75%',
        }}
      >
        {/* Handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          />
        </View>

        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: BORDER,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
              Add to Trip
            </Text>
            {location && (
              <Text
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}
                numberOfLines={1}
              >
                {location.name}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        {/* Offline notice */}
        {isOffline && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: 'rgba(255,183,77,0.08)',
            borderBottomWidth: 1, borderBottomColor: 'rgba(255,183,77,0.2)',
          }}>
            <Ionicons name="cloud-offline-outline" size={13} color="#FFA726" />
            <Text style={{ color: '#FFA726', fontSize: 12, fontWeight: '500' }}>
              Offline — showing cached trips
            </Text>
          </View>
        )}

        {/* Content */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={TEAL} />
          </View>
        ) : trips.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="map-outline" size={40} color="rgba(255,255,255,0.2)" />
            <Text
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 15,
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              No trips yet.{'\n'}Generate one from the Home tab first.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ paddingTop: 8 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {trips.map((trip) => {
              const isSaving = savingId === trip.id
              const isSaved = savedId === trip.id

              return (
                <TouchableOpacity
                  key={trip.id}
                  activeOpacity={0.75}
                  onPress={() => handleSave(trip)}
                  disabled={!!savingId || !!savedId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: CARD,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: isSaved ? TEAL : BORDER,
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: isSaved
                        ? 'rgba(13,148,136,0.25)'
                        : 'rgba(255,255,255,0.07)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={TEAL} />
                    ) : (
                      <Ionicons
                        name={isSaved ? 'checkmark-circle' : 'map-outline'}
                        size={20}
                        color={isSaved ? TEAL : 'rgba(255,255,255,0.5)'}
                      />
                    )}
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}
                      numberOfLines={1}
                    >
                      {destination(trip)}
                    </Text>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {new Date(trip.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  {/* Chevron */}
                  {!isSaved && !isSaving && (
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={TEAL}
                    />
                  )}
                  {isSaved && (
                    <Text style={{ color: TEAL, fontSize: 13, fontWeight: '600' }}>
                      Added!
                    </Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}

        {/* Error */}
        {error && (
          <Text
            style={{
              color: '#F87171',
              fontSize: 13,
              textAlign: 'center',
              paddingHorizontal: 20,
              paddingBottom: 8,
            }}
          >
            {error}
          </Text>
        )}
      </Animated.View>
    </Modal>
  )
}
