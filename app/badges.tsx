import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getAllBadges, getUserBadgesWithDetails, TIER_COLORS, TIER_GLOW } from '../lib/badges';
import { getOrCreateDeviceId } from '../lib/deviceId';
import { Badge } from '../types';
import BadgeBottomSheet from '../components/BadgeBottomSheet';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = (SCREEN_WIDTH - 32 - 16) / 3; // 16px side padding, 8px between cells

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
};

// Ring stroke thickness — thicker = rarer
const TIER_STROKE: Record<string, number> = {
  bronze: 2, silver: 2.5, gold: 3, platinum: 3.5,
};

// Glow intensity per tier
const TIER_SHADOW_RADIUS: Record<string, number> = {
  bronze: 10, silver: 14, gold: 20, platinum: 28,
};
const TIER_SHADOW_OPACITY: Record<string, number> = {
  bronze: 0.45, silver: 0.5, gold: 0.65, platinum: 0.8,
};

// Human-readable rarity strings (more evocative than tier names)
const RARITY_LABEL: Record<string, string> = {
  bronze: 'COMMON', silver: 'RARE', gold: 'EPIC', platinum: 'LEGENDARY',
};

type FilterTab  = 'earned' | 'locked' | 'all';
type CategoryId = 'all' | 'country' | 'explorer' | 'social' | 'travel_style' | 'booking' | 'secret';

const CATEGORY_CHIPS: { id: CategoryId; label: string }[] = [
  { id: 'all',          label: 'All'          },
  { id: 'country',      label: 'Countries'    },
  { id: 'explorer',     label: 'Explorer'     },
  { id: 'social',       label: 'Social'       },
  { id: 'travel_style', label: 'Travel Style' },
  { id: 'booking',      label: 'Booking'      },
  { id: 'secret',       label: 'Secret'       },
];

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function BadgeSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 750, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 16 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Animated.View
          key={i}
          style={{ width: CELL_SIZE, height: CELL_SIZE + 20, borderRadius: 16, backgroundColor: '#1a1a2e', opacity }}
        />
      ))}
    </View>
  );
}

// ─── Tier ring (SVG progress arc) ────────────────────────────────────────────

function TierRing({
  size,
  earned,
  tier,
  tierColor,
}: {
  size: number;
  earned: boolean;
  tier: string;
  tierColor: string;
}) {
  const stroke = TIER_STROKE[tier] ?? 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // Earned = full 360° ring. Locked = ~28% arc (teases completion)
  const dashOffset = earned ? 0 : circumference * 0.72;

  return (
    <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
      {/* Dim track behind the arc */}
      <Circle
        cx={center} cy={center} r={radius}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
        fill="none"
      />
      {/* Arc: tier color when earned, ghosted when locked */}
      <Circle
        cx={center} cy={center} r={radius}
        stroke={earned ? tierColor : 'rgba(255,255,255,0.14)'}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={dashOffset}
        rotation={-90}
        originX={center}
        originY={center}
      />
    </Svg>
  );
}

// ─── Badge cell ───────────────────────────────────────────────────────────────

