import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import { getOrCreateDeviceId } from '../../lib/deviceId';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

const TRAVEL_EMOJIS = [
  '🌍','✈️','🏔️','🏖️','🗺️','🎒','🏕️','🚢',
  '🌄','🗼','🏯','🌺','🦁','🐠','🌊','⛰️',
  '🎿','🏄','🤿','🌸',
];

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

function toUsernameSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🌍');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-suggest username from display name
  useEffect(() => {
    if (displayName && !username) {
      setUsername(toUsernameSlug(displayName));
    }
  }, [displayName]);

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setUsernameChecking(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('device_id')
          .eq('username', username)
          .maybeSingle();

        const deviceId = await getOrCreateDeviceId();
        setUsernameAvailable(data === null || data.device_id === deviceId);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your photo library to upload a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!displayName.trim()) {
      setError('Please enter a display name.');
      return;
    }
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (usernameAvailable === false) {
      setError('That username is already taken.');
      return;
    }

    try {
      setError('');
      setSaving(true);
      const deviceId = await getOrCreateDeviceId();

      const profileData: Record<string, any> = {
        device_id: deviceId,
        username: username.trim(),
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_emoji: avatarUri ? null : selectedEmoji,
      };

      if (user?.id) {
        profileData.user_id = user.id;
      }

      if (avatarUri) {
        // Upload to Supabase Storage so the URL is permanent (not a local temp path)
        try {
          const response = await fetch(avatarUri);
          const blob = await response.blob();
          const uploadPath = `${deviceId}-avatar-${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(uploadPath, blob, { contentType: 'image/jpeg', upsert: true });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadPath);
          profileData.avatar_url = urlData.publicUrl;
          profileData.avatar_emoji = null;
        } catch {
          // Upload failed — keep emoji, don't store a broken local URI
          profileData.avatar_emoji = selectedEmoji;
        }
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'device_id' });

      if (upsertError) throw upsertError;

      router.push('/onboarding/migrate');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    router.push('/onboarding/migrate');
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
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
              <ProgressDots current={4} total={5} />
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Title */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: 'white',
                fontSize: 30,
                fontWeight: '800',
                marginBottom: 6,
                letterSpacing: -0.5,
              }}
            >
              Set up your profile
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>
              Tell the world who you are
            </Text>
          </View>

          {/* Avatar section */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <TouchableOpacity onPress={() => setShowEmojiPicker(true)} activeOpacity={0.85}>
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: 'rgba(13,148,136,0.12)',
                  borderWidth: 2,
                  borderColor: TEAL,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: 100, height: 100, borderRadius: 50 }}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 48 }}>{selectedEmoji}</Text>
                )}
              </View>
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: TEAL,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: BG,
                }}
              >
                <Ionicons name="pencil" size={13} color="white" />
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setShowEmojiPicker(true)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' }}>
                  Change Emoji
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickImage}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' }}>
                  Upload Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form fields */}
          <View style={{ gap: 16 }}>
            {/* Display name */}
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
                Display Name
              </Text>
              <TextInput
                value={displayName}
                onChangeText={(t) => setDisplayName(t.slice(0, 30))}
                placeholder="Your name"
                placeholderTextColor="rgba(255,255,255,0.25)"
                maxLength={30}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.1)',
                  paddingHorizontal: 16,
                  height: 52,
                  color: 'white',
                  fontSize: 16,
                }}
              />
            </View>

            {/* Username */}
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
                Username
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: username.length >= 3
                    ? (usernameAvailable === true ? 'rgba(13,148,136,0.6)'
                      : usernameAvailable === false ? 'rgba(239,68,68,0.4)'
                      : 'rgba(255,255,255,0.1)')
                    : 'rgba(255,255,255,0.1)',
                  paddingHorizontal: 16,
                  height: 52,
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginRight: 2 }}>@</Text>
                <TextInput
                  value={username}
                  onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                  placeholder="username"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    color: 'white',
                    fontSize: 16,
                  }}
                />
                {username.length >= 3 && (
                  usernameChecking ? (
                    <ActivityIndicator size="small" color={TEAL} />
                  ) : (
                    <Ionicons
                      name={usernameAvailable ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={usernameAvailable ? '#22c55e' : '#ef4444'}
                    />
                  )
                )}
              </View>
              {usernameAvailable === false && (
                <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                  Username already taken
                </Text>
              )}
            </View>

            {/* Bio */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 13,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Bio
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  {bio.length}/120
                </Text>
              </View>
              <TextInput
                value={bio}
                onChangeText={(t) => setBio(t.slice(0, 120))}
                placeholder="Tell your travel story..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                numberOfLines={3}
                maxLength={120}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.1)',
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 14,
                  color: 'white',
                  fontSize: 15,
                  minHeight: 88,
                  textAlignVertical: 'top',
                }}
              />
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

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              style={{
                backgroundColor: TEAL,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 4,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>
                  Complete Profile
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.7}
              style={{ alignItems: 'center', paddingVertical: 10 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
          activeOpacity={1}
          onPress={() => setShowEmojiPicker(false)}
        >
          <View style={{ flex: 1 }} />
          <View
            style={{
              backgroundColor: '#111827',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignSelf: 'center',
                marginBottom: 20,
              }}
            />
            <Text
              style={{
                color: 'white',
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 16,
              }}
            >
              Choose your avatar
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {TRAVEL_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    setSelectedEmoji(emoji);
                    setAvatarUri(null);
                    setShowEmojiPicker(false);
                  }}
                  activeOpacity={0.7}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor:
                      selectedEmoji === emoji && !avatarUri
                        ? 'rgba(13,148,136,0.25)'
                        : 'rgba(255,255,255,0.07)',
                    borderWidth: 1.5,
                    borderColor:
                      selectedEmoji === emoji && !avatarUri
                        ? TEAL
                        : 'rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
