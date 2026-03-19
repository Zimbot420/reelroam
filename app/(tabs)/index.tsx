import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import SpinningGlobe from '../../components/SpinningGlobe';
import { FREE_TRIP_LIMIT, useProStatus } from '../../hooks/useProStatus';
import { useAuth } from '../../lib/context/AuthContext';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { getUnreadMessageCount } from '../../lib/supabase';
import { useLanguage } from '../../lib/context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Platform detection ───────────────────────────────────────────────────────

const PLATFORM_HOSTS: Record<string, string> = {
  'tiktok.com': 'tiktok',
  'www.tiktok.com': 'tiktok',
  'vm.tiktok.com': 'tiktok',
  'vt.tiktok.com': 'tiktok',
  'instagram.com': 'instagram',
  'www.instagram.com': 'instagram',
  'youtube.com': 'youtube',
  'www.youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'm.youtube.com': 'youtube',
};

function detectPlatform(url: string): string | null {
  try {
    return PLATFORM_HOSTS[new URL(url).hostname] ?? null;
  } catch {
    return null;
  }
}

const PLATFORM_META: Record<string, { icon: string; color: string; label: string }> = {
  tiktok:    { icon: 'tiktok',     color: '#010101', label: 'TikTok' },
  instagram: { icon: 'instagram',  color: '#E1306C', label: 'Instagram' },
  youtube:   { icon: 'youtube',    color: '#FF0000', label: 'YouTube' },
};

// ─── Star field ───────────────────────────────────────────────────────────────

