import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../lib/context/LanguageContext';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import { getOrCreateDeviceId } from '../../lib/deviceId';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const CARD_BG = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRAVEL_EMOJIS = [
  '🌍','✈️','🏔️','🏖️','🗺️','🎒','🏕️','🚢',
  '🌄','🗼','🏯','🌺','🦁','🐠','🌊','⛰️',
  '🎿','🏄','🤿','🌸',
];

const MOOD_TAGS = [
  { emoji: '🍜', label: 'Food lover' },
  { emoji: '🏔️', label: 'Adventurous' },
  { emoji: '🏖️', label: 'Relaxing' },
  { emoji: '🎭', label: 'Cultural' },
  { emoji: '💰', label: 'Budget' },
  { emoji: '💎', label: 'Luxury' },
  { emoji: '👨‍👩‍👧', label: 'Family' },
  { emoji: '💑', label: 'Romantic' },
  { emoji: '👥', label: 'With Friends' },
  { emoji: '🎒', label: 'Solo' },
];

const TRIP_LENGTHS = [
  { key: 'short',  label: 'Short',         sub: '1-3 days' },
  { key: 'medium', label: 'Medium',        sub: '4-7 days' },
  { key: 'long',   label: 'Long',          sub: '8+ days' },
  { key: 'none',   label: 'No preference', sub: 'Any length' },
];

const COUNTRIES: { name: string; flag: string }[] = [
  { name: 'Australia',        flag: '🇦🇺' },
  { name: 'Austria',          flag: '🇦🇹' },
  { name: 'Bali (Indonesia)', flag: '🇮🇩' },
  { name: 'Belgium',          flag: '🇧🇪' },
  { name: 'Brazil',           flag: '🇧🇷' },
  { name: 'Canada',           flag: '🇨🇦' },
  { name: 'Chile',            flag: '🇨🇱' },
  { name: 'China',            flag: '🇨🇳' },
  { name: 'Colombia',         flag: '🇨🇴' },
  { name: 'Croatia',          flag: '🇭🇷' },
  { name: 'Czech Republic',   flag: '🇨🇿' },
  { name: 'Denmark',          flag: '🇩🇰' },
  { name: 'Egypt',            flag: '🇪🇬' },
  { name: 'Finland',          flag: '🇫🇮' },
  { name: 'France',           flag: '🇫🇷' },
  { name: 'Germany',          flag: '🇩🇪' },
  { name: 'Greece',           flag: '🇬🇷' },
  { name: 'Iceland',          flag: '🇮🇸' },
  { name: 'India',            flag: '🇮🇳' },
  { name: 'Ireland',          flag: '🇮🇪' },
  { name: 'Italy',            flag: '🇮🇹' },
  { name: 'Japan',            flag: '🇯🇵' },
  { name: 'Jordan',           flag: '🇯🇴' },
  { name: 'Kenya',            flag: '🇰🇪' },
  { name: 'Malaysia',         flag: '🇲🇾' },
  { name: 'Maldives',         flag: '🇲🇻' },
  { name: 'Mexico',           flag: '🇲🇽' },
  { name: 'Morocco',          flag: '🇲🇦' },
  { name: 'Nepal',            flag: '🇳🇵' },
  { name: 'Netherlands',      flag: '🇳🇱' },
  { name: 'New Zealand',      flag: '🇳🇿' },
  { name: 'Norway',           flag: '🇳🇴' },
  { name: 'Peru',             flag: '🇵🇪' },
  { name: 'Philippines',      flag: '🇵🇭' },
  { name: 'Poland',           flag: '🇵🇱' },
  { name: 'Portugal',         flag: '🇵🇹' },
  { name: 'Singapore',        flag: '🇸🇬' },
  { name: 'South Africa',     flag: '🇿🇦' },
  { name: 'South Korea',      flag: '🇰🇷' },
  { name: 'Spain',            flag: '🇪🇸' },
  { name: 'Sri Lanka',        flag: '🇱🇰' },
  { name: 'Sweden',           flag: '🇸🇪' },
  { name: 'Switzerland',      flag: '🇨🇭' },
  { name: 'Taiwan',           flag: '🇹🇼' },
  { name: 'Tanzania',         flag: '🇹🇿' },
  { name: 'Thailand',         flag: '🇹🇭' },
  { name: 'Turkey',           flag: '🇹🇷' },
  { name: 'UAE',              flag: '🇦🇪' },
  { name: 'United Kingdom',   flag: '🇬🇧' },
  { name: 'United States',    flag: '🇺🇸' },
  { name: 'Vietnam',          flag: '🇻🇳' },
];

