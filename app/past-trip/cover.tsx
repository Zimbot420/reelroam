import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import { getOrCreateDeviceId } from '../../lib/deviceId';
import { pastTripDraft, resetPastTripDraft } from '../../lib/pastTripDraft';
import {
  createNotification,
  hasAskedForPermission,
  requestPermissions,
  schedulePushNotification,
} from '../../lib/notifications';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const STEP_DOTS = [1, 2, 3, 4, 5];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {STEP_DOTS.map((s) => (
        <View
          key={s}
          style={{
            width: s === step ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: s === step ? TEAL : 'rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </View>
  );
}

function buildDateStr(year: number | null, month: number | null): string | null {
  if (year === null) return null;
  if (month === null) return `${year}`;
  const mm = String(month + 1).padStart(2, '0');
  return `${year}-${mm}`;
}

// Award badges based on total past trip count and unique countries
async function checkAndAwardBadges(deviceId: string, userId: string | null) {
  try {
    const { data: pastTrips } = await supabase
      .from('trips')
      .select('title')
      .eq('is_past_trip', true)
      .eq('device_id', deviceId);

    const count = pastTrips?.length ?? 0;

    const badgesToCheck: { key: string; emoji: string; name: string; tier: string; threshold: number }[] = [
      { key: 'first_past_trip', emoji: '✈️', name: 'First Trip', tier: 'common', threshold: 1 },
      { key: 'explorer_3',      emoji: '🌍', name: 'Explorer',   tier: 'rare',   threshold: 3 },
      { key: 'trailblazer_5',   emoji: '🏅', name: 'Trailblazer', tier: 'epic',  threshold: 5 },
      { key: 'wanderer_10',     emoji: '🗺️', name: 'Wanderer',   tier: 'legendary', threshold: 10 },
    ];

    const newBadges: typeof badgesToCheck = [];

    for (const badge of badgesToCheck) {
      if (count >= badge.threshold) {
        const { error } = await supabase.from('user_badges').insert({
          device_id: deviceId,
          user_id: userId,
          badge_key: badge.key,
          badge_emoji: badge.emoji,
          badge_name: badge.name,
          badge_tier: badge.tier,
        });
        if (!error) newBadges.push(badge);
      }
    }

    return newBadges;
  } catch {
    return [];
  }
}

export default function PastTripCover() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [coverUrl, setCoverUrl] = useState<string | null>(pastTripDraft.placesCoverUrl);
  const [saving, setSaving] = useState(false);

  async function pickFromCameraRoll() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUrl(result.assets[0].uri);
    }
  }

  function usePlacesPhoto() {
    if (pastTripDraft.placesCoverUrl) {
      setCoverUrl(pastTripDraft.placesCoverUrl);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const draft = pastTripDraft;

      const tripData: Record<string, any> = {
        title: draft.destination,
        source_url: '',
        platform: 'manual',
        is_past_trip: true,
        visited_start: buildDateStr(draft.startYear, draft.startMonth),
        visited_end: buildDateStr(draft.endYear, draft.endMonth),
        approximate_dates: draft.approximateDates,
        rating: draft.rating > 0 ? draft.rating : null,
        mood_tags: draft.moodTags,
        trip_highlights: draft.highlights,
        trip_note: draft.note || null,
        cover_url: coverUrl ?? draft.placesCoverUrl ?? null,
        device_id: deviceId,
        user_id: user?.id ?? null,
        is_public: false,
        is_pro: false,
      };

      const { data: saved, error } = await supabase
        .from('trips')
        .insert(tripData)
        .select('id')
        .single();

      if (error) throw error;

      // Award badges (ignore errors — non-critical)
      const newBadges = await checkAndAwardBadges(deviceId, user?.id ?? null);

      // Create badge notifications and offer permission prompt for first badge
      if (newBadges.length > 0 && user?.id) {
        for (const badge of newBadges) {
          await createNotification(
            user.id,
            'badge_earned',
            `${badge.emoji} New badge: ${badge.name}!`,
            `You earned the ${badge.name} badge for logging ${badge.threshold} trip${badge.threshold === 1 ? '' : 's'}.`,
            { badge_key: badge.key },
          );
        }
        // Also fire a local notification if permission already granted
        await schedulePushNotification(
          '🎉 New badge earned!',
          newBadges.map((b) => `${b.emoji} ${b.name}`).join(', '),
        );
      }

      resetPastTripDraft();

      if (newBadges.length > 0) {
        const badgeNames = newBadges.map((b) => `${b.emoji} ${b.name}`).join('\n');
        const asked = await hasAskedForPermission();

        if (!asked && user?.id) {
          // First badge — offer notification permission in context
          Alert.alert(
            '🎉 New badges earned!',
            `${badgeNames}\n\nWant to know when people save your trips? Enable notifications to stay in the loop.`,
            [
              {
                text: 'Enable Notifications',
                onPress: async () => {
                  await requestPermissions();
                  router.dismiss();
                },
              },
              { text: 'Not now', style: 'cancel', onPress: () => router.dismiss() },
            ],
          );
        } else {
          Alert.alert(
            '🎉 New badges earned!',
            badgeNames,
            [{ text: 'Awesome!', onPress: () => router.dismiss() }],
          );
        }
      } else {
        Alert.alert('Trip saved! ✈️', `${draft.destination} has been added to your Been There list.`, [
          { text: 'View profile', onPress: () => router.dismiss() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save trip. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const draft = pastTripDraft;
  const dateRange = (() => {
    if (draft.startYear === null) return '';
    const start = `${draft.startMonth !== null ? MONTHS[draft.startMonth] + ' ' : ''}${draft.startYear}`;
    const end = draft.endYear !== null
      ? ` – ${draft.endMonth !== null ? MONTHS[draft.endMonth] + ' ' : ''}${draft.endYear}`
      : '';
    return start + end;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.08)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            <ProgressDots step={5} />
            <View style={{ width: 36 }} />
          </View>

          <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
            Cover photo
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, marginTop: 6 }}>
            Optional — give your trip a face
          </Text>
        </View>

        {/* Trip card preview */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <View
            style={{
              height: 200, borderRadius: 16, overflow: 'hidden',
              backgroundColor: '#1a2030',
            }}
          >
            {coverUrl ? (
              <ExpoImage
                source={{ uri: coverUrl }}
                contentFit="cover"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            ) : (
              <LinearGradient
                colors={['#004d40', '#006064', '#01579b']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* Been here badge */}
            <View
              style={{
                position: 'absolute', top: 10, right: 10,
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(34,197,94,0.85)',
                borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
              }}
            >
              <Ionicons name="checkmark-circle" size={11} color="white" />
              <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Been Here</Text>
            </View>
            {/* Star rating preview */}
            {draft.rating > 0 && (
              <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons key={n} name={n <= draft.rating ? 'star' : 'star-outline'} size={11} color={n <= draft.rating ? '#f59e0b' : 'rgba(255,255,255,0.5)'} />
                ))}
              </View>
            )}
            {/* Bottom info */}
            <View style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
                {draft.destination || 'Destination'}
              </Text>
              {dateRange ? (
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                  {dateRange}
                </Text>
              ) : null}
              {draft.moodTags.length > 0 && (
                <Text style={{ fontSize: 14, marginTop: 4 }}>
                  {draft.moodTags.slice(0, 4).map((t) => {
                    const tag = [
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
                    ].find((x) => x.label === t);
                    return tag?.emoji ?? '';
                  }).join(' ')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Photo options */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <TouchableOpacity
            onPress={pickFromCameraRoll}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 14, padding: 16,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <View
              style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="image-outline" size={20} color="white" />
            </View>
            <View>
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>Choose from camera roll</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 }}>Pick your own photo</Text>
            </View>
          </TouchableOpacity>

          {pastTripDraft.placesCoverUrl && (
            <TouchableOpacity
              onPress={usePlacesPhoto}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: coverUrl === pastTripDraft.placesCoverUrl ? `${TEAL}15` : 'rgba(255,255,255,0.06)',
                borderRadius: 14, padding: 16,
                borderWidth: 1,
                borderColor: coverUrl === pastTripDraft.placesCoverUrl ? TEAL : 'rgba(255,255,255,0.1)',
              }}
            >
              <View
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: `${TEAL}20`,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>🌍</Text>
              </View>
              <View>
                <Text style={{ color: coverUrl === pastTripDraft.placesCoverUrl ? TEAL : 'white', fontSize: 15, fontWeight: '600' }}>
                  Use destination photo
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 }}>
                  AI-suggested photo of {draft.destination.split(',')[0]}
                </Text>
              </View>
              {coverUrl === pastTripDraft.placesCoverUrl && (
                <Ionicons name="checkmark-circle" size={20} color={TEAL} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          )}

          {coverUrl && (
            <TouchableOpacity
              onPress={() => setCoverUrl(null)}
              style={{ alignItems: 'center', paddingVertical: 8 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Remove photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 20, left: 16, right: 16 }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            backgroundColor: TEAL,
            borderRadius: 16, paddingVertical: 18, alignItems: 'center',
            flexDirection: 'row', justifyContent: 'center', gap: 8,
            shadowColor: TEAL,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
          }}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>
              Looks good, finish! 🎉
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