function StarField() {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      key: i,
      left: Math.random() * SCREEN_WIDTH,
      top: Math.random() * 900,
      opacity: 0.2 + Math.random() * 0.5,
      size: 1 + Math.random() * 2,
    }));
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {stars.map((s) => (
        <View
          key={s.key}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: 'white',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPro, tripsRemaining, isLoaded } = useProStatus();
  const { user, isAuthenticated, username: authUsername } = useAuth();
  const { t, interpolate } = useLanguage();
  const [inputUrl, setInputUrl] = useState('');
  const detectedPlatform = detectPlatform(inputUrl);
  const btnOpacity = useRef(new Animated.Value(1)).current;
  const { count: unreadCount } = useUnreadNotifications();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (authUsername) getUnreadMessageCount(authUsername).then(setUnreadMessages).catch(() => {});
  }, [authUsername]);

  // No transform styles allowed — reanimated 4.1.6 Fabric bug causes SIGABRT
  function pressIn() {
    Animated.timing(btnOpacity, { toValue: 0.6, duration: 80, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.timing(btnOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }

  function handleGenerate() {
    const platform = detectPlatform(inputUrl);
    if (!inputUrl.trim() || !platform) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/processing', params: { url: inputUrl.trim(), platform } });
  }

  const bannerHeight = 52;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      {/* Star field */}
      <StarField />

      {/* ── Search + Notification icons (top-right) ── */}
      <View style={{ position: 'absolute', top: insets.top + 10, right: 16, zIndex: 10, flexDirection: 'row', gap: 4 }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/search' as any);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="search-outline" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      {isAuthenticated && authUsername && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/messages' as any);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chatbubble-outline" size={20} color="rgba(255,255,255,0.7)" />
          {unreadMessages > 0 && (
            <View style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#0D9488' }} />
          )}
        </TouchableOpacity>
      )}
      {isAuthenticated && (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/notifications' as any);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="notifications-outline" size={22} color="rgba(255,255,255,0.7)" />
          {unreadCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#ef4444',
              }}
            />
          )}
        </TouchableOpacity>
      )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: isPro ? insets.bottom + 20 : bannerHeight + 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={{ paddingTop: 64, alignItems: 'center', paddingBottom: 4 }}>
          <Text style={{ fontSize: 48, fontWeight: '800', color: 'white', letterSpacing: -1.5, lineHeight: 54 }}>
            ScrollAway
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', letterSpacing: 3.5, marginTop: 8, fontWeight: '300', textTransform: 'uppercase' }}>
            {t.home.tagline}
          </Text>
        </View>

        {/* ── Globe ── */}
        <View style={{ position: 'relative', alignItems: 'center' }}>
          {/* Outer bloom — wide halo behind the Lottie */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -10,
              width: 390,
              height: 390,
              borderRadius: 195,
              backgroundColor: '#0D9488',
              opacity: 0.045,
              shadowColor: '#0D9488',
              shadowOpacity: 0.55,
              shadowRadius: 90,
              elevation: 20,
            }}
          />
          {/* Inner bloom — sits just inside the globe edge */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 20,
              width: 290,
              height: 290,
              borderRadius: 145,
              backgroundColor: '#0D9488',
              opacity: 0.10,
              shadowColor: '#0D9488',
              shadowOpacity: 0.85,
              shadowRadius: 55,
              elevation: 30,
            }}
          />
          <SpinningGlobe />
        </View>

        {/* ── Platform icons ── */}
        <View style={{ alignItems: 'center', marginTop: -4 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['tiktok', 'instagram', 'youtube'] as const).map((p) => (
              <View
                key={p}
                style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
              >
                {/* Top highlight line — simulates light source */}
                <View style={{
                  position: 'absolute', top: 0, left: 4, right: 4, height: 1,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 1,
                }} />
                <FontAwesome5 name={PLATFORM_META[p].icon} size={20} color="rgba(255,255,255,0.7)" brand />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <Ionicons name="chevron-down" size={16} color="rgba(13,148,136,0.7)" />
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          </View>
        </View>

        {/* ── URL input ── */}
        <View style={{ marginHorizontal: 20, marginTop: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              height: 58,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.07)',
              borderWidth: 1,
              borderColor: detectedPlatform ? 'rgba(13,148,136,0.5)' : 'rgba(255,255,255,0.11)',
              alignItems: 'center',
              paddingLeft: 16,
              paddingRight: 6,
              shadowColor: detectedPlatform ? '#0D9488' : '#000',
              shadowOpacity: detectedPlatform ? 0.2 : 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
              overflow: 'hidden',
            }}
          >
            {/* Top highlight line inside input */}
            <View style={{
              position: 'absolute', top: 0, left: 12, right: 12, height: 1,
              backgroundColor: 'rgba(255,255,255,0.07)',
            }} />

            {detectedPlatform ? (
              <View
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  backgroundColor: PLATFORM_META[detectedPlatform].color,
                  alignItems: 'center', justifyContent: 'center', marginRight: 10,
                }}
              >
                <FontAwesome5 name={PLATFORM_META[detectedPlatform].icon} size={13} color="white" brand />
              </View>
            ) : (
              <Ionicons name="link-outline" size={17} color="rgba(255,255,255,0.22)" style={{ marginRight: 10 }} />
            )}
            <TextInput
              style={{ flex: 1, color: 'white', fontSize: 14, letterSpacing: 0.1 }}
              placeholder={t.home.placeholder}
              placeholderTextColor="rgba(255,255,255,0.22)"
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleGenerate}
            />
            {inputUrl.length > 0 && !detectedPlatform && (
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setInputUrl(''); }}
                style={{ padding: 8 }}
              >
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            )}
            {/* Inline Generate Trip button */}
            <Animated.View style={{ opacity: btnOpacity }}>
              <TouchableOpacity
                onPress={handleGenerate}
                onPressIn={pressIn}
                onPressOut={pressOut}
                disabled={!detectedPlatform}
                activeOpacity={0.85}
              >
                {detectedPlatform ? (
                  <LinearGradient
                    colors={['#0D9488', '#0a7a70']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#0D9488',
                      shadowOpacity: 0.45,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 5,
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                      {t.home.generate}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      height: 44,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: 'rgba(255,255,255,0.25)', fontWeight: '600', fontSize: 14 }}>
                      {t.home.generate}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Helper text */}
          <Text style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.22)', marginTop: 12, letterSpacing: 0.3 }}>
            {t.home.helperText}
          </Text>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Pro banner (fixed bottom) ── */}
      {!isPro && (
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/upgrade' as any); }}
          activeOpacity={0.85}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <LinearGradient
            colors={['#0D9488', '#0a7a70']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles" size={16} color="white" />
              <Text style={{ color: 'white', fontSize: 14 }}>
                {isLoaded ? (
                  tripsRemaining === 0
                    ? <Text style={{ fontWeight: '600' }}>{t.home.noTripsRemaining}</Text>
                    : <Text>
                        <Text style={{ fontWeight: '600' }}>
                          {interpolate(t.home.tripsRemainingBanner, { count: tripsRemaining })}
                        </Text>
                        {' · '}{t.home.upgradeToPro}
                      </Text>
                ) : (
                  <Text>
                    <Text style={{ fontWeight: '600' }}>
                      {interpolate(t.home.upgradeDefault, { count: FREE_TRIP_LIMIT })}
                    </Text>
                    {' · '}{t.home.upgradeToPro}
                  </Text>
                )}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}
