import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../lib/context/LanguageContext'
import {
  Animated,
  Dimensions,
  Linking,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { DARK_MAP_STYLE } from '../../lib/mapStyle'
import {
  clusterPOIs,
  distanceMetres,
  fetchAllNearbyPOIs,
  fetchPlaceDetails,
  POI_CATEGORIES,
  type ClusterGroup,
  type PlaceDetail,
  type POIPlace,
  type POIType,
} from '../../lib/placesApi'
import {
  AIMarker,
  ClusterMarker,
  POIMarker,
} from '../../components/POIMarker'
import POIBottomSheet from '../../components/POIBottomSheet'
import AskAIPanel, { type AIItinerary } from '../../components/AskAIPanel'
import TripPickerModal from '../../components/TripPickerModal'

const { width: SCREEN_W } = Dimensions.get('window')
const TEAL = '#0D9488'
const BG = '#0d0d18'
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

// POI cache: key = "lat,lng", value = { pois, fetchedAt }
const poiCache = new Map<string, { pois: POIPlace[]; fetchedAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000   // 5 minutes
const REFETCH_DISTANCE_M = 500        // re-fetch after moving 500 m
const MAX_VISIBLE_PINS = 30

// ─── Permissions screen ───────────────────────────────────────────────────────

function PermissionScreen({
  status,
  onRequest,
}: {
  status: 'prompt' | 'denied'
  onRequest: () => void
}) {
  const { t } = useLanguage()
  return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 36 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: 'rgba(13,148,136,0.15)',
          borderWidth: 2,
          borderColor: 'rgba(13,148,136,0.4)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
        }}
      >
        <Ionicons name="compass" size={38} color={TEAL} />
      </View>

      <Text
        style={{ color: '#ffffff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}
      >
        {t.explore.liveMap}
      </Text>

      <Text
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 15,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 32,
        }}
      >
        {status === 'prompt' ? t.explore.locationPrompt : t.explore.locationDenied}
      </Text>

      <TouchableOpacity
        onPress={
          status === 'denied'
            ? () => Linking.openSettings()
            : onRequest
        }
        activeOpacity={0.82}
        style={{
          backgroundColor: TEAL,
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 32,
          shadowColor: TEAL,
          shadowOpacity: 0.5,
          shadowRadius: 14,
          elevation: 8,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
          {status === 'denied' ? t.explore.openSettings : t.explore.enableLocation}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTER_CHIP_KEYS = ['all', 'restaurant', 'tourist_attraction', 'cafe', 'bar', 'museum', 'park', 'shopping_mall'] as const
type FilterChipKey = typeof FILTER_CHIP_KEYS[number]

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const insets = useSafeAreaInsets()
  const { t, interpolate } = useLanguage()

  // ── Location state ──────────────────────────────────────────────────────────
  const [permStatus, setPermStatus] = useState<'loading' | 'prompt' | 'denied' | 'granted'>('loading')
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationName, setLocationName] = useState('')
  const locationWatcher = useRef<Location.LocationSubscription | null>(null)
  const headingWatcher = useRef<Location.LocationSubscription | null>(null)
  const lastFetchCoord = useRef<{ lat: number; lng: number } | null>(null)

  // Heading refs
  const accHeadingRef = useRef(0)
  const hasHeadingRef = useRef(false)
  const lastHeadingUpdate = useRef(0)
  // Map rotation — tracked so cone always points in absolute compass direction
  const mapHeadingRef = useRef(0)
  const lastMapHeadingCall = useRef(0)

  // ── Floating cone overlay (outside MapView to avoid map annotation jump bug) ──
  // The cone is an absolutely-positioned Animated.View over the map, with its
  // screen position updated via mapRef.pointForCoordinate — no Marker needed.
  const userConeX = useRef(new Animated.Value(-1000)).current
  const userConeY = useRef(new Animated.Value(-1000)).current
  const userConeRotAnim = useRef(new Animated.Value(0)).current
  const userConeOpacityAnim = useRef(new Animated.Value(0)).current
  const userConeLastRot = useRef(0)
  const userConeHasFirst = useRef(false)
  const userConeRotation = userConeRotAnim.interpolate({ inputRange: [-9000, 9000], outputRange: ['-9000deg', '9000deg'] })

  // ── POI state ───────────────────────────────────────────────────────────────
  const [allPOIs, setAllPOIs] = useState<POIPlace[]>([])
  const [isFetchingPOIs, setIsFetchingPOIs] = useState(false)
  const isFetchingRef = useRef(false)
  const [activeFilter, setActiveFilter] = useState<FilterChipKey>('all')
  const [selectedPOIId, setSelectedPOIId] = useState<string | null>(null)
  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState<PlaceDetail | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  // ── Cluster sheet state ─────────────────────────────────────────────────────
  const [clusterSheet, setClusterSheet] = useState<ClusterGroup | null>(null)
  const clusterSlide = useRef(new Animated.Value(300)).current

  const openClusterSheet = useCallback((cluster: ClusterGroup) => {
    setClusterSheet(cluster)
    Animated.spring(clusterSlide, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4 }).start()
  }, [clusterSlide])

  const closeClusterSheet = useCallback(() => {
    Animated.timing(clusterSlide, { toValue: 300, duration: 220, useNativeDriver: true }).start(() =>
      setClusterSheet(null),
    )
  }, [clusterSlide])

  const clusterPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) clusterSlide.setValue(g.dy)
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60) {
          closeClusterSheet()
        } else {
          Animated.spring(clusterSlide, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start()
        }
      },
    }),
  ).current

  // ── AI state ────────────────────────────────────────────────────────────────
  const [aiPanelVisible, setAiPanelVisible] = useState(false)
  const [aiPrefill, setAiPrefill] = useState<string | undefined>()
  const [aiMarkers, setAiMarkers] = useState<AIItinerary['itinerary']>([])
  const [aiRoute, setAiRoute] = useState<Array<{ latitude: number; longitude: number }>>([])
  const [aiSummary, setAiSummary] = useState<AIItinerary['summary'] | null>(null)

  // ── Trip picker modal ────────────────────────────────────────────────────────
  const [tripPickerVisible, setTripPickerVisible] = useState(false)
  const [tripPickerLocation, setTripPickerLocation] = useState<import('../../types').Location | null>(null)
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const toastOpacity = useRef(new Animated.Value(0)).current

  const showSavedToast = (tripTitle: string) => {
    setSavedToast(`Added to "${tripTitle}"`)
    toastOpacity.setValue(0)
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSavedToast(null))
  }

  // ── Map type toggle ─────────────────────────────────────────────────────────
  const [isSatellite, setIsSatellite] = useState(false)

  // ── Map ref + animations ────────────────────────────────────────────────────
  const mapRef = useRef<MapView>(null)
  const askAIGlow = useRef(new Animated.Value(1)).current
  const summarySlide = useRef(new Animated.Value(80)).current

  // Pulsing glow on Ask AI button
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(askAIGlow, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(askAIGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // ── Request permissions + start watching ───────────────────────────────────

  // ── Cone heading animation (same shortest-path logic, now runs in explore.tsx) ─
  const updateConeHeading = useCallback((deg: number) => {
    if (!userConeHasFirst.current) {
      userConeHasFirst.current = true
      userConeLastRot.current = deg
      userConeRotAnim.setValue(deg)
      Animated.timing(userConeOpacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      return
    }
    const lastNorm = ((userConeLastRot.current % 360) + 360) % 360
    let delta = deg - lastNorm
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    const next = userConeLastRot.current + delta
    userConeLastRot.current = next
    Animated.timing(userConeRotAnim, { toValue: next, duration: 200, useNativeDriver: true }).start()
  }, [userConeRotAnim, userConeOpacityAnim])

  // ── Cone screen position (converts GPS → screen px via pointForCoordinate) ──
  const updateConeScreenPos = useCallback(() => {
    if (!userLocation || !mapRef.current) return
    mapRef.current.pointForCoordinate({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    }).then((pt) => {
      userConeX.setValue(pt.x - 26)
      userConeY.setValue(pt.y - 26)
    }).catch(() => {})
  }, [userLocation, userConeX, userConeY])

  const startHeadingWatcher = useCallback(async () => {
    const sub = await Location.watchHeadingAsync((h) => {
      const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading
      if (deg < 0) return

      // Throttle at 100 ms — animation interpolates between ticks so no jitter
      const now = Date.now()
      if (now - lastHeadingUpdate.current < 100) return
      lastHeadingUpdate.current = now

      if (!hasHeadingRef.current) {
        hasHeadingRef.current = true
        accHeadingRef.current = deg
        updateConeHeading(Math.round(deg) - mapHeadingRef.current)
        return
      }

      // Shortest-path delta — prevents 0↔360 spinning
      const normalised = ((accHeadingRef.current % 360) + 360) % 360
      let delta = deg - normalised
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360
      if (Math.abs(delta) < 3) return  // skip tiny jitter

      accHeadingRef.current += delta
      // Normalise back to 0-359 then subtract map heading so cone stays absolute
      const display = ((accHeadingRef.current % 360) + 360) % 360
      updateConeHeading(Math.round(display) - mapHeadingRef.current)
    })
    headingWatcher.current = sub as any
  }, [updateConeHeading])

  const startLocationWatcher = useCallback(async () => {
    const watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 10000 },
      async (loc) => {
        const { latitude, longitude } = loc.coords
        setUserLocation({ latitude, longitude })

        // Reverse geocode for location name
        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude })
          const parts = [geo.district ?? geo.subregion ?? geo.neighborhood, geo.city ?? geo.subregion, geo.country]
            .filter(Boolean)
          if (parts.length) setLocationName(parts.slice(0, 2).join(', '))
        } catch { /* ignore */ }

        // Re-fetch POIs if moved > 500 m from last fetch
        const last = lastFetchCoord.current
        if (!last || distanceMetres(latitude, longitude, last.lat, last.lng) >= REFETCH_DISTANCE_M) {
          fetchPOIs(latitude, longitude)
        }
      },
    )
    locationWatcher.current = watcher
  }, [])

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status === 'granted') {
      setPermStatus('granted')
      // Get initial position quickly
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = pos.coords
      setUserLocation({ latitude, longitude })
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 800)
      fetchPOIs(latitude, longitude)
      startLocationWatcher()
      startHeadingWatcher()
    } else {
      setPermStatus('denied')
    }
  }, [startLocationWatcher, startHeadingWatcher])

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status === 'granted') {
        setPermStatus('granted')
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const { latitude, longitude } = pos.coords
        setUserLocation({ latitude, longitude })
        mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 600)
        fetchPOIs(latitude, longitude)
        startLocationWatcher()
        startHeadingWatcher()
      } else if (status === 'denied') {
        setPermStatus('denied')
      } else {
        setPermStatus('prompt')
      }
    })()
    return () => {
      locationWatcher.current?.remove()
      headingWatcher.current?.remove()
    }
  }, [startLocationWatcher])

  // ── POI fetch with caching ──────────────────────────────────────────────────

  const fetchPOIs = useCallback(async (lat: number, lng: number) => {
    if (isFetchingRef.current) return
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`
    const cached = poiCache.get(cacheKey)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setAllPOIs(cached.pois)
      lastFetchCoord.current = { lat, lng }
      return
    }
    isFetchingRef.current = true
    setIsFetchingPOIs(true)
    lastFetchCoord.current = { lat, lng }
    try {
      const pois = await fetchAllNearbyPOIs(lat, lng, GOOGLE_MAPS_KEY)
      poiCache.set(cacheKey, { pois, fetchedAt: Date.now() })
      setAllPOIs(pois)
    } finally {
      isFetchingRef.current = false
      setIsFetchingPOIs(false)
    }
  }, [])

  // ── Re-centre map ──────────────────────────────────────────────────────────

  const reCentre = useCallback(() => {
    if (!userLocation) return
    mapRef.current?.animateToRegion(
      { ...userLocation, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      500,
    )
  }, [userLocation])

  // ── Keep cone screen position in sync with GPS updates ────────────────────
  useEffect(() => {
    updateConeScreenPos()
  }, [updateConeScreenPos])

  // ── Pan-to-explore: fetch POIs when map centre moves ──────────────────────

  const handleRegionChangeComplete = useCallback(async (region: Region) => {
    const { latitude: lat, longitude: lng } = region
    const last = lastFetchCoord.current
    if (last && distanceMetres(lat, lng, last.lat, last.lng) < REFETCH_DISTANCE_M) return

    fetchPOIs(lat, lng)

    // Update location name to reflect the area being viewed
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      const parts = [geo.district ?? geo.subregion ?? geo.neighborhood, geo.city ?? geo.subregion, geo.country]
        .filter(Boolean)
      if (parts.length) setLocationName(parts.slice(0, 2).join(', '))
    } catch { /* ignore */ }

    // Reposition cone after map settles
    updateConeScreenPos()
  }, [fetchPOIs, updateConeScreenPos])

  // ── Live map-heading tracking (fixes cone drift when map is rotated) ────────
  // onRegionChange fires at ~60fps during gestures; getCamera() is a fast
  // bridge call. Throttled to every 50ms so we don't flood the bridge.

  const handleRegionChange = useCallback((_region: Region) => {
    const now = Date.now()
    if (now - lastMapHeadingCall.current < 50) return
    lastMapHeadingCall.current = now

    mapRef.current?.getCamera().then((cam) => {
      const mapH = cam?.heading ?? 0
      if (Math.abs(mapH - mapHeadingRef.current) >= 0.5) {
        // Map rotated — re-apply compass heading with updated compensation
        mapHeadingRef.current = mapH
        if (hasHeadingRef.current) {
          const display = ((accHeadingRef.current % 360) + 360) % 360
          updateConeHeading(Math.round(display) - mapH)
        }
      }
      // Always reposition cone (handles pan + zoom too, not just rotation)
      updateConeScreenPos()
    })
  }, [updateConeHeading, updateConeScreenPos])

  // ── POI tap → fetch details + show sheet ──────────────────────────────────

  const handlePOIPress = useCallback(async (poi: POIPlace) => {
    setSelectedPOIId(poi.place_id)
    setSheetVisible(true)
    // Optimistic: show with base data while details load
    setSelectedPlaceDetail(poi as PlaceDetail)
    const detail = await fetchPlaceDetails(poi.place_id, GOOGLE_MAPS_KEY)
    if (detail) setSelectedPlaceDetail(detail)
  }, [])

  const handleClusterPress = useCallback((cluster: ClusterGroup) => {
    openClusterSheet(cluster)
  }, [openClusterSheet])

  // ── Ask AI: Plot on Map ────────────────────────────────────────────────────

  const handlePlotOnMap = useCallback((itinerary: AIItinerary) => {
    setAiMarkers(itinerary.itinerary)
    setAiSummary(itinerary.summary)
    // Build route coordinates
    const route = itinerary.itinerary.map((s) => ({ latitude: s.coordinates.lat, longitude: s.coordinates.lng }))
    setAiRoute(route)

    // Fit map to all stops
    if (route.length > 0) {
      mapRef.current?.fitToCoordinates(route, { edgePadding: { top: 100, right: 40, bottom: 160, left: 40 }, animated: true })
    }

    // Slide in summary strip
    Animated.spring(summarySlide, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }).start()
  }, [summarySlide])

  const clearAIRoute = useCallback(() => {
    setAiMarkers([])
    setAiRoute([])
    setAiSummary(null)
    Animated.timing(summarySlide, { toValue: 80, duration: 250, useNativeDriver: true }).start()
  }, [summarySlide])

  // ── Filtered + clustered POIs ──────────────────────────────────────────────

  const filteredPOIs = activeFilter === 'all'
    ? allPOIs
    : allPOIs.filter((p) => p.type === activeFilter)

  // Limit pins, then cluster
  const limitedPOIs = filteredPOIs.slice(0, MAX_VISIBLE_PINS)
  const clustered = clusterPOIs(limitedPOIs, 80)

  // ── Render: permission screen ──────────────────────────────────────────────

  if (permStatus === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="compass" size={40} color={TEAL} />
      </View>
    )
  }

  if (permStatus === 'prompt' || permStatus === 'denied') {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <PermissionScreen status={permStatus} onRequest={requestPermission} />
      </>
    )
  }

  // ─── Tab bar height estimate for floating buttons ─────────────────────────
  const tabBarH = insets.bottom + 60

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={Platform.OS === 'android' && !isSatellite ? DARK_MAP_STYLE : undefined}
        mapType={isSatellite ? 'hybrid' : Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings
        showsPointsOfInterest={false}
        rotateEnabled
        pitchEnabled={false}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        initialRegion={{
          latitude: userLocation?.latitude ?? 51.505,
          longitude: userLocation?.longitude ?? -0.09,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
      >
        {/* User location dot — simple static marker, no animation (avoids jump-to-top-left bug) */}
        {userLocation && (
          <Marker
            coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(13,148,136,0.25)', borderWidth: 2, borderColor: 'rgba(13,148,136,0.6)', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0D9488', shadowColor: '#0D9488', shadowOpacity: 1, shadowRadius: 6, elevation: 6 }} />
            </View>
          </Marker>
        )}

        {/* POI pins */}
        {clustered.map((item) => {
          if ('count' in item) {
            return (
              <ClusterMarker
                key={item.id}
                cluster={item}
                onPress={handleClusterPress}
              />
            )
          }
          return (
            <POIMarker
              key={item.place_id}
              poi={item}
              onPress={handlePOIPress}
              isSelected={item.place_id === selectedPOIId}
            />
          )
        })}

        {/* AI suggested markers */}
        {aiMarkers.map((stop) => (
          <AIMarker
            key={`ai-${stop.order}`}
            placeId={`ai-${stop.order}`}
            name={stop.place_name}
            emoji={stop.emoji}
            latitude={stop.coordinates.lat}
            longitude={stop.coordinates.lng}
            order={stop.order}
          />
        ))}

        {/* AI route polyline */}
        {aiRoute.length > 1 && (
          <Polyline
            coordinates={aiRoute}
            strokeColor={TEAL}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        )}
      </MapView>

      {/* ── Floating direction cone (outside MapView — no map annotation jump bug) */}
      {userLocation && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 52,
            height: 52,
            transform: [{ translateX: userConeX }, { translateY: userConeY }],
          }}
        >
          <Animated.View
            style={{
              width: 52,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: userConeOpacityAnim,
              transform: [{ rotate: userConeRotation }],
            }}
          >
            {/* Glow cone */}
            <View style={{ position: 'absolute', top: 3, width: 0, height: 0, borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 26, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(13,148,136,0.2)' }} />
            {/* Solid cone */}
            <View style={{ position: 'absolute', top: 5, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 21, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'rgba(13,148,136,0.75)' }} />
          </Animated.View>
        </Animated.View>
      )}

      {/* ── Location name (top left, over map) ─────────────────────────── */}
      {(locationName || isFetchingPOIs) ? (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 14,
            left: 16,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(13,13,24,0.75)',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: isFetchingPOIs ? 'rgba(13,148,136,0.35)' : 'rgba(255,255,255,0.1)',
          }}
        >
          <Ionicons
            name={isFetchingPOIs ? 'sync-outline' : 'location'}
            size={13}
            color={TEAL}
          />
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500', marginLeft: 5 }}>
            {isFetchingPOIs ? t.explore.searching : locationName}
          </Text>
        </View>
      ) : null}

      {/* ── Filter chips (top, floating) ────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 52,
          left: 0,
          right: 0,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
        >
          {FILTER_CHIP_KEYS.map((chipKey) => {
            const isActive = activeFilter === chipKey
            return (
              <TouchableOpacity
                key={chipKey}
                onPress={() => setActiveFilter(chipKey)}
                activeOpacity={0.78}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isActive
                    ? TEAL
                    : 'rgba(13,13,24,0.82)',
                  borderWidth: 1,
                  borderColor: isActive ? 'transparent' : 'rgba(255,255,255,0.14)',
                  shadowColor: isActive ? TEAL : 'transparent',
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                  elevation: isActive ? 5 : 2,
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                    fontSize: 13,
                    fontWeight: isActive ? '700' : '500',
                    letterSpacing: 0.2,
                  }}
                >
                  {t.explore.filters[chipKey]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* ── Re-centre + satellite buttons (bottom right) ──────────────── */}
      <View style={{ position: 'absolute', right: 16, bottom: tabBarH + 72, gap: 10 }}>
        {/* Satellite toggle */}
        <TouchableOpacity
          onPress={() => setIsSatellite((v) => !v)}
          activeOpacity={0.82}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: isSatellite ? TEAL : 'rgba(13,13,24,0.92)',
            borderWidth: 1,
            borderColor: isSatellite ? TEAL : 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: isSatellite ? TEAL : '#000',
            shadowOpacity: isSatellite ? 0.5 : 0.35,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <Ionicons name="globe-outline" size={20} color={isSatellite ? '#fff' : TEAL} />
        </TouchableOpacity>

        {/* Re-centre */}
        <TouchableOpacity
          onPress={reCentre}
          activeOpacity={0.82}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(13,13,24,0.92)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <Ionicons name="compass" size={20} color={TEAL} />
        </TouchableOpacity>
      </View>

      {/* ── AI route summary strip ───────────────────────────────────────── */}
      {aiSummary && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: tabBarH + 70,
            transform: [{ translateY: summarySlide }],
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(13,13,24,0.95)',
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: 'rgba(13,148,136,0.45)',
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: TEAL, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 2 }}>
                {t.explore.aiItinerary}
              </Text>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                {aiSummary.stops} stops · {aiSummary.total_time} · {aiSummary.total_cost}
              </Text>
            </View>
            <TouchableOpacity onPress={clearAIRoute} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Ask AI floating button (bottom centre) ──────────────────────── */}
      <View
        style={{
          position: 'absolute',
          bottom: tabBarH + 14,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Animated.View style={{ transform: [{ scale: askAIGlow }] }}>
          <TouchableOpacity
            onPress={() => { setAiPrefill(undefined); setAiPanelVisible(true) }}
            activeOpacity={0.84}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(13,13,24,0.96)',
              borderRadius: 30,
              paddingVertical: 12,
              paddingHorizontal: 22,
              borderWidth: 1.5,
              borderColor: TEAL,
              shadowColor: TEAL,
              shadowOpacity: 0.55,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <Text style={{ fontSize: 16 }}>✨</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 }}>{t.explore.askAI}</Text>
            <Ionicons name="mic-outline" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── POI detail bottom sheet ──────────────────────────────────────── */}
      <POIBottomSheet
        place={selectedPlaceDetail}
        apiKey={GOOGLE_MAPS_KEY}
        visible={sheetVisible}
        onDismiss={() => { setSheetVisible(false); setSelectedPOIId(null) }}
        onAskAI={(name) => {
          setSheetVisible(false)
          setAiPrefill(`Tell me about ${name} and what to expect`)
          setTimeout(() => setAiPanelVisible(true), 320)
        }}
        onSaveToTrip={(place) => {
          setTripPickerLocation({
            name: place.name,
            address: place.formatted_address ?? place.vicinity,
            latitude: place.latitude,
            longitude: place.longitude,
            category: place.type,
          })
          setSheetVisible(false)
          setTimeout(() => setTripPickerVisible(true), 300)
        }}
      />

      {/* ── Ask AI panel ─────────────────────────────────────────────────── */}
      {userLocation && (
        <AskAIPanel
          visible={aiPanelVisible}
          onDismiss={() => setAiPanelVisible(false)}
          currentLat={userLocation.latitude}
          currentLng={userLocation.longitude}
          locationName={locationName}
          prefillPrompt={aiPrefill}
          nearbyPlaces={allPOIs.map((p) => ({
            name: p.name,
            category: p.type,
            lat: p.latitude,
            lng: p.longitude,
            rating: p.rating,
            vicinity: p.vicinity,
          }))}
          onPlotOnMap={handlePlotOnMap}
        />
      )}

      {/* ── Cluster list sheet ───────────────────────────────────────────── */}
      {clusterSheet && (
        <>
          {/* Backdrop */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeClusterSheet}
            style={{ position: 'absolute', inset: 0 } as any}
          />

          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateY: clusterSlide }],
            }}
            {...clusterPanResponder.panHandlers}
          >
            <View
              style={{
                backgroundColor: 'rgba(13,13,24,0.98)',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                borderTopWidth: 1,
                borderColor: 'rgba(13,148,136,0.25)',
                paddingBottom: insets.bottom + 62 + 8,
              }}
            >
              {/* Drag handle */}
              <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                  {interpolate(t.explore.placesHere, { count: clusterSheet.count })}
                </Text>
                <TouchableOpacity onPress={closeClusterSheet} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color="rgba(255,255,255,0.45)" />
                </TouchableOpacity>
              </View>

              {/* POI rows */}
              <ScrollView
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {clusterSheet.items.map((poi, i) => (
                  <TouchableOpacity
                    key={poi.place_id}
                    onPress={() => { closeClusterSheet(); setTimeout(() => handlePOIPress(poi), 260) }}
                    activeOpacity={0.78}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 13,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderColor: 'rgba(255,255,255,0.07)',
                    }}
                  >
                    {/* Emoji badge */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: 'rgba(13,148,136,0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(13,148,136,0.35)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{poi.emoji}</Text>
                    </View>

                    {/* Name + category */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                        {poi.name}
                      </Text>
                      {poi.rating != null && (
                        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>
                          ★ {poi.rating.toFixed(1)}
                        </Text>
                      )}
                    </View>

                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        </>
      )}

      {/* ── Trip picker modal ─────────────────────────────────────────────── */}
      <TripPickerModal
        visible={tripPickerVisible}
        location={tripPickerLocation}
        onDismiss={() => setTripPickerVisible(false)}
        onSaved={(title) => {
          setTripPickerVisible(false)
          showSavedToast(title)
        }}
      />

      {/* ── "Added to trip" toast ─────────────────────────────────────────── */}
      {savedToast && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 100,
            alignSelf: 'center',
            opacity: toastOpacity,
            backgroundColor: 'rgba(13,148,136,0.92)',
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 24,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
          pointerEvents="none"
        >
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{savedToast}</Text>
        </Animated.View>
      )}
    </View>
  )
}