function BadgeCell({
  badge, earned, earnedAt, onPress,
}: {
  badge: Badge;
  earned: boolean;
  earnedAt?: string;
  onPress: () => void;
}) {
  const scale     = useRef(new Animated.Value(1)).current;
  const tierColor = TIER_COLORS[badge.tier] ?? '#0D9488';

  function pressIn()  { Animated.spring(scale, { toValue: 0.91, useNativeDriver: true, speed: 50 }).start(); }
  function pressOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50 }).start(); }

  const isLockedSecret = badge.is_secret && !earned;
  // Ring size = icon container + ring clearance
  const ringSize  = CELL_SIZE - 4;
  // Icon inner area is inset from the ring
  const innerSize = ringSize - (TIER_STROKE[badge.tier] ?? 2.5) * 2 - 8;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      style={{ width: CELL_SIZE, alignItems: 'center' }}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>

        {/* ── Ring + icon ── */}
        <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>

          {/* SVG progress arc sits behind everything */}
          <TierRing size={ringSize} earned={earned} tier={badge.tier} tierColor={tierColor} />

          {/* Icon container — inset so ring is clearly visible */}
          <View
            style={{
              width: innerSize,
              height: innerSize,
              borderRadius: 16,
              backgroundColor: earned ? `${tierColor}16` : 'rgba(255,255,255,0.03)',
              alignItems: 'center',
              justifyContent: 'center',
              // Tier-scaled glow — much stronger for gold/platinum
              ...(earned ? {
                shadowColor: tierColor,
                shadowOpacity: TIER_SHADOW_OPACITY[badge.tier] ?? 0.4,
                shadowRadius: TIER_SHADOW_RADIUS[badge.tier] ?? 12,
                shadowOffset: { width: 0, height: 0 },
                elevation: 8,
              } : {}),
            }}
          >
            {/* Frosted top edge highlight */}
            {earned && (
              <View style={{
                position: 'absolute', top: 0, left: 6, right: 6, height: 1,
                backgroundColor: `${tierColor}40`, borderRadius: 1,
              }} />
            )}

            {/* Icon */}
            <Text style={{ fontSize: 26, opacity: earned ? 1 : 0.16 }}>
              {isLockedSecret ? '🔒' : badge.icon}
            </Text>

            {/* Checkmark badge — earned */}
            {earned && (
              <View style={{
                position: 'absolute', bottom: 3, right: 3,
                width: 16, height: 16, borderRadius: 8,
                backgroundColor: tierColor,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: tierColor, shadowOpacity: 0.6, shadowRadius: 4,
              }}>
                <Ionicons name="checkmark" size={9} color="white" />
              </View>
            )}

            {/* Lock badge — locked non-secret */}
            {!earned && !badge.is_secret && (
              <View style={{
                position: 'absolute', bottom: 3, right: 3,
                width: 16, height: 16, borderRadius: 8,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="lock-closed" size={8} color="rgba(255,255,255,0.35)" />
              </View>
            )}
          </View>
        </View>

        {/* Badge name */}
        <Text
          numberOfLines={2}
          style={{
            color: earned ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.22)',
            fontSize: 10,
            fontWeight: earned ? '600' : '400',
            textAlign: 'center',
            marginTop: 5,
            lineHeight: 13,
            paddingHorizontal: 2,
          }}
        >
          {isLockedSecret ? '???' : badge.name}
        </Text>

        {/* Rarity pill */}
        <View style={{
          marginTop: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 5,
          backgroundColor: earned ? `${tierColor}20` : 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: earned ? `${tierColor}50` : 'rgba(255,255,255,0.07)',
        }}>
          <Text style={{
            fontSize: 7,
            fontWeight: '800',
            letterSpacing: 0.7,
            color: earned ? tierColor : 'rgba(255,255,255,0.14)',
          }}>
            {RARITY_LABEL[badge.tier] ?? badge.tier.toUpperCase()}
          </Text>
        </View>

      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BadgesScreen() {
  const router = useRouter();

  const [allBadges,    setAllBadges]    = useState<Badge[]>([]);
  const [earnedMap,    setEarnedMap]    = useState<Record<string, string>>({}); // slug → earned_at
  const [loading,      setLoading]      = useState(true);
  const [filterTab,    setFilterTab]    = useState<FilterTab>('all');
  const [category,     setCategory]     = useState<CategoryId>('all');
  const [selectedBadge,setSelectedBadge]= useState<(Badge & { earned_at?: string }) | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const [badges, userBadges] = await Promise.all([
        getAllBadges(),
        getUserBadgesWithDetails(deviceId),
      ]);
      setAllBadges(badges);
      const map: Record<string, string> = {};
      userBadges.forEach((ub) => { map[ub.slug] = ub.earned_at; });
      setEarnedMap(map);
    } catch (err) {
      console.error('Failed to load badges:', err);
    } finally {
      setLoading(false);
    }
  }

  const earnedCount = Object.keys(earnedMap).length;
  const totalCount  = allBadges.length;

  const filteredBadges = useMemo(() => {
    let list = allBadges;

    // Category filter
    if (category !== 'all') {
      list = list.filter((b) => b.category === category);
    }

    // Tab filter
    if (filterTab === 'earned') {
      list = list.filter((b) => !!earnedMap[b.slug]);
    } else if (filterTab === 'locked') {
      list = list.filter((b) => !earnedMap[b.slug]);
    }

    // Sort: earned first within each group, then by tier (platinum → gold → silver → bronze)
    const tierOrder: Record<string, number> = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    return [...list].sort((a, b) => {
      const ae = !!earnedMap[a.slug];
      const be = !!earnedMap[b.slug];
      if (ae && !be) return -1;
      if (!ae && be) return 1;
      return (tierOrder[a.tier] ?? 4) - (tierOrder[b.tier] ?? 4);
    });
  }, [allBadges, earnedMap, filterTab, category]);

  function openBadge(badge: Badge) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBadge({ ...badge, earned_at: earnedMap[badge.slug] });
    setSheetVisible(true);
  }

  const renderItem = useCallback(({ item }: { item: Badge }) => (
    <BadgeCell
      badge={item}
      earned={!!earnedMap[item.slug]}
      earnedAt={earnedMap[item.slug]}
      onPress={() => openBadge(item)}
    />
  ), [earnedMap]);

  const keyExtractor = useCallback((item: Badge) => item.slug, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.07)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', letterSpacing: -0.8 }}>
                My Badges
              </Text>
              {!loading && (
                <Text style={{ color: '#0D9488', fontSize: 13, fontWeight: '500', marginTop: 1 }}>
                  {earnedCount} / {totalCount} earned
                </Text>
              )}
            </View>

            {/* Progress pill */}
            {!loading && totalCount > 0 && (
              <View style={{
                backgroundColor: 'rgba(13,148,136,0.1)',
                borderRadius: 14, borderWidth: 1,
                borderColor: 'rgba(13,148,136,0.25)',
                paddingHorizontal: 10, paddingVertical: 5,
              }}>
                <Text style={{ color: '#0D9488', fontSize: 12, fontWeight: '700' }}>
                  {Math.round((earnedCount / Math.max(1, totalCount)) * 100)}%
                </Text>
              </View>
            )}
          </View>

          {/* Progress bar */}
          {!loading && totalCount > 0 && (
            <View style={{ marginTop: 12, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <LinearGradient
                colors={['#0D9488', '#0a7a70']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ height: 3, borderRadius: 2, width: `${(earnedCount / totalCount) * 100}%` as any }}
              />
            </View>
          )}
        </View>

        {/* ── Filter tabs ── */}
        <View style={{
          flexDirection: 'row',
          marginHorizontal: 16, marginBottom: 12,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: 12, padding: 3,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        }}>
          {(['all', 'earned', 'locked'] as FilterTab[]).map((tab) => {
            const active = filterTab === tab;
            const label = tab === 'all' ? 'All' : tab === 'earned' ? 'Earned' : 'Locked';
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterTab(tab); }}
                activeOpacity={0.75}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 }}
              >
                {active && (
                  <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(13,148,136,0.15)',
                    borderRadius: 10, borderWidth: 1,
                    borderColor: 'rgba(13,148,136,0.3)',
                  }} />
                )}
                <Text style={{ color: active ? '#0D9488' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: active ? '700' : '400' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Category chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
          style={{ marginBottom: 12, height: 40, flexShrink: 0 }}
        >
          {CATEGORY_CHIPS.map((chip) => {
            const active = category === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(chip.id); }}
                activeOpacity={0.75}
              >
                {active ? (
                  <LinearGradient
                    colors={['#0D9488', '#0a8f83']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{chip.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                  }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '400' }}>{chip.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Badge grid ── */}
        {loading ? (
          <BadgeSkeleton />
        ) : filteredBadges.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🎖️</Text>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
              {filterTab === 'earned' ? 'No badges earned yet' : 'Nothing here'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              {filterTab === 'earned'
                ? 'Generate your first trip to start earning badges!'
                : 'Try a different filter'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredBadges}
            numColumns={3}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}
            columnWrapperStyle={{ gap: 8 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={12}
            windowSize={5}
            initialNumToRender={18}
          />
        )}
      </SafeAreaView>

      {/* ── Badge detail bottom sheet ── */}
      <BadgeBottomSheet
        badge={selectedBadge}
        visible={sheetVisible}
        earned={!!(selectedBadge && earnedMap[selectedBadge.slug])}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}
