import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

export default function AuthConfirmScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    handleConfirm();
  }, []);

  async function handleConfirm() {
    try {
      // The deep link may contain tokens as hash fragments or query params
      // Supabase verification links contain access_token + refresh_token
      const accessToken = params.access_token as string | undefined;
      const refreshToken = params.refresh_token as string | undefined;
      const tokenHash = params.token_hash as string | undefined;
      const type = params.type as string | undefined;

      if (accessToken && refreshToken) {
        // Token-based verification (Supabase sends these in the redirect)
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        setStatus('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (tokenHash && type) {
        // OTP/hash-based verification
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        });
        if (error) throw error;
        setStatus('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      // If we got here with no tokens, the user might already be verified
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      setStatus('error');
      setErrorMsg('Verification link may have expired. Please try signing in — if your email is verified, it will work.');
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e?.message ?? 'Verification failed. Please try again.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      {status === 'loading' && (
        <>
          <ActivityIndicator color={TEAL} size="large" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 16 }}>
            Verifying your email...
          </Text>
        </>
      )}

      {status === 'success' && (
        <>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(13,148,136,0.15)',
              borderWidth: 2,
              borderColor: 'rgba(13,148,136,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={36} color={TEAL} />
          </View>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: '700', marginTop: 20 }}>
            Email Verified!
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            Your account is ready. Welcome to ScrollAway!
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/' as any)}
            style={{
              marginTop: 24,
              backgroundColor: TEAL,
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Continue</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'error' && (
        <>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(239,68,68,0.12)',
              borderWidth: 2,
              borderColor: 'rgba(239,68,68,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={36} color="#ef4444" />
          </View>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginTop: 20 }}>
            Verification Issue
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/auth/login' as any)}
            style={{
              marginTop: 24,
              backgroundColor: TEAL,
              paddingHorizontal: 32,
              paddingVertical: 14,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Go to Sign In</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
