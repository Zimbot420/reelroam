import { Stack, Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs
        tabBar={() => null}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index"      options={{ title: 'Home'     }} />
        <Tabs.Screen name="explore"    options={{ title: 'Explore'  }} />
        <Tabs.Screen name="discover"   options={{ title: 'Discover' }} />
        <Tabs.Screen name="settings"   options={{ title: 'Settings' }} />
        <Tabs.Screen name="profile"    options={{ title: 'Profile'  }} />
        {/* bucketlist is still accessible via links but not shown in the tab bar */}
        <Tabs.Screen name="bucketlist" options={{ title: 'Saved', href: null }} />
      </Tabs>
    </>
  );
}
