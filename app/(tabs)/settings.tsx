import { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProStatus } from '../../hooks/useProStatus';
import { restorePurchases } from '../../lib/purchases';
import Constants from 'expo-constants';
import { useAuth } from '../../lib/context/AuthContext';
import { signOut } from '../../lib/supabase';
import { useLanguage } from '../../lib/context/LanguageContext';
import { LANGUAGES, LanguageCode } from '../../lib/i18n/translations';

const TEAL = '#0D9488';

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
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
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
          backgroundColor: destructive ? 'rgba(239,68,68,0.12)' : 'rgba(13,148,136,0.13)',
          borderWidth: 1,
          borderColor: destructive ? 'rgba(239,68,68,0.15)' : 'rgba(13,148,136,0.2)',
          overflow: 'hidden',
        }}
      >
        <View style={{
          position: 'absolute', top: 0, left: 3, right: 3, height: 1,
          backgroundColor: destructive ? 'rgba(239,68,68,0.2)' : 'rgba(13,148,136,0.3)',
        }} />
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
        <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.2)" />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 32, paddingBottom: 8, gap: 8 }}>
      <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: 'rgba(13,148,136,0.5)' }} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

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
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
      >
        {/* Sheet — stop touch from closing when tapping inside */}
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
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>

            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', letterSpacing: -0.4 }}>
                {title}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
                {subtitle}
              </Text>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 20, marginBottom: 8 }} />

            {/* Language list */}
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
                      backgroundColor: isSelected
                        ? 'rgba(13,148,136,0.12)'
                        : 'transparent',
                      borderWidth: 1,
                      borderColor: isSelected
                        ? 'rgba(13,148,136,0.3)'
                        : 'transparent',
                    }}
                  >
                    {/* Flag */}
                    <Text style={{ fontSize: 26, marginRight: 14, lineHeight: 32 }}>
                      {lang.flag}
                    </Text>

                    {/* Labels */}
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

                    {/* Checkmark */}
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

export default function SettingsScreen() {
  const router = useRouter();
  const { isPro, tripsRemaining } = useProStatus();
  const { isAuthenticated, user } = useAuth();
  const { t, language, langMeta, setLanguage, interpolate } = useLanguage();
  const [restoring, setRestoring] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

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
      Alert.alert(
        t.settings.alerts.restored.title,
        t.settings.alerts.restored.message,
      );
    } else {
      Alert.alert(
        t.settings.alerts.nothingToRestore.title,
        t.settings.alerts.nothingToRestore.message,
      );
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

  const planValue = isPro
    ? t.settings.planPro
    : interpolate(t.settings.planFree, { count: tripsRemaining });

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ color: 'white', fontSize: 32, fontWeight: '800', letterSpacing: -0.8 }}>
            {t.settings.title}
          </Text>
          <View style={{ width: 32, height: 2, borderRadius: 1, backgroundColor: '#0D9488', marginTop: 6, opacity: 0.8 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Account */}
          <SectionHeader title={t.settings.sections.account} />
          <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
            {!isAuthenticated ? (
              <>
                <SettingsRow
                  icon="log-in-outline"
                  label={t.settings.rows.signIn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/auth/login' as any);
                  }}
                />
                <SettingsRow
                  icon="person-add-outline"
                  label={t.settings.rows.createAccount}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/onboarding' as any);
                  }}
                />
              </>
            ) : (
              <>
                <SettingsRow
                  icon="person-circle-outline"
                  label={t.settings.rows.account}
                  value={user?.email ?? ''}
                />
                <SettingsRow
                  icon="log-out-outline"
                  label={t.settings.rows.signOut}
                  onPress={handleSignOut}
                  destructive
                />
              </>
            )}
          </View>

          {/* Trips */}
          <SectionHeader title={t.settings.sections.trips} />
          <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
            {isAuthenticated && (
              <SettingsRow
                icon="person-outline"
                label={t.settings.rows.editProfile}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/profile/edit' as any);
                }}
              />
            )}
            <SettingsRow
              icon="airplane-outline"
              label={t.settings.rows.addPastTrip}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/past-trip/destination' as any);
              }}
            />
          </View>

          {/* Subscription */}
          <SectionHeader title={t.settings.sections.subscription} />
          <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
            <SettingsRow
              icon="sparkles"
              label={t.settings.rows.plan}
              value={planValue}
            />
            {!isPro && (
              <SettingsRow
                icon="arrow-up-circle"
                label={t.settings.rows.upgradeToPro}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/upgrade' as any); }}
              />
            )}
            <SettingsRow
              icon="refresh"
              label={restoring ? t.settings.rows.restoring : t.settings.rows.restorePurchases}
              onPress={restoring ? undefined : handleRestore}
            />
          </View>

          {/* Language */}
          <SectionHeader title={t.settings.sections.language} />
          <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
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
                paddingVertical: 15,
              }}
            >
              {/* Icon box */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  backgroundColor: 'rgba(13,148,136,0.13)',
                  borderWidth: 1,
                  borderColor: 'rgba(13,148,136,0.2)',
                  overflow: 'hidden',
                }}
              >
                <View style={{
                  position: 'absolute', top: 0, left: 3, right: 3, height: 1,
                  backgroundColor: 'rgba(13,148,136,0.3)',
                }} />
                <Ionicons name="globe-outline" size={17} color={TEAL} />
              </View>

              {/* Label */}
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.1 }}>
                {t.settings.rows.language}
              </Text>

              {/* Current language badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 18 }}>{langMeta.flag}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                  {langMeta.label}
                </Text>
                <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.2)" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Data */}
          <SectionHeader title={t.settings.sections.data} />
          <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
            <SettingsRow
              icon="trash-outline"
              label={t.settings.rows.clearAllData}
              onPress={handleClearData}
              destructive
            />
          </View>

          {/* About */}
          <SectionHeader title={t.settings.sections.about} />
          <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
            <SettingsRow icon="document-text-outline" label={t.settings.rows.privacyPolicy} onPress={() => {}} />
            <SettingsRow icon="information-circle-outline" label={t.settings.rows.version} value={appVersion} />
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
