import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const emailValid = isValidEmail(email);

  async function handleSend() {
    if (!emailValid || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'scrollaway://reset-password' },
      );
      if (err) throw err;
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
          }}
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
              marginBottom: 40,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>

          {sent ? (
            /* ── Success state ── */
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: 'rgba(13,148,136,0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(13,148,136,0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}
              >
                <Ionicons name="mail-open-outline" size={32} color={TEAL} />
              </View>
              <Text
                style={{
                  color: 'white',
                  fontSize: 26,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 12,
                  letterSpacing: -0.3,
                }}
              >
                Check your email
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 15,
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: 40,
                }}
              >
                We sent a password reset link to{'\n'}
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                  {email.trim().toLowerCase()}
                </Text>
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.85}
                style={{
                  backgroundColor: TEAL,
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 40,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setSent(false); setEmail(''); }}
                activeOpacity={0.7}
                style={{ marginTop: 16, paddingVertical: 8 }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  Try a different email
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form state ── */
            <>
              <Text
                style={{
                  color: 'white',
                  fontSize: 28,
                  fontWeight: '800',
                  marginBottom: 8,
                  letterSpacing: -0.5,
                }}
              >
                Reset password
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 36,
                }}
              >
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              {/* Email input */}
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
                  marginBottom: 24,
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
                  returnKeyType="done"
                  onSubmitEditing={handleSend}
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

              {/* Error */}
              {error ? (
                <View
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.3)',
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{error}</Text>
                </View>
              ) : null}

              {/* Send button */}
              <TouchableOpacity
                onPress={handleSend}
                disabled={!emailValid || loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: emailValid ? TEAL : 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    style={{
                      color: emailValid ? 'white' : 'rgba(255,255,255,0.3)',
                      fontSize: 17,
                      fontWeight: '700',
                    }}
                  >
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
