/**
 * Single persistent tab bar rendered at the root layout level.
 * Never mounts/unmounts — eliminates the flash that occurred when
 * navigating between the (tabs) navigator and profile/[username].
 *
 * Uses RN's built-in Animated API (not react-native-reanimated) to avoid
 * a native crash in reanimated 4.1.6's CSS transform matrix composition.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/context/AuthContext';
import { useLanguage } from '../lib/context/LanguageContext';

const TEAL = '#0D9488';
const LAST_VISITED_KEY = '@last_visited_discover';

const TAB_KEYS = [
  { name: 'index',    labelKey: 'home',     icon: 'home-outline',          filledIcon: 'home',          path: '/'         },
  { name: 'explore',  labelKey: 'explore',  icon: 'map-outline',           filledIcon: 'map',           path: '/explore'  },
  { name: 'discover', labelKey: 'discover', icon: 'compass-outline',       filledIcon: 'compass',       path: '/discover' },
  { name: 'settings', labelKey: 'settings', icon: 'settings-outline',      filledIcon: 'settings',      path: '/settings' },
  { name: 'profile',  labelKey: 'profile',  icon: 'person-circle-outline', filledIcon: 'person-circle', path: '/profile'  },
] as const;

// Spring configs (RN Animated uses the same mass/damping/stiffness params)
const SPRING_PRESS   = { mass: 0.35, damping: 10, stiffness: 320, useNativeDriver: true } as const;
const SPRING_RELEASE = { mass: 0.7,  damping: 13, stiffness: 200, useNativeDriver: true } as const;
const SPRING_ACTIVE  = { mass: 0.5,  damping: 14, stiffness: 200, useNativeDriver: true } as const;

function resolveActiveTab(pathname: string): string {
  if (pathname.startsWith('/profile'))  return 'profile';
  if (pathname.startsWith('/explore'))  return 'explore';
  if (pathname.startsWith('/discover')) return 'discover';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'index';
}

/** Screens where the tab bar should not appear. */
function shouldHide(pathname: string): boolean {
  return (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/onboarding') ||
    pathname === '/processing' ||
    pathname === '/upgrade' ||
    pathname.startsWith('/trip/') ||
    pathname.startsWith('/past-trip/')
  );
}

export const TAB_BAR_HEIGHT = 62;

// ─── Tab item ─────────────────────────────────────────────────────────────────

interface TabItemProps {
  tab: (typeof TAB_KEYS)[number];
  isFocused: boolean;
  hasNewTrips: boolean;
  label: string;
  onNavigate: () => void;
}

