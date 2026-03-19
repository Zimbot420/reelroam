import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Rect, RadialGradient, Defs, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  clamp,
  runOnJS,
} from 'react-native-reanimated';
import { worldMapPaths, WORLD_MAP_VIEWBOX } from '../lib/worldMapPaths';
import { getCountryName, getFlagEmoji, randomCountryCode } from '../lib/countryUtils';
import CountryToast from './CountryToast';
import { Ionicons } from '@expo/vector-icons';

// ─── Design tokens ──────────────────────────────────────────────────────────
const OCEAN_COLOR   = '#0a0a1a';
const UNVISITED_FILL   = '#1e2035';
const UNVISITED_STROKE = '#3d4166';
const VISITED_FILL     = '#0D9488';
const VISITED_STROKE   = '#14b8a6';
const BASE_STROKE = 2;

const MAP_VIEWBOX_W = 1010;
const MAP_VIEWBOX_H = 505;

const MIN_SCALE  = 1;
const MAX_SCALE  = 6;
const INIT_SCALE = 1.5;
const INIT_TX    = -15;
const INIT_TY    = 40;

// ─── Remove confirmation sheet ───────────────────────────────────────────────
interface RemoveSheetProps {
  countryCode: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}
function RemoveSheet({ countryCode, onConfirm, onCancel }: RemoveSheetProps) {
  if (!countryCode) return null;
  const name = getCountryName(countryCode);
  const flag = getFlagEmoji(countryCode);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        onPress={onCancel}
      >
        <Pressable onPress={e => e.stopPropagation()}>
          <View style={{
            backgroundColor: '#12132a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingTop: 16, paddingBottom: 40, paddingHorizontal: 24,
            borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
          }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 6 }}>
              {flag} {name}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
              Remove from your visited countries?
            </Text>
            <TouchableOpacity
              onPress={onConfirm}
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginBottom: 10 }}
            >
              <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onCancel}
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Read-only map ────────────────────────────────────────────────────────────
export interface ScratchMapReadonlyProps {
  visitedCodes: string[];
  width: number;
  height: number;
}
export function ScratchMapReadonly({ visitedCodes, width, height }: ScratchMapReadonlyProps) {
  const visitedSet = useMemo(() => new Set(visitedCodes), [visitedCodes]);
  return (
    <View style={{ width, height, backgroundColor: OCEAN_COLOR, overflow: 'hidden' }}>
      <Svg width={width} height={height} viewBox={WORLD_MAP_VIEWBOX} preserveAspectRatio="xMidYMid meet">
        <Rect x={0} y={0} width={MAP_VIEWBOX_W} height={MAP_VIEWBOX_H} fill={OCEAN_COLOR} />
        {worldMapPaths.map(cp => (
          <Path key={cp.id} d={cp.d}
            fill={visitedSet.has(cp.id) ? VISITED_FILL : UNVISITED_FILL}
            stroke={visitedSet.has(cp.id) ? VISITED_STROKE : UNVISITED_STROKE}
            strokeWidth={BASE_STROKE}
          />
        ))}
        <Defs>
          <RadialGradient id="vig_ro" cx="50%" cy="50%" r="70%">
            <Stop offset="0%" stopColor="transparent" stopOpacity={0} />
            <Stop offset="100%" stopColor={OCEAN_COLOR} stopOpacity={0.55} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={MAP_VIEWBOX_W} height={MAP_VIEWBOX_H} fill="url(#vig_ro)" />
      </Svg>
    </View>
  );
}

// ─── Interactive map ──────────────────────────────────────────────────────────
export interface ScratchMapProps {
  visitedCodes: string[];
  onToggleCountry: (isoCode: string, nowVisited: boolean) => void;
  interactive?: boolean;
  width?: number;
  height?: number;
}

