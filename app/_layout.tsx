import '../global.css';

import * as Sentry from '@sentry/react-native';
import { useEffect, Component } from 'react';
import { ToastAndroid, Platform, Alert, View, Text, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { useShareIntent } from '../hooks/useShareIntent';
import { initializePurchases } from '../lib/purchases';
import { AuthProvider, useAuth } from '../lib/context/AuthContext';
import { LanguageProvider } from '../lib/context/LanguageContext';
import AppTabBar from '../components/AppTabBar';

Sentry.init({
  dsn: 'https://8934484315746b2c1af4a321d40d971b@o4511066059177984.ingest.de.sentry.io/4511066064814160',
  enableNative: true,
  sendDefaultPii: false,
  tracesSampleRate: 0.2,
});

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { Sentry.captureException(error); }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <View style={{ flex: 1, backgroundColor: '#000', padding: 24, paddingTop: 60 }}>
          <Text style={{ color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            Crash — send this to the developer:
          </Text>
          <ScrollView>
            <Text selectable style={{ color: '#fff', fontSize: 11 }}>
              {err.message}{'\n\n'}{err.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Navigation guard ─────────────────────────────────────────────────────────
// Redirects authenticated users away from auth screens.
// Does NOT force unauthenticated users to log in — the app supports guest use.

function NavigationGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    // If already signed in, bounce away from auth screens to home
    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)' as any);
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

function ShareIntentHandler() {
  const router = useRouter();
  const { url, platform, error } = useShareIntent();

  useEffect(() => {
    if (error) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(error, ToastAndroid.LONG);
      } else {
        Alert.alert('Unsupported Link', error);
      }
    }
  }, [error]);

  useEffect(() => {
    if (url && platform) {
      router.push({
        pathname: '/processing',
        params: { url, platform },
      });
    }
  }, [url, platform]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    initializePurchases()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ErrorBoundary>
      <LanguageProvider>
      <AuthProvider>
        <NavigationGuard />
        <ShareIntentProvider>
          <ShareIntentHandler />
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, animation: 'ios' }}>
              {/* Trip detail: fade from bottom gives a "card expanding" feel */}
              <Stack.Screen name="trip/[slug]"       options={{ animation: 'fade_from_bottom', gestureEnabled: true }} />
              {/* Modal screens */}
              <Stack.Screen name="processing"        options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="upgrade"           options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="notifications"     options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="onboarding"        options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="auth"              options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="past-trip"         options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            </Stack>
            <AppTabBar />
          </View>
        </ShareIntentProvider>
      </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
