import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signInWithApple, signInWithGoogle } from '../../lib/supabase';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current - 1 ? 20 : 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: i === current - 1 ? TEAL : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </View>
  );
}

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');

  async function handleApple() {
    try {
      setError('');
      setLoadingApple(true);
      await signInWithApple();
      router.push('/onboarding/profile');
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError(e?.message ?? 'Apple sign in failed. Please try again.');
      }
    } finally {
      setLoadingApple(false);
    }
  }

  async function handleGoogle() {
    try {
      setError('');
      setLoadingGoogle(true);
      const result = await signInWithGoogle();
      if (result) {
        router.push('/onboarding/profile');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Google sign in failed. Please try again.');
    } finally {
      setLoadingGoogle(false);
    }
  }

  function handleEmail() {
    router.push('/onboarding/email');
  }

  const anyLoading = loadingApple || loadingGoogle;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <ProgressDots current={2} total={5} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Title */}
        <View style={{ marginBottom: 36 }}>
          <Text
            style={{
              color: 'white',
              fontSize: 32,
              fontWeight: '800',
              marginBottom: 6,
              letterSpacing: -0.5,
            }}
          >
            Join ScrollAway
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(13,148,136,0.12)',
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Ionicons name="checkmark-circle" size={13} color={TEAL} />
              <Text style={{ color: TEAL, fontSize: 12, fontWeight: '600' }}>Free forever</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(13,148,136,0.12)',
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Ionicons name="checkmark-circle" size={13} color={TEAL} />
              <Text style={{ color: TEAL, fontSize: 12, fontWeight: '600' }}>No spam</Text>
            </View>
          </View>
        </View>

        {/* Auth buttons */}
        <View style={{ gap: 14 }}>
          {/* Apple — iOS only */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={handleApple}
              disabled={anyLoading}
              activeOpacity={0.85}
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                opacity: anyLoading ? 0.6 : 1,
              }}
            >
              {loadingApple ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#000" />
                  <Text style={{ color: '#000', fontSize: 16, fontWeight: '700' }}>
                    Continue with Apple
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Google */}
          <TouchableOpacity
            onPress={handleGoogle}
            disabled={anyLoading}
            activeOpacity={0.85}
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: anyLoading ? 0.6 : 1,
            }}
          >
            {loadingGoogle ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="logo-google" size={18} color="#DB4437" />
                </View>
                <Text style={{ color: '#1a1a1a', fontSize: 16, fontWeight: '700' }}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </View>

          {/* Email */}
          <TouchableOpacity
            onPress={handleEmail}
            disabled={anyLoading}
            activeOpacity={0.85}
            style={{
              backgroundColor: 'transparent',
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderWidth: 1.5,
              borderColor: TEAL,
              opacity: anyLoading ? 0.6 : 1,
            }}
          >
            <Ionicons name="mail-outline" size={20} color={TEAL} />
            <Text style={{ color: TEAL, fontSize: 16, fontWeight: '700' }}>
              Continue with Email
            </Text>
          </TouchableOpacity>

          {/* Error message */}
          {error ? (
            <View
              style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                borderRadius: 10,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.3)',
              }}
            >
              <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</Text>
            </View>
          ) : null}
        </View>

        {/* Sign in link */}
        <TouchableOpacity
          onPress={() => router.push('/auth/login' as any)}
          activeOpacity={0.7}
          style={{ alignItems: 'center', paddingVertical: 10 }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Already have an account?{' '}
            <Text style={{ color: TEAL, fontWeight: '600' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>

        {/* Legal text */}
        <View style={{ marginTop: 'auto', paddingTop: 16, alignItems: 'center' }}>
          <Text
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 12,
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            By continuing you agree to our{' '}
            <Text
              onPress={() => Alert.alert('Terms of Service', 'Coming soon.')}
              style={{ color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' }}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              onPress={() => Alert.alert('Privacy Policy', 'Coming soon.')}
              style={{ color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' }}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
