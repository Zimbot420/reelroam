import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { signInWithEmail, signInWithApple, signInWithGoogle } from '../../lib/supabase';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
      }}
    >
      <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');

  const emailValid = isValidEmail(email);
  const canSubmit = emailValid && password.length >= 1 && !loading;
  const anyLoading = loading || loadingApple || loadingGoogle;

  async function handleSignIn() {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email.trim().toLowerCase(), password);
      // AuthContext will update, NavigationGuard handles redirect
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('password')) {
        setError('Incorrect email or password.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email before signing in.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setError('');
    setLoadingApple(true);
    try {
      await signInWithApple();
      // AuthContext + NavigationGuard handle redirect
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError(e?.message ?? 'Apple sign in failed. Please try again.');
      }
    } finally {
      setLoadingApple(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoadingGoogle(true);
    try {
      const result = await signInWithGoogle();
      if (!result) setError('Google sign in cancelled.');
    } catch (e: any) {
      setError(e?.message ?? 'Google sign in failed. Please try again.');
    } finally {
      setLoadingGoogle(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
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
              marginBottom: 32,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>

          {/* App name */}
          <View style={{ marginBottom: 36 }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '800',
                color: TEAL,
                letterSpacing: -0.5,
                marginBottom: 8,
              }}
            >
              ScrollAway
            </Text>
            <Text
              style={{
                color: 'white',
                fontSize: 26,
                fontWeight: '700',
                letterSpacing: -0.3,
                marginBottom: 6,
              }}
            >
              Welcome back
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>
              Sign in to your account
            </Text>
          </View>

          {/* Social buttons */}
          <View style={{ gap: 12, marginBottom: 24 }}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={handleApple}
                disabled={anyLoading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 14,
                  paddingVertical: 15,
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
                    <Ionicons name="logo-apple" size={20} color="#000" />
                    <Text style={{ color: '#000', fontSize: 15, fontWeight: '700' }}>
                      Continue with Apple
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleGoogle}
              disabled={anyLoading}
              activeOpacity={0.85}
              style={{
                backgroundColor: 'white',
                borderRadius: 14,
                paddingVertical: 15,
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
                  <Ionicons name="logo-google" size={18} color="#DB4437" />
                  <Text style={{ color: '#1a1a1a', fontSize: 15, fontWeight: '700' }}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>or sign in with email</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </View>

          {/* Form */}
          <View style={{ gap: 16 }}>
            {/* Email */}
            <View>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Email
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: email.length > 0
                    ? (emailValid ? 'rgba(13,148,136,0.6)' : 'rgba(239,68,68,0.4)')
                    : 'rgba(255,255,255,0.1)',
                  paddingHorizontal: 16,
                  height: 52,
                }}
              >
                <TextInput
                  value={email}
                  onChangeText={(t) => { setEmail(t.toLowerCase()); setError(''); }}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  style={{ flex: 1, color: 'white', fontSize: 16 }}
                />
                {email.length > 0 && (
                  <Ionicons
                    name={emailValid ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={emailValid ? '#22c55e' : '#ef4444'}
                  />
                )}
              </View>
            </View>

            {/* Password */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Password
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/auth/forgot-password' as any)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: TEAL, fontSize: 13, fontWeight: '600' }}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.1)',
                  paddingHorizontal: 16,
                  height: 52,
                }}
              >
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  placeholder="Your password"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleSignIn}
                  style={{ flex: 1, color: 'white', fontSize: 16 }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="rgba(255,255,255,0.4)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error ? <ErrorBanner message={error} /> : null}

            {/* Sign in button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={!canSubmit || anyLoading}
              activeOpacity={0.85}
              style={{
                backgroundColor: canSubmit ? TEAL : 'rgba(255,255,255,0.1)',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  style={{
                    color: canSubmit ? 'white' : 'rgba(255,255,255,0.3)',
                    fontSize: 17,
                    fontWeight: '700',
                  }}
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            {/* Sign up link */}
            <TouchableOpacity
              onPress={() => router.push('/onboarding' as any)}
              activeOpacity={0.7}
              style={{ alignItems: 'center', paddingVertical: 6 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
                Don't have an account?{' '}
                <Text style={{ color: TEAL, fontWeight: '600' }}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
