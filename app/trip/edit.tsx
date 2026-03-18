import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { updateTripItinerary } from '../../lib/api/trips';
import { ItineraryData } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAL = '#0D9488';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';
const TEXT = '#111827';
const MUTED = '#6B7280';
const LIGHT = '#9CA3AF';

type ActivityType = 'food' | 'activity' | 'accommodation' | 'transport';

const TYPE_ICONS: Record<ActivityType, keyof typeof Ionicons.glyphMap> = {
  food:          'restaurant-outline',
  activity:      'camera-outline',
  accommodation: 'business-outline',
  transport:     'car-outline',
};

const TYPE_COLORS: Record<ActivityType, string> = {
  food:          '#F97316',
  activity:      '#8B5CF6',
  accommodation: '#3B82F6',
  transport:     '#10B981',
};

interface Activity {
  id: string;
  name: string;
  description: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  duration: string;
  type: ActivityType;
  estimatedCost: string;
  tips: string;
}

interface Day {
  day: number;
  label: string;
  activities: Activity[];
}

function newActivityId() {
  return 'act_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Activity editor (inline) ─────────────────────────────────────────────────

function ActivityEditor({
  activity,
  onChange,
}: {
  activity: Activity;
  onChange: (field: keyof Activity, value: string | ActivityType) => void;
}) {
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      {/* Name */}
      <TextInput
        value={activity.name}
        onChangeText={(v) => onChange('name', v)}
        placeholder="Activity name"
        placeholderTextColor={LIGHT}
        style={{
          backgroundColor: BG,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: TEXT,
          borderWidth: 1,
          borderColor: BORDER,
        }}
      />

      {/* Type picker */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(Object.keys(TYPE_ICONS) as ActivityType[]).map((t) => {
          const active = activity.type === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => onChange('type', t)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: active ? TYPE_COLORS[t] + '18' : BG,
                borderWidth: 1,
                borderColor: active ? TYPE_COLORS[t] : BORDER,
              }}
            >
              <Ionicons name={TYPE_ICONS[t]} size={16} color={active ? TYPE_COLORS[t] : LIGHT} />
              <Text style={{ fontSize: 10, color: active ? TYPE_COLORS[t] : LIGHT, marginTop: 2, fontWeight: active ? '600' : '400' }}>
                {t.charAt(0).toUpperCase() + t.slice(0, 4)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Location */}
      <TextInput
        value={activity.locationName}
        onChangeText={(v) => onChange('locationName', v)}
        placeholder="Location name"
        placeholderTextColor={LIGHT}
        style={{
          backgroundColor: BG,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: TEXT,
          borderWidth: 1,
          borderColor: BORDER,
        }}
      />

      {/* Duration + Cost row */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={activity.duration}
          onChangeText={(v) => onChange('duration', v)}
          placeholder="Duration (e.g. 2 hours)"
          placeholderTextColor={LIGHT}
          style={{
            flex: 1,
            backgroundColor: BG,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: TEXT,
            borderWidth: 1,
            borderColor: BORDER,
          }}
        />
        <TextInput
          value={activity.estimatedCost}
          onChangeText={(v) => onChange('estimatedCost', v)}
          placeholder="Cost (e.g. $20)"
          placeholderTextColor={LIGHT}
          style={{
            flex: 1,
            backgroundColor: BG,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: TEXT,
            borderWidth: 1,
            borderColor: BORDER,
          }}
        />
      </View>

      {/* Description */}
      <TextInput
        value={activity.description}
        onChangeText={(v) => onChange('description', v)}
        placeholder="Description"
        placeholderTextColor={LIGHT}
        multiline
        style={{
          backgroundColor: BG,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: TEXT,
          borderWidth: 1,
          borderColor: BORDER,
          minHeight: 72,
          textAlignVertical: 'top',
        }}
      />

      {/* Tips */}
      <TextInput
        value={activity.tips}
        onChangeText={(v) => onChange('tips', v)}
        placeholder="Tips (optional)"
        placeholderTextColor={LIGHT}
        multiline
        style={{
          backgroundColor: BG,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: TEXT,
          borderWidth: 1,
          borderColor: BORDER,
          minHeight: 56,
          textAlignVertical: 'top',
        }}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TripEditScreen() {
  const { tripId, slug } = useLocalSearchParams<{ tripId: string; slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDayNum, setEditingDayNum] = useState<number | null>(null);

  // Load itinerary on mount
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('trips')
        .select('itinerary')
        .eq('id', tripId)
        .single();

      if (error || !data?.itinerary) {
        Alert.alert('Error', 'Could not load trip.');
        router.back();
        return;
      }

      const itin = data.itinerary as ItineraryData;
      setDays(itin.days as Day[]);
      setLoading(false);
    }
    if (tripId) load();
  }, [tripId]);

  // ── Day operations ─────────────────────────────────────────────────────────

  function updateDayLabel(dayNum: number, label: string) {
    setDays((prev) => prev.map((d) => (d.day === dayNum ? { ...d, label } : d)));
  }

  // ── Activity operations ────────────────────────────────────────────────────

  function updateActivity(dayNum: number, id: string, field: keyof Activity, value: string | ActivityType) {
    setDays((prev) =>
      prev.map((d) =>
        d.day !== dayNum
          ? d
          : { ...d, activities: d.activities.map((a) => (a.id === id ? { ...a, [field]: value } : a)) },
      ),
    );
  }

  function deleteActivity(dayNum: number, id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove activity?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (expandedId === id) setExpandedId(null);
          setDays((prev) =>
            prev.map((d) =>
              d.day !== dayNum ? d : { ...d, activities: d.activities.filter((a) => a.id !== id) },
            ),
          );
        },
      },
    ]);
  }

  function moveActivity(dayNum: number, id: string, dir: 'up' | 'down') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== dayNum) return d;
        const arr = [...d.activities];
        const idx = arr.findIndex((a) => a.id === id);
        const swap = dir === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= arr.length) return d;
        [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
        return { ...d, activities: arr };
      }),
    );
  }

  function addActivity(dayNum: number) {
    const id = newActivityId();
    const blank: Activity = {
      id,
      name: '',
      description: '',
      locationName: '',
      coordinates: { lat: 0, lng: 0 },
      duration: '',
      type: 'activity',
      estimatedCost: '',
      tips: '',
    };
    setDays((prev) =>
      prev.map((d) => (d.day !== dayNum ? d : { ...d, activities: [...d.activities, blank] })),
    );
    setExpandedId(id);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    // Basic validation — every activity must have a name
    for (const d of days) {
      for (const a of d.activities) {
        if (!a.name.trim()) {
          Alert.alert('Missing name', `One or more activities on Day ${d.day} has no name.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Rebuild a minimal ItineraryData to merge back with the stored one
      const { data } = await supabase.from('trips').select('itinerary').eq('id', tripId).single();
      const base = (data?.itinerary ?? {}) as ItineraryData;
      const updated: ItineraryData = { ...base, days: days as ItineraryData['days'] };

      await updateTripItinerary(tripId, updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: CARD,
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>

        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: TEXT }}>Edit Itinerary</Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: TEAL,
            paddingHorizontal: 18,
            paddingVertical: 8,
            borderRadius: 20,
            opacity: saving ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {days.map((day) => (
          <View key={day.day} style={{ marginTop: 16 }}>
            {/* Day header */}
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: TEAL,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>{day.day}</Text>
              </View>

              {editingDayNum === day.day ? (
                <TextInput
                  value={day.label}
                  onChangeText={(v) => updateDayLabel(day.day, v)}
                  onBlur={() => setEditingDayNum(null)}
                  onSubmitEditing={() => setEditingDayNum(null)}
                  autoFocus
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: '600',
                    color: TEXT,
                    borderBottomWidth: 1,
                    borderBottomColor: TEAL,
                    paddingVertical: 2,
                  }}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingDayNum(day.day)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: TEXT }}>{day.label}</Text>
                  <Ionicons name="pencil-outline" size={13} color={LIGHT} />
                </TouchableOpacity>
              )}
            </View>

            {/* Activities */}
            <View style={{ marginHorizontal: 16, gap: 8 }}>
              {day.activities.map((activity, idx) => {
                const isExpanded = expandedId === activity.id;
                const color = TYPE_COLORS[activity.type] ?? TEAL;

                return (
                  <View
                    key={activity.id}
                    style={{
                      backgroundColor: CARD,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isExpanded ? TEAL + '50' : BORDER,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Activity row */}
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setExpandedId(isExpanded ? null : activity.id);
                      }}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        gap: 10,
                      }}
                    >
                      {/* Type icon badge */}
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          backgroundColor: color + '18',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Ionicons name={TYPE_ICONS[activity.type]} size={16} color={color} />
                      </View>

                      {/* Name + location */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: '600', color: TEXT }}
                          numberOfLines={1}
                        >
                          {activity.name || 'Untitled activity'}
                        </Text>
                        {!!activity.duration && (
                          <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{activity.duration}</Text>
                        )}
                      </View>

                      {/* Reorder + expand */}
                      {!isExpanded && (
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                          <TouchableOpacity
                            onPress={() => moveActivity(day.day, activity.id, 'up')}
                            disabled={idx === 0}
                            style={{
                              width: 30,
                              height: 30,
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: idx === 0 ? 0.25 : 1,
                            }}
                          >
                            <Ionicons name="chevron-up" size={18} color={MUTED} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => moveActivity(day.day, activity.id, 'down')}
                            disabled={idx === day.activities.length - 1}
                            style={{
                              width: 30,
                              height: 30,
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: idx === day.activities.length - 1 ? 0.25 : 1,
                            }}
                          >
                            <Ionicons name="chevron-down" size={18} color={MUTED} />
                          </TouchableOpacity>
                        </View>
                      )}

                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'create-outline'}
                        size={16}
                        color={isExpanded ? TEAL : LIGHT}
                      />
                    </TouchableOpacity>

                    {/* Expanded editor */}
                    {isExpanded && (
                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingBottom: 12,
                          borderTopWidth: 1,
                          borderTopColor: BORDER,
                        }}
                      >
                        <ActivityEditor
                          activity={activity}
                          onChange={(field, value) =>
                            updateActivity(day.day, activity.id, field, value as string)
                          }
                        />

                        {/* Delete */}
                        <TouchableOpacity
                          onPress={() => deleteActivity(day.day, activity.id)}
                          style={{
                            marginTop: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            alignSelf: 'flex-start',
                            paddingVertical: 6,
                          }}
                        >
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '500' }}>
                            Remove activity
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Add activity */}
              <TouchableOpacity
                onPress={() => addActivity(day.day)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: TEAL + '40',
                  borderStyle: 'dashed',
                  backgroundColor: TEAL + '08',
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color={TEAL} />
                <Text style={{ fontSize: 14, color: TEAL, fontWeight: '600' }}>Add activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Bottom hint */}
        <Text
          style={{
            textAlign: 'center',
            color: LIGHT,
            fontSize: 12,
            marginTop: 24,
            marginHorizontal: 32,
          }}
        >
          Tap an activity to edit details. Use the arrows to reorder within a day.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
