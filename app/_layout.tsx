import '../global.css';

import { useEffect, Component } from 'react';
import { ToastAndroid, Platform, Alert, View, Text, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { useShareIntent } from '../hooks/useShareIntent';
import { initializePurchases } from '../lib/purchases';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
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
    <ErrorBoundary>
      <ShareIntentProvider>
        <ShareIntentHandler />
        <Stack />
      </ShareIntentProvider>
    </ErrorBoundary>
  );
}
