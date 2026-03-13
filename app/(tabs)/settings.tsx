import { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProStatus } from '../../hooks/useProStatus';
import { restorePurchases } from '../../lib/purchases';
import Constants from 'expo-constants';

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
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
          backgroundColor: destructive ? 'rgba(239,68,68,0.15)' : 'rgba(13,148,136,0.15)',
        }}
      >
        <Ionicons name={icon as any} size={17} color={destructive ? '#ef4444' : TEAL} />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: '500',
          color: destructive ? '#ef4444' : 'white',
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
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

export default function SettingsScreen() {
  const router = useRouter();
  const { isPro, tripsRemaining } = useProStatus();
  const [restoring, setRestoring] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  async function handleRestore() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.isPro) {
      Alert.alert('Restored', 'Your Pro subscription has been restored.');
    } else {
      Alert.alert('Nothing to restore', 'No active subscription found for this account.');
    }
  }

  function handleClearData() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear All Data',
      'This will delete your local trip history and reset your free trip counter. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: '700' }}>Settings</Text>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Subscription */}
          <SectionHeader title="Subscription" />
          <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <SettingsRow
              icon="sparkles"
              label="Plan"
              value={isPro ? 'Pro ✨' : `Free (${tripsRemaining} trips left)`}
            />
            {!isPro && (
              <SettingsRow
                icon="arrow-up-circle"
                label="Upgrade to Pro"
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/upgrade' as any); }}
              />
            )}
            <SettingsRow
              icon="refresh"
              label={restoring ? 'Restoring...' : 'Restore Purchases'}
              onPress={restoring ? undefined : handleRestore}
            />
          </View>

          {/* Data */}
          <SectionHeader title="Data" />
          <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <SettingsRow
              icon="trash-outline"
              label="Clear All Local Data"
              onPress={handleClearData}
              destructive
            />
          </View>

          {/* About */}
          <SectionHeader title="About" />
          <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <SettingsRow icon="document-text-outline" label="Privacy Policy" onPress={() => {}} />
            <SettingsRow icon="information-circle-outline" label="Version" value={appVersion} />
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