function TabItem({ tab, isFocused, hasNewTrips, label, onNavigate }: TabItemProps) {
  const scale          = useRef(new Animated.Value(1)).current;
  const translateY     = useRef(new Animated.Value(0)).current;
  const activeProgress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const dotScale       = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(activeProgress, { toValue: isFocused ? 1 : 0, ...SPRING_ACTIVE }).start();
    Animated.spring(dotScale,       { toValue: isFocused ? 1 : 0, ...SPRING_ACTIVE }).start();
  }, [isFocused]);

  function handlePressIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale,      { toValue: 0.78, ...SPRING_PRESS }).start();
    Animated.spring(translateY, { toValue: -4,   ...SPRING_PRESS }).start();
  }

  function handlePressOut() {
    Animated.spring(scale,      { toValue: 1, ...SPRING_RELEASE }).start();
    Animated.spring(translateY, { toValue: 0, ...SPRING_RELEASE }).start();
  }

  // Interpolated values for icon cross-dissolve
  const outlineOpacity = activeProgress.interpolate({
    inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const outlineScale = activeProgress.interpolate({
    inputRange: [0, 1], outputRange: [1, 0.45], extrapolate: 'clamp',
  });
  const filledScale = activeProgress.interpolate({
    inputRange: [0, 1], outputRange: [0.45, 1], extrapolate: 'clamp',
  });
  const glowOpacity = activeProgress.interpolate({
    inputRange: [0, 1], outputRange: [0, 0.85], extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onNavigate}
      activeOpacity={1}
      style={{ flex: 1, alignItems: 'center' }}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }, { translateY }] }}>

        {/* Glow halo behind icon */}
        <Animated.View
          style={{
            position: 'absolute',
            top: -6,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(13,148,136,0.14)',
            shadowColor: TEAL,
            shadowOpacity: 0.55,
            shadowRadius: 10,
            elevation: 8,
            opacity: glowOpacity,
          }}
        />

        {/* Icon morph: outline ↔ filled cross-dissolve */}
        <View style={{ width: 24, height: 24 }}>
          <Animated.View
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center',
              opacity: outlineOpacity,
              transform: [{ scale: outlineScale }],
            }}
          >
            <Ionicons name={tab.icon as any} size={24} color="rgba(255,255,255,0.38)" />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center',
              opacity: activeProgress,
              transform: [{ scale: filledScale }],
            }}
          >
            <Ionicons name={tab.filledIcon as any} size={24} color={TEAL} />
          </Animated.View>

          {/* Discover badge */}
          {tab.name === 'discover' && hasNewTrips && (
            <View style={{
              position: 'absolute',
              top: -1, right: -3,
              width: 7, height: 7,
              borderRadius: 3.5,
              backgroundColor: '#ef4444',
              borderWidth: 1.5,
              borderColor: 'rgba(8,8,20,0.97)',
            }} />
          )}
        </View>

        {/* Label */}
        <Text
          style={{
            color: isFocused ? TEAL : 'rgba(255,255,255,0.38)',
            fontSize: 10,
            fontWeight: isFocused ? '600' : '400',
            marginTop: 3,
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>

        {/* Active dot — springs in */}
        <Animated.View
          style={{
            width: 4, height: 4,
            borderRadius: 2,
            backgroundColor: TEAL,
            marginTop: 3,
            shadowColor: TEAL,
            shadowOpacity: 0.9,
            shadowRadius: 5,
            elevation: 4,
            transform: [{ scale: dotScale }],
            opacity: dotScale,
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

export default function AppTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { username } = useAuth();
  const { t } = useLanguage();
  const activeTab = resolveActiveTab(pathname);
  const [hasNewTrips, setHasNewTrips] = useState(false);

  useEffect(() => {
    checkForNewTrips();
  }, []);

  async function checkForNewTrips() {
    try {
      const lastVisited = await AsyncStorage.getItem(LAST_VISITED_KEY);
      if (!lastVisited) { setHasNewTrips(true); return; }
      const { data } = await supabase
        .from('trips')
        .select('id')
        .eq('is_public', true)
        .gt('created_at', lastVisited)
        .limit(1);
      setHasNewTrips((data?.length ?? 0) > 0);
    } catch { /* ignore */ }
  }

  if (shouldHide(pathname)) return null;

  function handleNavigate(tab: (typeof TAB_KEYS)[number]) {
    if (tab.name === activeTab) return;

    if (tab.name === 'profile') {
      router.replace(username ? `/profile/${username}` : '/settings' as any);
      if (activeTab === 'discover') {
        AsyncStorage.setItem(LAST_VISITED_KEY, new Date().toISOString());
      }
      return;
    }

    if (tab.name === 'discover') {
      setHasNewTrips(false);
      AsyncStorage.setItem(LAST_VISITED_KEY, new Date().toISOString());
    }

    router.replace(tab.path as any);
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(8,8,20,0.97)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(13,148,136,0.22)',
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 10,
        shadowColor: '#0D9488',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -6 },
        elevation: 20,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {TAB_KEYS.map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            isFocused={activeTab === tab.name}
            hasNewTrips={hasNewTrips}
            label={t.tabs[tab.labelKey]}
            onNavigate={() => handleNavigate(tab as any)}
          />
        ))}
      </View>
    </View>
  );
}
