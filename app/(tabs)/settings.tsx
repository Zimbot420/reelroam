import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProStatus } from '../../hooks/useProStatus';
import { restorePurchases } from '../../lib/purchases';
import Constants from 'expo-constants';
import { useAuth } from '../../lib/context/AuthContext';
import { signOut, supabase } from '../../lib/supabase';
import { useLanguage } from '../../lib/context/LanguageContext';
import { LANGUAGES, LanguageCode } from '../../lib/i18n/translations';
import { getOrCreateDeviceId } from '../../lib/deviceId';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const CARD_BG = 'rgba(255,255,255,0.04)';
const CARD_BORDER = 'rgba(255,255,255,0.07)';
const CARD_STYLE = {
  marginHorizontal: 16,
  borderRadius: 16,
  overflow: 'hidden' as const,
  backgroundColor: CARD_BG,
  borderWidth: 1,
  borderColor: CARD_BORDER,
};

// ─── Reusable row ────────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive,
  isLast,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.65 : 1}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: destructive ? 'rgba(239,68,68,0.12)' : 'rgba(13,148,136,0.13)',
        }}
      >
        <Ionicons name={icon as any} size={17} color={destructive ? '#ef4444' : TEAL} />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: '500',
          color: destructive ? '#ef4444' : 'rgba(255,255,255,0.92)',
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

// ─── Profile header card ────────────────────────────────────────────────────

