import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="email" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="migrate" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
