import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const TEAL = '#0D9488';
const LAST_VISITED_KEY = '@last_visited_discover';

export default function TabLayout() {
  const [hasNewTrips, setHasNewTrips] = useState(false);

  useEffect(() => {
    checkForNewTrips();
  }, []);

  async function checkForNewTrips() {
    try {
      const lastVisited = await AsyncStorage.getItem(LAST_VISITED_KEY);
      if (!lastVisited) {
        setHasNewTrips(true);
        return;
      }
      const { data } = await supabase
        .from('trips')
        .select('id')
        .eq('is_public', true)
        .gt('created_at', lastVisited)
        .limit(1);
      setHasNewTrips((data?.length ?? 0) > 0);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0d0d1a',
            borderTopColor: 'rgba(255,255,255,0.08)',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: TEAL,
          tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
          tabBarLabelStyle: { fontSize: 11 },
        }}
        screenListeners={({ route }) => ({
          tabPress: () => {
            if (route.name === 'discover') {
              setHasNewTrips(false);
              AsyncStorage.setItem(LAST_VISITED_KEY, new Date().toISOString());
            }
          },
        })}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color, size }) => (
              <View>
                <Ionicons name="compass-outline" size={size} color={color} />
                {hasNewTrips && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#ef4444',
                    }}
                  />
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="bucketlist"
          options={{
            title: 'Bucket List',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmark-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
