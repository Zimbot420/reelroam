import React, { useRef, useEffect } from 'react'
import { Animated, Text, TouchableOpacity, View } from 'react-native'
import { Marker } from 'react-native-maps'
import type { POIPlace, ClusterGroup } from '../lib/placesApi'

const TEAL = '#0D9488'
const NAVY = '#1a1a2e'

// ─── Single POI Marker ────────────────────────────────────────────────────────

interface POIMarkerProps {
  poi: POIPlace
  onPress: (poi: POIPlace) => void
  isSelected?: boolean
  isAISuggested?: boolean
}

export function POIMarker({ poi, onPress, isSelected = false, isAISuggested = false }: POIMarkerProps) {
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isSelected ? 1.15 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start()
  }, [isSelected])

  const borderColor = isSelected || isAISuggested ? TEAL : 'rgba(13,148,136,0.45)'
  const bgColor = isAISuggested ? 'rgba(13,148,136,0.18)' : NAVY

  const truncated = poi.name.length > 12 ? poi.name.slice(0, 12) + '…' : poi.name

  return (
    <Marker
      coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
      onPress={() => onPress(poi)}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: bgColor,
            borderRadius: 20,
            borderWidth: 1,
            borderColor,
            paddingHorizontal: 8,
            paddingVertical: 5,
            shadowColor: TEAL,
            shadowOpacity: isSelected ? 0.6 : 0.2,
            shadowRadius: isSelected ? 8 : 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: isSelected ? 8 : 3,
            maxWidth: 140,
          }}
        >
          <Text style={{ fontSize: 13 }}>{poi.emoji}</Text>
          <Text
            style={{
              color: '#ffffff',
              fontSize: 11,
              fontWeight: '600',
              marginLeft: 4,
              letterSpacing: 0.2,
            }}
            numberOfLines={1}
          >
            {truncated}
          </Text>
        </View>
      </Animated.View>
    </Marker>
  )
}

// ─── AI-Suggested Marker (special teal variant) ───────────────────────────────

interface AIMarkerProps {
  placeId: string
  name: string
  emoji: string
  latitude: number
  longitude: number
  order: number
  onPress?: () => void
}

export function AIMarker({ name, emoji, latitude, longitude, order, onPress }: AIMarkerProps) {
  const truncated = name.length > 12 ? name.slice(0, 12) + '…' : name

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={{ alignItems: 'center' }}>
        {/* Order badge */}
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: TEAL,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 2,
            shadowColor: TEAL,
            shadowOpacity: 0.9,
            shadowRadius: 6,
            elevation: 6,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{order}</Text>
        </View>

        {/* Pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(13,148,136,0.25)',
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: TEAL,
            paddingHorizontal: 8,
            paddingVertical: 5,
            shadowColor: TEAL,
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 13 }}>{emoji}</Text>
          <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
            {truncated}
          </Text>
        </View>
      </View>
    </Marker>
  )
}

// ─── Cluster Marker ───────────────────────────────────────────────────────────

interface ClusterMarkerProps {
  cluster: ClusterGroup
  onPress: (cluster: ClusterGroup) => void
}

export function ClusterMarker({ cluster, onPress }: ClusterMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={() => onPress(cluster)}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(cluster)}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(13,148,136,0.22)',
            borderWidth: 2,
            borderColor: TEAL,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: TEAL,
            shadowOpacity: 0.45,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{cluster.count}</Text>
        </View>
      </TouchableOpacity>
    </Marker>
  )
}

