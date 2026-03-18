import { useState } from 'react';
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
import { signUpWithEmail } from '../../lib/supabase';

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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const strength = getPasswordStrength(password);
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i < strength ? colors[strength - 1] : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </View>
      {strength > 0 && (
        <Text style={{ color: colors[strength - 1], fontSize: 11, fontWeight: '500' }}>
          {labels[strength - 1]}
        </Text>
      )}
    </View>
  );
}

export default function EmailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailValid = isValidEmail(email);
  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = emailValid && passwordStrength >= 2 && passwordsMatch && !loading;
  const signingIn = false; // kept for type compat, sign-in now handled by /auth/login

  async function handleCreateAccount() {
    if (!canSubmit) return;
    try {
      setError('');
      setLoading(true);
      await signUpWithEmail(email.trim().toLowerCase(), password);
      router.push({ pathname: '/onboarding/verify', params: { email: email.trim().toLowerCase() } });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create account. Please try again.');
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
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
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
              <ProgressDots current={3} total={5} />
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Title */}
          <View style={{ marginBottom: 28 }}>
            <Text
              style={{
                color: 'white',
                fontSize: 30,
                fontWeight: '800',
                marginBottom: 6,
                letterSpacing: -0.5,
              }}
            >
              Create your account
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>
              Join the community of explorers
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 16 }}>
            {/* Email */}
            <View>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
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
                  onChangeText={(t) => setEmail(t.toLowerCase())}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    color: 'white',
                    fontSize: 16,
                  }}
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
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Password
              </Text>
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
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    color: 'white',
                    fontSize: 16,
                  }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="rgba(255,255,255,0.4)"
                  />
                </TouchableOpacity>
              </View>
              <PasswordStrengthBar password={password} />
            </View>

            {/* Confirm password */}
            <View>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Confirm Password
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: confirmPassword.length > 0
                    ? (passwordsMatch ? 'rgba(13,148,136,0.6)' : 'rgba(239,68,68,0.4)')
                    : 'rgba(255,255,255,0.1)',
                  paddingHorizontal: 16,
                  height: 52,
                }}
              >
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat password"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    color: 'white',
                    fontSize: 16,
                  }}
                />
                {confirmPassword.length > 0 ? (
                  <Ionicons
                    name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={passwordsMatch ? '#22c55e' : '#ef4444'}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} activeOpacity={0.7}>
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="rgba(255,255,255,0.4)"
                    />
                  </TouchableOpacity>
                )}
              </View>
              {passwordsMismatch && (
                <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                  Passwords don't match
                </Text>
              )}
            </View>

            {/* Error */}
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
                <Text style={{ color: '#ef4444', fontSize: 14 }}>{error}</Text>
              </View>
            ) : null}

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleCreateAccount}
              disabled={!canSubmit}
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
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Sign in link */}
            <TouchableOpacity
              onPress={() => router.push('/auth/login' as any)}
              disabled={loading}
              activeOpacity={0.7}
              style={{ alignItems: 'center', paddingVertical: 8 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
                Already have an account?{' '}
                <Text style={{ color: TEAL, fontWeight: '600' }}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
