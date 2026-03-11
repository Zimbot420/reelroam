import '../global.css';

import { useEffect } from 'react';
import { ToastAndroid, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { useShareIntent } from '../hooks/useShareIntent';

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
  return (
    <ShareIntentProvider>
      <ShareIntentHandler />
      <Stack />
    </ShareIntentProvider>
  );
}
