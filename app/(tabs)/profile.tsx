import { useEffect } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/context/AuthContext';
import { supabase } from '../../lib/supabase';

const TEAL = '#0D9488';

export default function ProfileTab() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/settings');
      return;
    }

    // Look up the current user's username, then navigate to their profile
    supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user!.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) {
          router.replace(`/profile/${data.username}`);
        } else {
          // No profile set up yet — send to settings to complete onboarding
          router.replace('/settings');
        }
      });
  }, [isAuthenticated, isLoading]);

  // Show a brief loading indicator while the redirect resolves
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="person-circle-outline" size={40} color={TEAL} />
    </View>
  );
}