export default function ScratchMap({
  visitedCodes,
  onToggleCountry,
  interactive = true,
  width: propWidth,
  height: propHeight = 220,
}: ScratchMapProps) {
  const { width: SCREEN_W } = Dimensions.get('window');
  const mapWidth  = propWidth ?? SCREEN_W;
  const mapHeight = propHeight;

  const visitedSet = useMemo(() => new Set(visitedCodes), [visitedCodes]);

  const [toastCode,    setToastCode]    = useState<string | null>(null);
  const [toastAdding,  setToastAdding]  = useState(true);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [glowCode,     setGlowCode]     = useState<string | null>(null);
  const [hasEverTapped, setHasEverTapped] = useState(visitedCodes.length > 0);
  const glowTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Onboarding pulse when 0 countries visited
  useEffect(() => {
    if (hasEverTapped || visitedCodes.length > 0) {
      if (glowTimer.current) clearInterval(glowTimer.current);
      setGlowCode(null);
      return;
    }
    const pulse = () => { setGlowCode(randomCountryCode()); setTimeout(() => setGlowCode(null), 1200); };
    pulse();
    glowTimer.current = setInterval(pulse, 3000);
    return () => { if (glowTimer.current) clearInterval(glowTimer.current); };
  }, [hasEverTapped, visitedCodes.length]);

  // ── Reanimated shared values ──────────────────────────────────────────────
  const scale      = useSharedValue(INIT_SCALE);
  const savedScale = useSharedValue(INIT_SCALE);
  const translateX = useSharedValue(INIT_TX);
  const translateY = useSharedValue(INIT_TY);
  const focalX     = useSharedValue(0);
  const focalY     = useSharedValue(0);
  const snapTX     = useSharedValue(0);
  const snapTY     = useSharedValue(0);
  const lastPanX   = useSharedValue(0);
  const lastPanY   = useSharedValue(0);

  const [isZoomed,     setIsZoomed]     = useState(true);
  const [displayScale, setDisplayScale] = useState(INIT_SCALE);

  const setIsZoomedJS     = useCallback((v: boolean) => setIsZoomed(v), []);
  const updateDisplayScale = useCallback((s: number) => setDisplayScale(s), []);

  // ── Country tap — SVG handles hit-testing natively ───────────────────────
  // react-native-svg Path.onPress fires in SVG coordinate space so it is
  // accurate at any zoom level without any coordinate conversion.
  const handleCountryTap = useCallback(
    (isoCode: string) => {
      if (!interactive) return;
      setHasEverTapped(true);
      if (visitedSet.has(isoCode)) {
        setRemoveTarget(isoCode);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setToastCode(isoCode);
        setToastAdding(true);
        onToggleCountry(isoCode, true);
      }
    },
    [interactive, visitedSet, onToggleCountry],
  );

  // ── Pinch ─────────────────────────────────────────────────────────────────
  const pinchGesture = Gesture.Pinch()
    .onBegin(e => {
      'worklet';
      savedScale.value = scale.value;
      snapTX.value = translateX.value;
      snapTY.value = translateY.value;
      focalX.value = e.focalX - mapWidth  / 2;
      focalY.value = e.focalY - mapHeight / 2;
    })
    .onUpdate(e => {
      'worklet';
      const newScale = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      const ratio = newScale / savedScale.value;
      const mTX = ((newScale - 1) * mapWidth)  / 2;
      const mTY = ((newScale - 1) * mapHeight) / 2;
      scale.value      = newScale;
      translateX.value = clamp(snapTX.value * ratio - focalX.value * (ratio - 1), -mTX, mTX);
      translateY.value = clamp(snapTY.value * ratio - focalY.value * (ratio - 1), -mTY, mTY);
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;
      runOnJS(setIsZoomedJS)(scale.value > 1.05);
      runOnJS(updateDisplayScale)(scale.value);
    });

  // ── Pan (delta-based, min 10px so short taps don't activate it) ──────────
  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .minDistance(10)          // taps < 10px pass through to SVG onPress
    .onBegin(() => {
      'worklet';
      lastPanX.value = 0;
      lastPanY.value = 0;
    })
    .onUpdate(e => {
      'worklet';
      if (scale.value <= 1.05) return;
      const dx = e.translationX - lastPanX.value;
      const dy = e.translationY - lastPanY.value;
      lastPanX.value = e.translationX;
      lastPanY.value = e.translationY;
      const mTX = ((scale.value - 1) * mapWidth)  / 2;
      const mTY = ((scale.value - 1) * mapHeight) / 2;
      translateX.value = clamp(translateX.value + dx, -mTX, mTX);
      translateY.value = clamp(translateY.value + dy, -mTY, mTY);
    });

  // Pinch and pan run simultaneously; no tap gesture needed — SVG onPress handles taps
  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetZoom = useCallback(() => {
    scale.value      = withSpring(INIT_SCALE, { damping: 15 });
    translateX.value = withSpring(INIT_TX,    { damping: 15 });
    translateY.value = withSpring(INIT_TY,    { damping: 15 });
    savedScale.value = INIT_SCALE;
    setIsZoomed(true);
    setDisplayScale(INIT_SCALE);
  }, []);

  const handleRemoveConfirm = useCallback(() => {
    if (!removeTarget) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToastCode(removeTarget);
    setToastAdding(false);
    onToggleCountry(removeTarget, false);
    setRemoveTarget(null);
  }, [removeTarget, onToggleCountry]);

  const strokeWidth = BASE_STROKE / displayScale;

  return (
    <View style={{ width: mapWidth, height: mapHeight, backgroundColor: OCEAN_COLOR, overflow: 'hidden' }}>
      <GestureDetector gesture={composed}>
        <Reanimated.View style={[{ flex: 1 }, animatedStyle]}>
          <Svg
            width={mapWidth}
            height={mapHeight}
            viewBox={WORLD_MAP_VIEWBOX}
            preserveAspectRatio="xMidYMid meet"
          >
            <Rect x={0} y={0} width={MAP_VIEWBOX_W} height={MAP_VIEWBOX_H} fill={OCEAN_COLOR} />

            {worldMapPaths.map(cp => {
              const isVisited = visitedSet.has(cp.id);
              const isGlowing = glowCode === cp.id;
              return (
                <Path
                  key={cp.id}
                  d={cp.d}
                  fill={isVisited || isGlowing ? VISITED_FILL : UNVISITED_FILL}
                  stroke={isVisited ? VISITED_STROKE : UNVISITED_STROKE}
                  strokeWidth={strokeWidth}
                  onPress={interactive ? () => handleCountryTap(cp.id) : undefined}
                />
              );
            })}

            <Defs>
              <RadialGradient id="vig" cx="50%" cy="50%" r="70%">
                <Stop offset="0%" stopColor="transparent" stopOpacity={0} />
                <Stop offset="100%" stopColor={OCEAN_COLOR} stopOpacity={0.55} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={MAP_VIEWBOX_W} height={MAP_VIEWBOX_H} fill="url(#vig)" />
          </Svg>
        </Reanimated.View>
      </GestureDetector>

      {isZoomed && (
        <TouchableOpacity
          onPress={resetZoom}
          style={{
            position: 'absolute', bottom: 10, right: 10,
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: 'rgba(0,0,0,0.6)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <Ionicons name="contract-outline" size={14} color="white" />
        </TouchableOpacity>
      )}

      <CountryToast isoCode={toastCode} adding={toastAdding} onDone={() => setToastCode(null)} />
      <RemoveSheet countryCode={removeTarget} onConfirm={handleRemoveConfirm} onCancel={() => setRemoveTarget(null)} />
    </View>
  );
}