function ProfileHeader({
  profile,
  tripCount,
  onPress,
  isPro,
}: {
  profile: Record<string, any> | null;
  tripCount: number;
  onPress: () => void;
  isPro: boolean;
}) {
  const displayName = profile?.display_name ?? profile?.username ?? 'Traveler';
  const username = profile?.username ?? null;
  const avatarEmoji = profile?.avatar_emoji ?? '🌍';
  const avatarUrl = profile?.avatar_url ?? null;
  const [avatarError, setAvatarError] = useState(false);
  const countriesCount = (profile?.visited_countries as string[] | undefined)?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(13,148,136,0.15)',
      }}
    >
      <LinearGradient
        colors={['rgba(13,148,136,0.12)', 'rgba(13,148,136,0.04)', 'rgba(10,10,26,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Avatar */}
          {avatarUrl && !avatarError ? (
            <ExpoImage
              source={{ uri: avatarUrl }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 2,
                borderColor: 'rgba(13,148,136,0.4)',
              }}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: 'rgba(13,148,136,0.15)',
                borderWidth: 2,
                borderColor: 'rgba(13,148,136,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 28 }}>{avatarEmoji}</Text>
            </View>
          )}

          {/* Name + username */}
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text
                style={{
                  color: 'white',
                  fontSize: 20,
                  fontWeight: '700',
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {isPro && (
                <View
                  style={{
                    backgroundColor: 'rgba(13,148,136,0.2)',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(13,148,136,0.3)',
                  }}
                >
                  <Text style={{ color: TEAL, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>PRO</Text>
                </View>
              )}
            </View>
            {username && (
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 2 }}>
                @{username}
              </Text>
            )}
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
        </View>

        {/* Stats row */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: 18,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {[
            { value: String(tripCount), label: 'Trips' },
            { value: String(countriesCount), label: 'Countries' },
          ].map((stat, i, arr) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                alignItems: 'center',
                borderRightWidth: i < arr.length - 1 ? 1 : 0,
                borderRightColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <Text style={{ color: TEAL, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }}>
                {stat.value}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2, fontWeight: '500' }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Unauthenticated header ──────────────────────────────────────────────────

function SignInHeader({ onSignIn, onCreateAccount }: { onSignIn: () => void; onCreateAccount: () => void }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(13,148,136,0.15)',
      }}
    >
      <LinearGradient
        colors={['rgba(13,148,136,0.1)', 'rgba(10,10,26,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20, alignItems: 'center' }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: 'rgba(13,148,136,0.12)',
            borderWidth: 2,
            borderColor: 'rgba(13,148,136,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="person-outline" size={30} color={TEAL} />
        </View>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 12, letterSpacing: -0.3 }}>
          Sign in to ReelRoam
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
          Save trips, build your profile, and track your travels
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' }}>
          <TouchableOpacity
            onPress={onSignIn}
            activeOpacity={0.7}
            style={{
              flex: 1,
              backgroundColor: TEAL,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCreateAccount}
            activeOpacity={0.7}
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.08)',
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' }}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Language picker modal ──────────────────────────────────────────────────

function LanguagePickerModal({
  visible,
  onClose,
  currentLanguage,
  onSelect,
  title,
  subtitle,
}: {
  visible: boolean;
  onClose: () => void;
  currentLanguage: LanguageCode;
  onSelect: (code: LanguageCode) => void;
  title: string;
  subtitle: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View
            style={{
              backgroundColor: '#111128',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: 'rgba(13,148,136,0.18)',
              paddingBottom: 36,
            }}
          >
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>

            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', letterSpacing: -0.4 }}>
                {title}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
                {subtitle}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20, marginBottom: 8 }} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
            >
              {LANGUAGES.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelect(lang.code);
                    }}
                    activeOpacity={0.65}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 13,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      marginVertical: 2,
                      backgroundColor: isSelected ? 'rgba(13,148,136,0.12)' : 'transparent',
                      borderWidth: 1,
                      borderColor: isSelected ? 'rgba(13,148,136,0.3)' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 26, marginRight: 14, lineHeight: 32 }}>
                      {lang.flag}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: isSelected ? TEAL : 'rgba(255,255,255,0.9)',
                        fontSize: 15,
                        fontWeight: isSelected ? '600' : '400',
                        letterSpacing: 0.1,
                      }}>
                        {lang.label}
                      </Text>
                      <Text style={{
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: 12,
                        marginTop: 1,
                      }}>
                        {lang.englishLabel}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={TEAL} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { isPro, tripsRemaining } = useProStatus();
  const { isAuthenticated, user } = useAuth();
  const { t, language, langMeta, setLanguage, interpolate } = useLanguage();
  const [restoring, setRestoring] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [tripCount, setTripCount] = useState(0);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // Fetch profile + trip count for the header
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfile(null);
      setTripCount(0);
      return;
    }

    (async () => {
      try {
        // Try by user_id first, fall back to device_id
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);

          // Count public trips for this username
          if (profileData.username) {
            const { count } = await supabase
              .from('trips')
              .select('*', { count: 'exact', head: true })
              .eq('username', profileData.username)
              .eq('is_public', true);
            setTripCount(count ?? 0);
          }
        } else {
          // Fallback: try by device_id
          const deviceId = await getOrCreateDeviceId();
          const { data: deviceProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('device_id', deviceId)
            .maybeSingle();
          setProfile(deviceProfile);
          if (deviceProfile?.username) {
            const { count } = await supabase
              .from('trips')
              .select('*', { count: 'exact', head: true })
              .eq('username', deviceProfile.username)
              .eq('is_public', true);
            setTripCount(count ?? 0);
          }
        }
      } catch {
        // Non-fatal — header just won't show stats
      }
    })();
  }, [isAuthenticated, user]);

  async function handleSignOut() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t.settings.alerts.signOut.title,
      t.settings.alerts.signOut.message,
      [
        { text: t.settings.alerts.signOut.cancel, style: 'cancel' },
        {
          text: t.settings.alerts.signOut.confirm,
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to sign out.');
            }
          },
        },
      ],
    );
  }

  async function handleRestore() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.isPro) {
      Alert.alert(t.settings.alerts.restored.title, t.settings.alerts.restored.message);
    } else {
      Alert.alert(t.settings.alerts.nothingToRestore.title, t.settings.alerts.nothingToRestore.message);
    }
  }

  function handleClearData() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t.settings.alerts.clearData.title,
      t.settings.alerts.clearData.message,
      [
        { text: t.settings.alerts.clearData.cancel, style: 'cancel' },
        {
          text: t.settings.alerts.clearData.confirm,
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }

  function navigateToProfile() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (profile?.username) {
      router.push(`/profile/${profile.username}` as any);
    }
  }

  const planValue = isPro
    ? t.settings.planPro
    : interpolate(t.settings.planFree, { count: tripsRemaining });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ color: 'white', fontSize: 32, fontWeight: '800', letterSpacing: -0.8 }}>
            {t.settings.title}
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* ── Profile header card ── */}
          {isAuthenticated ? (
            <ProfileHeader
              profile={profile}
              tripCount={tripCount}
              onPress={navigateToProfile}
              isPro={isPro}
            />
          ) : (
            <SignInHeader
              onSignIn={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/auth/login' as any);
              }}
              onCreateAccount={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/onboarding' as any);
              }}
            />
          )}

          {/* ── Account section ── */}
          {isAuthenticated && (
            <>
              <SectionHeader title={t.settings.sections.account} />
              <View style={CARD_STYLE}>
                <SettingsRow
                  icon="person-circle-outline"
                  label={t.settings.rows.account}
                  value={user?.email ?? ''}
                />
                <SettingsRow
                  icon="person-outline"
                  label={t.settings.rows.editProfile}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/profile/edit' as any);
                  }}
                  isLast
                />
              </View>
            </>
          )}

          {/* ── Trips section ── */}
          <SectionHeader title={t.settings.sections.trips} />
          <View style={CARD_STYLE}>
            <SettingsRow
              icon="airplane-outline"
              label={t.settings.rows.addPastTrip}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/past-trip/destination' as any);
              }}
              isLast
            />
          </View>

          {/* ── Subscription section ── */}
          <SectionHeader title={t.settings.sections.subscription} />
          <View style={CARD_STYLE}>
            <SettingsRow
              icon="sparkles"
              label={t.settings.rows.plan}
              value={planValue}
            />
            {!isPro && (
              <SettingsRow
                icon="arrow-up-circle"
                label={t.settings.rows.upgradeToPro}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/upgrade' as any);
                }}
              />
            )}
            <SettingsRow
              icon="refresh"
              label={restoring ? t.settings.rows.restoring : t.settings.rows.restorePurchases}
              onPress={restoring ? undefined : handleRestore}
              isLast
            />
          </View>

          {/* ── Language section ── */}
          <SectionHeader title={t.settings.sections.language} />
          <View style={CARD_STYLE}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLanguagePicker(true);
              }}
              activeOpacity={0.65}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  backgroundColor: 'rgba(13,148,136,0.13)',
                }}
              >
                <Ionicons name="globe-outline" size={17} color={TEAL} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.1 }}>
                {t.settings.rows.language}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 18 }}>{langMeta.flag}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                  {langMeta.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Data & Privacy section ── */}
          <SectionHeader title={t.settings.sections.data} />
          <View style={CARD_STYLE}>
            <SettingsRow
              icon="document-text-outline"
              label={t.settings.rows.privacyPolicy}
              onPress={() => {}}
            />
            <SettingsRow
              icon="trash-outline"
              label={t.settings.rows.clearAllData}
              onPress={handleClearData}
              destructive
              isLast
            />
          </View>

          {/* ── Sign out (authenticated) ── */}
          {isAuthenticated && (
            <>
              <View style={{ height: 12 }} />
              <View style={CARD_STYLE}>
                <SettingsRow
                  icon="log-out-outline"
                  label={t.settings.rows.signOut}
                  onPress={handleSignOut}
                  destructive
                  isLast
                />
              </View>
            </>
          )}

          {/* ── About section ── */}
          <SectionHeader title={t.settings.sections.about} />
          <View style={CARD_STYLE}>
            <SettingsRow
              icon="information-circle-outline"
              label={t.settings.rows.version}
              value={appVersion}
              isLast
            />
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>

      <LanguagePickerModal
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        currentLanguage={language}
        onSelect={(code) => {
          setLanguage(code);
          setShowLanguagePicker(false);
        }}
        title={t.languagePicker.title}
        subtitle={t.languagePicker.subtitle}
      />
    </View>
  );
}
