import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isUsernameAvailable,
  publishTrip,
  upsertProfile,
} from '../lib/supabase';

const TEAL = '#0D9488';
const PROFILE_KEY = '@user_profile';

const TRAVEL_EMOJIS = [
  '🌍','✈️','🏖️','🗺️','🧳','🌏','🏔️','🌴','🎒','🚢',
  '🌅','🏕️','🗼','🎭','🍜','🏄','🤿','🎿','🦁','🌺',
];

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

interface SavedProfile {
  username: string;
  avatarEmoji: string;
}

interface Props {
  tripId: string;
  deviceId: string;
  visible: boolean;
  onClose: () => void;
  onShared: (username: string, avatarEmoji: string) => void;
}

export default function ShareToFeedModal({
  tripId,
  deviceId,
  visible,
  onClose,
  onShared,
}: Props) {
  const [savedProfile, setSavedProfile] = useState<SavedProfile | null>(null);
  const [username, setUsername] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🌍');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [makePublic, setMakePublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadSavedProfile();
      setSuccess(false);
      setLoading(false);
      setMakePublic(true);
      successScale.setValue(0);
    }
  }, [visible]);

  async function loadSavedProfile() {
    try {
      const saved = await AsyncStorage.getItem(PROFILE_KEY);
      if (saved) {
        setSavedProfile(JSON.parse(saved));
      } else {
        setSavedProfile(null);
        setUsername('');
        setUsernameStatus('idle');
      }
    } catch {
      setSavedProfile(null);
    }
  }

  function handleUsernameChange(text: string) {
    // Only allow letters, numbers, underscores; auto-lowercase
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setUsername(cleaned);

    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    if (cleaned.length === 0) {
      setUsernameStatus('idle');
      return;
    }
    if (cleaned.length < 3) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    checkTimeoutRef.current = setTimeout(async () => {
      const available = await isUsernameAvailable(cleaned, deviceId);
      setUsernameStatus(available ? 'available' : 'taken');
    }, 500);
  }

  async function handleShare() {
    const profile = savedProfile ?? { username, avatarEmoji: selectedEmoji };

    if (!savedProfile) {
      if (usernameStatus !== 'available') return;
      if (username.length < 3) return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      await upsertProfile(deviceId, profile.username, profile.avatarEmoji);
      const profileData: SavedProfile = { username: profile.username, avatarEmoji: profile.avatarEmoji };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
      await publishTrip(tripId, profile.username, profile.avatarEmoji);

      // Success
      setSuccess(true);
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 10,
        bounciness: 12,
      }).start();

      setTimeout(() => {
        onShared(profile.username, profile.avatarEmoji);
        onClose();
      }, 2200);
    } catch (e) {
      Alert.alert('Error', 'Failed to share trip. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const canShare = savedProfile
    ? makePublic
    : makePublic && usernameStatus === 'available' && username.length >= 3;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        {/* Backdrop tap to close */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View
            style={{
              backgroundColor: '#12122a',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 12,
              paddingBottom: Platform.OS === 'ios' ? 36 : 24,
              paddingHorizontal: 24,
            }}
          >
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 }} />

            {success ? (
              /* ── Success state ── */
              <Animated.View
                style={{
                  alignItems: 'center',
                  paddingVertical: 32,
                  transform: [{ scale: successScale }],
                }}
              >
                <Text style={{ fontSize: 56, marginBottom: 16 }}>🌍</Text>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
                  Trip is now live!
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, textAlign: 'center' }}>
                  Your trip is now on the Discovery feed for travelers worldwide
                </Text>
              </Animated.View>
            ) : (
              <>
                {/* ── Header ── */}
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 4 }}>
                  Share to Discovery Feed
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
                  Let other travelers get inspired by your trip
                </Text>

                {savedProfile ? (
                  /* ── Quick share view (profile exists) ── */
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      borderRadius: 16,
                      padding: 14,
                      marginBottom: 20,
                    }}
                  >
                    <Text style={{ fontSize: 32 }}>{savedProfile.avatarEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 2 }}>
                        Sharing as
                      </Text>
                      <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                        @{savedProfile.username}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setSavedProfile(null); }}
                      style={{ padding: 4 }}
                    >
                      <Text style={{ color: TEAL, fontSize: 13 }}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* ── Full form (no profile) ── */
                  <>
                    {/* Username input */}
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Choose a username
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: usernameStatus === 'available'
                          ? '#22c55e'
                          : usernameStatus === 'taken' || usernameStatus === 'invalid'
                          ? '#ef4444'
                          : 'rgba(255,255,255,0.12)',
                        paddingHorizontal: 14,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginRight: 2 }}>@</Text>
                      <TextInput
                        style={{ flex: 1, color: 'white', fontSize: 16, height: 48 }}
                        placeholder="travel_sofia"
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        value={username}
                        onChangeText={handleUsernameChange}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={20}
                      />
                      {usernameStatus === 'checking' && (
                        <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.4)" />
                      )}
                      {usernameStatus === 'available' && (
                        <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                      )}
                      {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      )}
                    </View>
                    {usernameStatus === 'taken' && (
                      <Text style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>Username is already taken</Text>
                    )}
                    {usernameStatus === 'invalid' && (
                      <Text style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>3–20 characters, letters, numbers & underscores only</Text>
                    )}

                    {/* Emoji selector */}
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Pick your avatar
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {TRAVEL_EMOJIS.map((emoji) => (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => { Haptics.selectionAsync(); setSelectedEmoji(emoji); }}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: selectedEmoji === emoji ? 'rgba(13,148,136,0.25)' : 'rgba(255,255,255,0.06)',
                            borderWidth: 1.5,
                            borderColor: selectedEmoji === emoji ? TEAL : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 22 }}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* Make public toggle */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 20,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="earth-outline" size={20} color={TEAL} />
                    <View>
                      <Text style={{ color: 'white', fontSize: 15, fontWeight: '500' }}>Make this trip public</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 }}>
                        Visible to all travelers on the feed
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={makePublic}
                    onValueChange={setMakePublic}
                    trackColor={{ false: 'rgba(255,255,255,0.15)', true: TEAL }}
                    thumbColor="white"
                  />
                </View>

                {/* Share button */}
                <TouchableOpacity
                  onPress={handleShare}
                  disabled={!canShare || loading}
                  activeOpacity={0.85}
                  style={{
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: canShare ? TEAL : 'rgba(255,255,255,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: canShare ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '700' }}>
                    {loading ? 'Sharing...' : '🌍  Share to Feed'}
                  </Text>
                </TouchableOpacity>

                {/* Keep private link */}
                <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Keep Private</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