// ─── Helper components ────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{
        color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600',
        letterSpacing: 1.2, textTransform: 'uppercase',
        marginBottom: 10, paddingHorizontal: 4,
      }}>
        {title}
      </Text>
      <View style={{
        backgroundColor: CARD_BG, borderRadius: 16,
        borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
      }}>
        {children}
      </View>
    </View>
  );
}

function FieldRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={{
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: BORDER,
    }}>
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label, subtitle, value, onChange, last,
}: { label: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: BORDER,
    }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: 'white', fontSize: 15, fontWeight: '500' }}>{label}</Text>
        {subtitle && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: 'rgba(255,255,255,0.15)', true: TEAL }}
        thumbColor="white"
      />
    </View>
  );
}

function InfoRow({
  icon, label, value, onPress, destructive, last,
}: { icon: string; label: string; value?: string; onPress?: () => void; destructive?: boolean; last?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: BORDER,
      }}
    >
      <View style={{
        width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
        backgroundColor: destructive ? 'rgba(239,68,68,0.15)' : 'rgba(13,148,136,0.15)',
        marginRight: 12,
      }}>
        <Ionicons name={icon as any} size={16} color={destructive ? '#ef4444' : TEAL} />
      </View>
      <Text style={{ flex: 1, color: destructive ? '#ef4444' : 'white', fontSize: 15, fontWeight: '500' }}>
        {label}
      </Text>
      {value ? (
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.25)" />
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Country picker modal ─────────────────────────────────────────────────────

function CountryPickerModal({
  visible, selected, onSelect, onClose,
}: { visible: boolean; selected: string; onSelect: (c: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const filtered = COUNTRIES.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 16, maxHeight: '80%',
        }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 14 }} />
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Home Country</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
              paddingHorizontal: 12, paddingVertical: 10,
              borderWidth: 1, borderColor: BORDER,
            }}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search countries..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={{ flex: 1, color: 'white', fontSize: 15 }}
                autoFocus
              />
            </View>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onSelect(item.name); onClose(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: 20, paddingVertical: 13,
                  backgroundColor: selected === item.name ? `${TEAL}15` : 'transparent',
                  borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
                }}
              >
                <Text style={{ fontSize: 22 }}>{item.flag}</Text>
                <Text style={{ flex: 1, color: 'white', fontSize: 15 }}>{item.name}</Text>
                {selected === item.name && <Ionicons name="checkmark" size={18} color={TEAL} />}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity
            onPress={onClose}
            style={{ marginHorizontal: 16, marginTop: 12, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Change password modal ────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    if (newPw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password: newPw });
      if (e) throw e;
      setNewPw(''); setConfirmPw('');
      Alert.alert('Password updated', 'Your password has been changed.');
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: insets.bottom + 24,
          }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 20 }}>Change Password</Text>
            <TextInput
              value={newPw}
              onChangeText={setNewPw}
              placeholder="New password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: 'white', fontSize: 15, borderWidth: 1, borderColor: BORDER, marginBottom: 10 }}
            />
            <TextInput
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder="Confirm new password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: 'white', fontSize: 15, borderWidth: 1, borderColor: BORDER, marginBottom: 16 }}
            />
            {error ? <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</Text> : null}
            <TouchableOpacity
              onPress={handleSave} disabled={saving}
              style={{ backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 }}
            >
              {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Update Password</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  visible, onConfirm, onClose,
}: { visible: boolean; onConfirm: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const canConfirm = text === 'DELETE';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: insets.bottom + 24,
          }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 }} />
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </View>
              <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Delete account</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                This will permanently delete all your trips, badges, and profile data. This action cannot be undone.
              </Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>
              Type <Text style={{ color: '#ef4444', fontWeight: '700' }}>DELETE</Text> to confirm
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type DELETE here"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="characters"
              style={{
                backgroundColor: 'rgba(239,68,68,0.08)',
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                color: '#ef4444', fontSize: 16, fontWeight: '700',
                borderWidth: 1, borderColor: canConfirm ? '#ef4444' : 'rgba(239,68,68,0.2)',
                marginBottom: 16, textAlign: 'center', letterSpacing: 2,
              }}
            />
            <TouchableOpacity
              onPress={onConfirm} disabled={!canConfirm}
              style={{
                backgroundColor: canConfirm ? '#ef4444' : 'rgba(239,68,68,0.2)',
                borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10,
              }}
            >
              <Text style={{ color: canConfirm ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '700' }}>
                Delete my account
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Simple toast ─────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={{
      position: 'absolute', bottom: 100, left: 24, right: 24,
      backgroundColor: '#1a2e1a',
      borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
      shadowColor: '#22c55e', shadowOpacity: 0.3, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 8,
    }}>
      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
      <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '600', flex: 1 }}>{message}</Text>
    </View>
  );
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadToStorage(uri: string, bucket: string, path: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { t, interpolate } = useLanguage();

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🌍');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);   // new local pick
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);   // saved remote URL
  const [coverUri, setCoverUri] = useState<string | null>(null);     // new local pick
  const [coverUrl, setCoverUrl] = useState<string | null>(null);     // saved remote URL
  const [travelStyle, setTravelStyle] = useState<string[]>([]);
  const [tripLength, setTripLength] = useState('none');
  // Privacy
  const [isPublic, setIsPublic] = useState(true);
  const [showBucketlist, setShowBucketlist] = useState(true);
  const [showBeenThere, setShowBeenThere] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  // Account
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  // UI state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [aiCoverUrl, setAiCoverUrl] = useState<string | null>(null);

  const deviceIdRef = useRef('');
  const originalUsernameRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark dirty helper
  const markDirty = () => setIsDirty(true);

  // ── Load profile ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadProfile();
    loadAiCoverSuggestion();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setLoadError(false);
    try {
      const deviceId = await getOrCreateDeviceId();
      deviceIdRef.current = deviceId;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDisplayName(data.display_name ?? '');
        setUsername(data.username ?? '');
        setBio(data.bio ?? '');
        setHomeCountry(data.home_country ?? '');
        setAvatarEmoji(data.avatar_emoji ?? '🌍');
        setAvatarUrl(data.avatar_url ?? null);
        setCoverUrl(data.cover_photo_url ?? null);
        setTravelStyle(data.travel_style ?? []);
        setTripLength(data.preferred_trip_length ?? 'none');
        setIsPublic(data.is_public ?? true);
        setShowBucketlist(data.show_bucketlist ?? true);
        setShowBeenThere(data.show_been_there ?? true);
        setShowBadges(data.show_badges ?? true);
        originalUsernameRef.current = data.username ?? '';
      }

      setEmail(user?.email ?? '');
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function loadAiCoverSuggestion() {
    try {
      const deviceId = await getOrCreateDeviceId();
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      const { data: trips } = await supabase
        .from('trips')
        .select('title')
        .eq('device_id', deviceId)
        .limit(20);

      if (!trips || trips.length === 0) return;

      // Find most common destination keyword
      const freq: Record<string, number> = {};
      trips.forEach((t: any) => {
        const word = (t.title ?? '').split(',')[0].trim();
        if (word) freq[word] = (freq[word] ?? 0) + 1;
      });
      const topDest = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!topDest) return;

      const { fetchLocationPhoto } = require('../../lib/api/photos');
      const urls = await fetchLocationPhoto(topDest, 1);
      if (urls[0]) setAiCoverUrl(urls[0]);
    } catch {
      // non-critical
    }
  }

  // ── Username availability check ───────────────────────────────────────────────

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    if (username === originalUsernameRef.current) {
      setUsernameAvailable(true);
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
        setUsernameAvailable(data === null || data.device_id === deviceIdRef.current);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);
  }, [username]);

  // ── Android back handler ──────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isDirty) {
          Alert.alert('Unsaved changes', 'Discard your changes?', [
            { text: 'Keep editing', style: 'cancel' },
            { text: 'Discard', style: 'destructive', onPress: () => router.back() },
          ]);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [isDirty]),
  );

  // ── Navigation back with dirty check ─────────────────────────────────────────

  function handleBack() {
    if (isDirty) {
      Alert.alert('Unsaved changes', 'Discard your changes?', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }

  // ── Photo pickers ─────────────────────────────────────────────────────────────

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      markDirty();
    }
  }

  async function pickCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true, aspect: [16, 9], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
      markDirty();
    }
  }

  function useAiCover() {
    if (aiCoverUrl) {
      setCoverUrl(aiCoverUrl);
      setCoverUri(null);
      markDirty();
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (loadError) {
      Alert.alert('Profile not loaded', 'Your profile could not be loaded. Please retry before saving.');
      return;
    }
    if (!displayName.trim()) { Alert.alert('Display name required', 'Please enter your name.'); return; }
    if (username.length >= 3 && usernameAvailable === false) {
      Alert.alert('Username taken', 'Please choose a different username.'); return;
    }

    setSaving(true);
    try {
      const deviceId = deviceIdRef.current;
      const ts = Date.now();
      let finalAvatarUrl = avatarUrl;
      let finalCoverUrl = coverUrl;

      // Upload avatar if new local image was picked
      if (avatarUri) {
        finalAvatarUrl = await uploadToStorage(avatarUri, 'avatars', `${deviceId}-avatar-${ts}.jpg`);
      }

      // Upload cover if new local image was picked
      if (coverUri) {
        finalCoverUrl = await uploadToStorage(coverUri, 'avatars', `covers/${deviceId}-cover-${ts}.jpg`);
      }

      const profileData: Record<string, any> = {
        device_id: deviceId,
        display_name: displayName.trim(),
        username: username.trim() || undefined,
        bio: bio.trim(),
        home_country: homeCountry || null,
        avatar_emoji: avatarEmoji || '🌍',
        avatar_url: finalAvatarUrl || null,
        cover_photo_url: finalCoverUrl || null,
        travel_style: travelStyle,
        preferred_trip_length: tripLength,
        is_public: isPublic,
        show_bucketlist: showBucketlist,
        show_been_there: showBeenThere,
        show_badges: showBadges,
      };

      if (user?.id) profileData.user_id = user.id;

      const { error } = await supabase.from('profiles').upsert(profileData, { onConflict: 'device_id' });
      if (error) throw error;

      // Update original username ref
      if (username) originalUsernameRef.current = username;

      setAvatarUrl(finalAvatarUrl);
      setCoverUrl(finalCoverUrl);
      setAvatarUri(null);
      setCoverUri(null);
      setIsDirty(false);

      // Show toast
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Change email ──────────────────────────────────────────────────────────────

  async function handleChangeEmail() {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.'); return;
    }
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      Alert.alert('Confirm your new email', 'We sent a confirmation link to your new address.');
      setChangingEmail(false);
      setNewEmail('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update email.');
    } finally {
      setEmailSaving(false);
    }
  }

  // ── Delete account ─────────────────────────────────────────────────────────────

  async function handleDeleteAccount() {
    try {
      const deviceId = deviceIdRef.current;
      await supabase.rpc('delete_user_account', {
        p_device_id: deviceId,
        p_user_id: user?.id ?? null,
      });
      await supabase.auth.signOut();
      router.replace('/(tabs)/' as any);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to delete account.');
    }
  }

  // ── Connected providers ───────────────────────────────────────────────────────

  const providers: string[] = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  const hasEmailAuth = providers.includes('email') || !!user?.email;
  const hasApple = providers.includes('apple');
  const hasGoogle = providers.includes('google');

  // ── Current cover/avatar display ───────────────────────────────────────────

  const displayAvatarUri = avatarUri ?? avatarUrl;
  const displayCoverUri = coverUri ?? coverUrl;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Ionicons name="cloud-offline-outline" size={48} color="rgba(255,255,255,0.3)" />
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
          Couldn't load profile
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={loadProfile}
          style={{ marginTop: 24, backgroundColor: TEAL, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{
            paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 16,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <TouchableOpacity
              onPress={handleBack}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>{t.editProfile.title}</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={{ paddingHorizontal: 16 }}>

            {/* ── PROFILE PHOTO ─────────────────────────────────────────────── */}
            <SectionCard title={t.editProfile.sections.profilePhoto}>
              {/* Avatar */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2.5, borderColor: TEAL, overflow: 'hidden', backgroundColor: '#1a2030', marginBottom: 16 }}>
                  {displayAvatarUri ? (
                    <ExpoImage source={{ uri: displayAvatarUri }} contentFit="cover" style={{ width: 100, height: 100 }} />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 46 }}>{avatarEmoji}</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={pickAvatar}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: BORDER }}
                  >
                    <Ionicons name="image-outline" size={16} color="white" />
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{t.editProfile.choosePhoto}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowEmojiPicker(true)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: BORDER }}
                  >
                    <Text style={{ fontSize: 16 }}>😀</Text>
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{t.editProfile.chooseEmoji}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cover photo */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>
                  {t.editProfile.coverPhoto}
                </Text>

                {/* Preview */}
                <View style={{ height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a2030', marginBottom: 12 }}>
                  {displayCoverUri ? (
                    <ExpoImage source={{ uri: displayCoverUri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <LinearGradient colors={['#004d40', '#006064', '#01579b']} style={{ flex: 1 }} />
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={pickCover}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingVertical: 9, borderWidth: 1, borderColor: BORDER }}
                  >
                    <Ionicons name="image-outline" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>{t.editProfile.cameraRoll}</Text>
                  </TouchableOpacity>

                  {aiCoverUrl && (
                    <TouchableOpacity
                      onPress={useAiCover}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        backgroundColor: coverUrl === aiCoverUrl ? `${TEAL}20` : 'rgba(255,255,255,0.07)',
                        borderRadius: 10, paddingVertical: 9,
                        borderWidth: 1, borderColor: coverUrl === aiCoverUrl ? TEAL : BORDER,
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>✨</Text>
                      <Text style={{ color: coverUrl === aiCoverUrl ? TEAL : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>
                        {t.editProfile.aiSuggested}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </SectionCard>

            {/* ── BASIC INFO ────────────────────────────────────────────────── */}
            <SectionCard title={t.editProfile.sections.basicInfo}>
              <FieldRow label={t.editProfile.displayName}>
                <TextInput
                  value={displayName}
                  onChangeText={(v) => { setDisplayName(v.slice(0, 30)); markDirty(); }}
                  placeholder={t.editProfile.yourName}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  style={{ color: 'white', fontSize: 16 }}
                />
              </FieldRow>

              <FieldRow label={t.editProfile.username}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>@</Text>
                  <TextInput
                    value={username}
                    onChangeText={(v) => { setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)); markDirty(); }}
                    placeholder="username"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{ flex: 1, color: 'white', fontSize: 16 }}
                  />
                  {username.length >= 3 && (
                    usernameChecking
                      ? <ActivityIndicator size="small" color={TEAL} />
                      : <Ionicons
                          name={usernameAvailable === false ? 'close-circle' : 'checkmark-circle'}
                          size={20}
                          color={usernameAvailable === false ? '#ef4444' : '#22c55e'}
                        />
                  )}
                </View>
                {usernameAvailable === false && (
                  <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{t.editProfile.usernameTaken}</Text>
                )}
              </FieldRow>

              <FieldRow label={interpolate(t.editProfile.bio, { count: bio.length })}>
                <TextInput
                  value={bio}
                  onChangeText={(v) => { setBio(v.slice(0, 120)); markDirty(); }}
                  placeholder={t.editProfile.bioPlaceholder}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  style={{ color: 'white', fontSize: 15, minHeight: 60, textAlignVertical: 'top' }}
                />
              </FieldRow>

              <FieldRow label={t.editProfile.homeCountry} last>
                <TouchableOpacity
                  onPress={() => setShowCountryPicker(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  {homeCountry ? (
                    <>
                      <Text style={{ fontSize: 20 }}>
                        {COUNTRIES.find((c) => c.name === homeCountry)?.flag ?? '🌍'}
                      </Text>
                      <Text style={{ flex: 1, color: 'white', fontSize: 15 }}>{homeCountry}</Text>
                    </>
                  ) : (
                    <Text style={{ flex: 1, color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>{t.editProfile.selectCountry}</Text>
                  )}
                  <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.25)" />
                </TouchableOpacity>
              </FieldRow>
            </SectionCard>

            {/* ── TRAVEL PREFERENCES ───────────────────────────────────────── */}
            <SectionCard title={t.editProfile.sections.travelStyle}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 }}>
                  {t.editProfile.travelMood}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 10 }}>
                  {t.editProfile.travelMoodSub}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {MOOD_TAGS.map((tag) => {
                    const active = travelStyle.includes(tag.label);
                    return (
                      <TouchableOpacity
                        key={tag.label}
                        onPress={() => {
                          setTravelStyle((prev) =>
                            prev.includes(tag.label) ? prev.filter((x) => x !== tag.label) : [...prev, tag.label],
                          );
                          markDirty();
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          backgroundColor: active ? `${TEAL}20` : 'rgba(255,255,255,0.06)',
                          borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7,
                          borderWidth: 1.5, borderColor: active ? TEAL : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>{tag.emoji}</Text>
                        <Text style={{ color: active ? TEAL : 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: active ? '700' : '400' }}>
                          {tag.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 }}>
                  {t.editProfile.preferredLength}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TRIP_LENGTHS.map((tl) => {
                    const active = tripLength === tl.key;
                    return (
                      <TouchableOpacity
                        key={tl.key}
                        onPress={() => { setTripLength(tl.key); markDirty(); }}
                        style={{
                          flex: 1, minWidth: '45%',
                          backgroundColor: active ? `${TEAL}20` : 'rgba(255,255,255,0.06)',
                          borderRadius: 12, padding: 12,
                          borderWidth: 1.5, borderColor: active ? TEAL : 'rgba(255,255,255,0.08)',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: active ? TEAL : 'white', fontSize: 14, fontWeight: '600' }}>{tl.label}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{tl.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </SectionCard>

            {/* ── PRIVACY ───────────────────────────────────────────────────── */}
            <SectionCard title={t.editProfile.sections.privacy}>
              <ToggleRow
                label={t.editProfile.publicProfile}
                subtitle={t.editProfile.publicProfileSub}
                value={isPublic}
                onChange={(v) => { setIsPublic(v); markDirty(); }}
              />
              <ToggleRow
                label={t.editProfile.showBucketlist}
                subtitle={t.editProfile.showBucketlistSub}
                value={showBucketlist}
                onChange={(v) => { setShowBucketlist(v); markDirty(); }}
              />
              <ToggleRow
                label={t.editProfile.showBeenThere}
                value={showBeenThere}
                onChange={(v) => { setShowBeenThere(v); markDirty(); }}
              />
              <ToggleRow
                label={t.editProfile.showBadges}
                value={showBadges}
                onChange={(v) => { setShowBadges(v); markDirty(); }}
                last
              />
            </SectionCard>

            {/* ── ACCOUNT ───────────────────────────────────────────────────── */}
            <SectionCard title={t.editProfile.sections.account}>
              {/* Email */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: changingEmail ? 10 : 0 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(13,148,136,0.15)', marginRight: 12 }}>
                    <Ionicons name="mail-outline" size={16} color={TEAL} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontSize: 15, fontWeight: '500' }}>{t.editProfile.email}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 }}>{email || t.editProfile.notSignedIn}</Text>
                  </View>
                  {email ? (
                    <TouchableOpacity onPress={() => setChangingEmail((v) => !v)}>
                      <Text style={{ color: TEAL, fontSize: 13, fontWeight: '600' }}>
                        {changingEmail ? t.editProfile.cancel : t.editProfile.change}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {changingEmail && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder={t.editProfile.newEmail}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: 'white', fontSize: 14, borderWidth: 1, borderColor: BORDER }}
                    />
                    <TouchableOpacity
                      onPress={handleChangeEmail}
                      disabled={emailSaving}
                      style={{ backgroundColor: TEAL, borderRadius: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {emailSaving ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Change password (email only) */}
              {hasEmailAuth && (
                <InfoRow
                  icon="lock-closed-outline"
                  label="Change Password"
                  onPress={() => setShowPasswordModal(true)}
                />
              )}

              {/* Connected accounts */}
              {(hasApple || hasGoogle) && (
                <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: BORDER }}>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>
                    CONNECTED ACCOUNTS
                  </Text>
                  <View style={{ gap: 8 }}>
                    {hasApple && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="logo-apple" size={18} color="white" />
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Apple</Text>
                        <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '600' }}>Connected</Text>
                        </View>
                      </View>
                    )}
                    {hasGoogle && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="logo-google" size={18} color="white" />
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Google</Text>
                        <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '600' }}>Connected</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Danger zone */}
              <View style={{
                borderTopWidth: 1, borderTopColor: 'rgba(239,68,68,0.15)',
                backgroundColor: 'rgba(239,68,68,0.04)',
              }}>
                <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
                  <Text style={{ color: 'rgba(239,68,68,0.6)', fontSize: 11, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                    Danger zone
                  </Text>
                </View>
                <InfoRow
                  icon="trash-outline"
                  label="Delete account"
                  onPress={() => setShowDeleteModal(true)}
                  destructive
                  last
                />
              </View>
            </SectionCard>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating save button */}
      {isDirty && (
        <View style={{
          position: 'absolute', bottom: insets.bottom + 20,
          left: 16, right: 16,
        }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.9}
            style={{
              backgroundColor: TEAL, borderRadius: 16,
              paddingVertical: 17, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
              shadowColor: TEAL, shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
            }}
          >
            {saving
              ? <ActivityIndicator color="white" />
              : <>
                  <Ionicons name="checkmark" size={18} color="white" />
                  <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>{t.editProfile.saveChanges}</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Toast */}
      <Toast visible={toastVisible} message="Profile saved successfully!" />

      {/* Emoji picker modal */}
      <Modal visible={showEmojiPicker} transparent animationType="slide" onRequestClose={() => setShowEmojiPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} activeOpacity={1} onPress={() => setShowEmojiPicker(false)}>
          <View style={{ flex: 1 }} />
          <View style={{ backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Choose avatar emoji</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {TRAVEL_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    setAvatarEmoji(emoji);
                    setAvatarUri(null);
                    setAvatarUrl(null);
                    markDirty();
                    setShowEmojiPicker(false);
                  }}
                  style={{
                    width: 54, height: 54, borderRadius: 14,
                    backgroundColor: avatarEmoji === emoji && !avatarUri && !avatarUrl ? `${TEAL}25` : 'rgba(255,255,255,0.07)',
                    borderWidth: 1.5,
                    borderColor: avatarEmoji === emoji && !avatarUri && !avatarUrl ? TEAL : 'rgba(255,255,255,0.08)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Country picker */}
      <CountryPickerModal
        visible={showCountryPicker}
        selected={homeCountry}
        onSelect={(c) => { setHomeCountry(c); markDirty(); }}
        onClose={() => setShowCountryPicker(false)}
      />

      {/* Change password modal */}
      <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />

      {/* Delete confirm modal */}
      <DeleteConfirmModal
        visible={showDeleteModal}
        onConfirm={handleDeleteAccount}
        onClose={() => setShowDeleteModal(false)}
      />
    </View>
  );
}
