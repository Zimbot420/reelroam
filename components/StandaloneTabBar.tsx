/**
 * A self-contained tab bar for screens that live outside the (tabs) navigator
 * (e.g. app/profile/[username].tsx). Looks and behaves identically to the
 * CustomTabBar in app/(tabs)/_layout.tsx.
 */
import { useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../lib/context/AuthContext';

const TEAL = '#0D9488';

const TABS = [
  { name: 'index',    label: 'Home',     icon: 'home-outline',          path: '/'          },
  { name: 'explore',  label: 'Explore',  icon: 'map-outline',           path: '/explore'   },
  { name: 'discover', label: 'Discover', icon: 'compass-outline',       path: '/discover'  },
  { name: 'settings', label: 'Settings', icon: 'settings-outline',      path: '/settings'  },
  { name: 'profile',  label: 'Profile',  icon: 'person-circle-outline', path: '/(tabs)/profile' },
] as const;

function resolveActiveTab(pathname: string): string {
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/explore'))  return 'explore';
  if (pathname.startsWith('/discover')) return 'discover';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'index';
}

export default function StandaloneTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { username } = useAuth();
  const activeTab = resolveActiveTab(pathname);
  const scaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;

  function handlePress(index: number, tab: (typeof TABS)[number]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.spring(scaleAnims[index], { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.spring(scaleAnims[index], { toValue: 1,    useNativeDriver: true, speed: 22, bounciness: 10 }),
    ]).start();

    // Don't re-navigate if already on this tab's screen
    if (tab.name === activeTab) return;

    // Profile tab: navigate directly to avoid the redirect flash
    if (tab.name === 'profile') {
      router.replace(username ? `/profile/${username}` : '/settings' as any);
      return;
    }

    router.replace(tab.path as any);
  }

  return (
    <View
      style={{
        backgroundColor: 'rgba(8, 8, 20, 0.97)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(13, 148, 136, 0.22)',
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
        {TABS.map((tab, index) => {
          const isFocused = activeTab === tab.name;
          const color = isFocused ? TEAL : 'rgba(255,255,255,0.38)';

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handlePress(index, tab)}
              activeOpacity={1}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnims[index] }] }}>
                {/* Glow halo */}
                {isFocused && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -6,
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: 'rgba(13, 148, 136, 0.14)',
                      shadowColor: TEAL,
                      shadowOpacity: 0.55,
                      shadowRadius: 10,
                      elevation: 8,
                    }}
                  />
                )}

                <Ionicons name={tab.icon as any} size={24} color={color} />

                <Text
                  style={{
                    color,
                    fontSize: 10,
                    fontWeight: isFocused ? '600' : '400',
                    marginTop: 3,
                    letterSpacing: 0.2,
                  }}
                >
                  {tab.label}
                </Text>

                {/* Active dot */}
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isFocused ? TEAL : 'transparent',
                    marginTop: 3,
                    shadowColor: TEAL,
                    shadowOpacity: isFocused ? 0.9 : 0,
                    shadowRadius: 5,
                    elevation: isFocused ? 4 : 0,
                  }}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/** Approximate visual height of the tab bar (without safe area inset). */
export const TAB_BAR_HEIGHT = 62;
