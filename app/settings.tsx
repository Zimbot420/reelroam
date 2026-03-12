import { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProStatus } from '../hooks/useProStatus';
import { restorePurchases } from '../lib/purchases';
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
      className="flex-row items-center px-5 py-4 border-b border-gray-50"
    >
      <View
        className="w-8 h-8 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: destructive ? '#FEE2E2' : '#F0FDFA' }}
      >
        <Ionicons name={icon as any} size={17} color={destructive ? '#DC2626' : TEAL} />
      </View>
      <Text
        className="flex-1 text-base font-medium"
        style={{ color: destructive ? '#DC2626' : '#111827' }}
      >
        {label}
      </Text>
      {value ? (
        <Text className="text-gray-400 text-sm">{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-5 pt-6 pb-2">
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
            router.replace('/');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={18} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Settings</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Subscription */}
        <SectionHeader title="Subscription" />
        <View className="mx-5 rounded-2xl overflow-hidden border border-gray-100">
          <SettingsRow
            icon="sparkles"
            label="Plan"
            value={isPro ? 'Pro' : `Free (${tripsRemaining} trips left)`}
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
        <View className="mx-5 rounded-2xl overflow-hidden border border-gray-100">
          <SettingsRow
            icon="trash-outline"
            label="Clear All Local Data"
            onPress={handleClearData}
            destructive
          />
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View className="mx-5 rounded-2xl overflow-hidden border border-gray-100">
          <SettingsRow icon="document-text-outline" label="Privacy Policy" onPress={() => {}} />
          <SettingsRow icon="information-circle-outline" label="Version" value={appVersion} />
        </View>

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}
