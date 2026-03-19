import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
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
const DANGER = '#EF4444';

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

// ─── "Move to Day" picker modal ──────────────────────────────────────────────

function MoveToDayModal({
  visible,
  days,
  currentDay,
  onSelect,
  onClose,
}: {
  visible: boolean;
  days: Day[];
  currentDay: number;
  onSelect: (targetDay: number) => void;
  onClose: () => void;
}) {
  const otherDays = days.filter((d) => d.day !== currentDay);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 20,
              padding: 20,
              width: 280,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 4 }}>
              Move to Day
            </Text>
            <Text style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>
              Select which day to move this activity to
            </Text>

            {otherDays.map((d) => (
              <TouchableOpacity
                key={d.day}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(d.day);
                }}
                activeOpacity={0.65}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  marginBottom: 4,
                  backgroundColor: BG,
                  gap: 10,
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
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>{d.day}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: TEXT, flex: 1 }} numberOfLines={1}>
                  {d.label}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={LIGHT} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{ alignItems: 'center', paddingTop: 12 }}
            >
              <Text style={{ color: MUTED, fontSize: 14, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
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
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDayNum, setEditingDayNum] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDestination, setEditingDestination] = useState(false);

  // Move-to-day modal state
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [moveActivityData, setMoveActivityData] = useState<{ dayNum: number; activityId: string } | null>(null);

  // AI suggest state
  const [suggestingForDay, setSuggestingForDay] = useState<number | null>(null);
  const [suggestType, setSuggestType] = useState<ActivityType>('activity');
  const [showSuggestPicker, setShowSuggestPicker] = useState(false);
  const [suggestPickerDay, setSuggestPickerDay] = useState<number>(0);

  // Dirty state tracking for unsaved changes warning
  const isDirty = useRef(false);
  const hasSaved = useRef(false);

  function markDirty() {
    isDirty.current = true;
  }

  function confirmDiscard(onDiscard: () => void) {
    if (!isDirty.current || hasSaved.current) {
      onDiscard();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Discard changes?',
      'You have unsaved edits. Are you sure you want to go back?',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onDiscard },
      ],
    );
  }

  // Intercept Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isDirty.current && !hasSaved.current) {
        confirmDiscard(() => router.back());
        return true; // prevent default
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // Load itinerary on mount
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('trips')
        .select('itinerary, title')
        .eq('id', tripId)
        .single();

      if (error || !data?.itinerary) {
        Alert.alert('Error', 'Could not load trip.');
        router.back();
        return;
      }

      const itin = data.itinerary as ItineraryData;
      setDays(itin.days as Day[]);
      setTitle(itin.title ?? data.title ?? '');
      setDestination(itin.destination ?? '');
      setLoading(false);
    }
    if (tripId) load();
  }, [tripId]);

  // ── Day operations ─────────────────────────────────────────────────────────

  function updateDayLabel(dayNum: number, label: string) {
    markDirty();
    setDays((prev) => prev.map((d) => (d.day === dayNum ? { ...d, label } : d)));
  }

  function addDay() {
    markDirty();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextNum = days.length > 0 ? Math.max(...days.map((d) => d.day)) + 1 : 1;
    setDays((prev) => [
      ...prev,
      { day: nextNum, label: `Day ${nextNum}`, activities: [] },
    ]);
  }

  function removeDay(dayNum: number) {
    const day = days.find((d) => d.day === dayNum);
    const actCount = day?.activities.length ?? 0;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Remove Day ${dayNum}?`,
      actCount > 0
        ? `This will also remove ${actCount} activit${actCount === 1 ? 'y' : 'ies'}.`
        : 'This empty day will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Remove the day and renumber remaining days
            setDays((prev) => {
              const filtered = prev.filter((d) => d.day !== dayNum);
              return filtered.map((d, i) => ({
                ...d,
                day: i + 1,
                label: d.label.match(/^Day \d+$/) ? `Day ${i + 1}` : d.label,
              }));
            });
          },
        },
      ],
    );
  }

  // ── Activity operations ────────────────────────────────────────────────────

  function updateActivity(dayNum: number, id: string, field: keyof Activity, value: string | ActivityType) {
    markDirty();
    setDays((prev) =>
      prev.map((d) =>
        d.day !== dayNum
          ? d
          : { ...d, activities: d.activities.map((a) => (a.id === id ? { ...a, [field]: value } : a)) },
      ),
    );
  }

  function deleteActivity(dayNum: number, id: string) {
    markDirty();
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
    markDirty();
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

  function moveActivityToDay(fromDay: number, activityId: string, toDay: number) {
    markDirty();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDays((prev) => {
      let movedActivity: Activity | null = null;
      // Remove from source day
      const afterRemove = prev.map((d) => {
        if (d.day !== fromDay) return d;
        const idx = d.activities.findIndex((a) => a.id === activityId);
        if (idx >= 0) movedActivity = d.activities[idx];
        return { ...d, activities: d.activities.filter((a) => a.id !== activityId) };
      });
      if (!movedActivity) return prev;
      // Add to target day
      return afterRemove.map((d) => {
        if (d.day !== toDay) return d;
        return { ...d, activities: [...d.activities, movedActivity!] };
      });
    });
    if (expandedId === activityId) setExpandedId(null);
  }

  function openMoveModal(dayNum: number, activityId: string) {
    setMoveActivityData({ dayNum, activityId });
    setMoveModalVisible(true);
  }

  function addActivity(dayNum: number) {
    markDirty();
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

  function duplicateActivity(dayNum: number, activityId: string) {
    markDirty();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDays((prev) =>
      prev.map((d) => {
        if (d.day !== dayNum) return d;
        const idx = d.activities.findIndex((a) => a.id === activityId);
        if (idx < 0) return d;
        const original = d.activities[idx];
        const copy: Activity = {
          ...original,
          id: newActivityId(),
          name: original.name + ' (copy)',
        };
        const updated = [...d.activities];
        updated.splice(idx + 1, 0, copy);
        return { ...d, activities: updated };
      }),
    );
  }

  async function suggestActivity(dayNum: number, type: ActivityType) {
    if (!destination.trim()) {
      Alert.alert('No destination', 'Please set a destination first so AI can suggest activities.');
      return;
    }

    setSuggestingForDay(dayNum);
    try {
      const day = days.find((d) => d.day === dayNum);
      const existingNames = day?.activities.map((a) => a.name).filter(Boolean) ?? [];

      const { data, error } = await supabase.functions.invoke('suggest-activity', {
        body: {
          destination: destination.trim(),
          activityType: type,
          existingActivities: existingNames,
          dayLabel: day?.label ?? `Day ${dayNum}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const id = newActivityId();
      const suggested: Activity = {
        id,
        name: data.name ?? '',
        description: data.description ?? '',
        locationName: data.locationName ?? '',
        coordinates: { lat: 0, lng: 0 },
        duration: data.duration ?? '',
        type: (data.type as ActivityType) ?? type,
        estimatedCost: data.estimatedCost ?? '',
        tips: data.tips ?? '',
      };

      markDirty();
      setDays((prev) =>
        prev.map((d) => (d.day !== dayNum ? d : { ...d, activities: [...d.activities, suggested] })),
      );
      setExpandedId(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('AI Suggestion Failed', e?.message ?? 'Could not generate suggestion. Try again.');
    } finally {
      setSuggestingForDay(null);
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a trip title.');
      return;
    }

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
      // Rebuild ItineraryData to merge with the stored one
      const { data } = await supabase.from('trips').select('itinerary').eq('id', tripId).single();
      const base = (data?.itinerary ?? {}) as ItineraryData;
      const updated: ItineraryData = {
        ...base,
        title: title.trim(),
        destination: destination.trim(),
        totalDays: days.length,
        days: days as ItineraryData['days'],
      };

      await updateTripItinerary(tripId, updated);

      // Also update the top-level title column on trips table
      await supabase.from('trips').update({ title: title.trim() }).eq('id', tripId);

      hasSaved.current = true;
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
          onPress={() => confirmDiscard(() => router.back())}
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
        {/* ── Trip title & destination ── */}
        <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 12 }}>
          {/* Title */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
              Trip Title
            </Text>
            {editingTitle ? (
              <TextInput
                value={title}
                onChangeText={(v) => { markDirty(); setTitle(v); }}
                onBlur={() => setEditingTitle(false)}
                onSubmitEditing={() => setEditingTitle(false)}
                autoFocus
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: TEXT,
                  borderBottomWidth: 1.5,
                  borderBottomColor: TEAL,
                  paddingVertical: 4,
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={() => setEditingTitle(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: TEXT, flex: 1 }} numberOfLines={2}>
                  {title || 'Untitled Trip'}
                </Text>
                <Ionicons name="pencil-outline" size={15} color={LIGHT} />
              </TouchableOpacity>
            )}
          </View>

          {/* Destination */}
          <View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
              Destination
            </Text>
            {editingDestination ? (
              <TextInput
                value={destination}
                onChangeText={(v) => { markDirty(); setDestination(v); }}
                onBlur={() => setEditingDestination(false)}
                onSubmitEditing={() => setEditingDestination(false)}
                autoFocus
                style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: TEXT,
                  borderBottomWidth: 1.5,
                  borderBottomColor: TEAL,
                  paddingVertical: 4,
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={() => setEditingDestination(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="location-outline" size={16} color={TEAL} />
                <Text style={{ fontSize: 15, fontWeight: '500', color: MUTED, flex: 1 }} numberOfLines={1}>
                  {destination || 'Add destination'}
                </Text>
                <Ionicons name="pencil-outline" size={13} color={LIGHT} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Days ── */}
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

              {/* Remove day button */}
              {days.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeDay(day.day)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: DANGER + '10',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={16} color={DANGER} />
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

                      {/* Name + duration */}
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

                        {/* Action buttons */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 12, gap: 6 }}>
                          {/* Move to day */}
                          {days.length > 1 && (
                            <TouchableOpacity
                              onPress={() => openMoveModal(day.day, activity.id)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                borderRadius: 8,
                                backgroundColor: TEAL + '10',
                              }}
                            >
                              <Ionicons name="swap-horizontal-outline" size={14} color={TEAL} />
                              <Text style={{ color: TEAL, fontSize: 12, fontWeight: '600' }}>Move</Text>
                            </TouchableOpacity>
                          )}

                          {/* Duplicate */}
                          <TouchableOpacity
                            onPress={() => duplicateActivity(day.day, activity.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 8,
                              backgroundColor: '#8B5CF6' + '10',
                            }}
                          >
                            <Ionicons name="copy-outline" size={14} color="#8B5CF6" />
                            <Text style={{ color: '#8B5CF6', fontSize: 12, fontWeight: '600' }}>Duplicate</Text>
                          </TouchableOpacity>

                          <View style={{ flex: 1 }} />

                          {/* Delete */}
                          <TouchableOpacity
                            onPress={() => deleteActivity(day.day, activity.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingVertical: 6,
                              paddingHorizontal: 10,
                              borderRadius: 8,
                              backgroundColor: DANGER + '10',
                            }}
                          >
                            <Ionicons name="trash-outline" size={14} color={DANGER} />
                            <Text style={{ color: DANGER, fontSize: 12, fontWeight: '600' }}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Add activity buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => addActivity(day.day)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: TEAL + '40',
                    borderStyle: 'dashed',
                    backgroundColor: TEAL + '08',
                  }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={TEAL} />
                  <Text style={{ fontSize: 13, color: TEAL, fontWeight: '600' }}>Add blank</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSuggestPickerDay(day.day);
                    setShowSuggestPicker(true);
                  }}
                  disabled={suggestingForDay === day.day}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: '#8B5CF6' + '40',
                    borderStyle: 'dashed',
                    backgroundColor: '#8B5CF6' + '08',
                    opacity: suggestingForDay === day.day ? 0.5 : 1,
                  }}
                >
                  {suggestingForDay === day.day ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#8B5CF6" />
                      <Text style={{ fontSize: 13, color: '#8B5CF6', fontWeight: '600' }}>AI suggest</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {/* ── Add day button ── */}
        <TouchableOpacity
          onPress={addDay}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginHorizontal: 16,
            marginTop: 20,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: TEAL + '40',
            borderStyle: 'dashed',
            backgroundColor: TEAL + '06',
          }}
        >
          <Ionicons name="calendar-outline" size={18} color={TEAL} />
          <Text style={{ fontSize: 14, color: TEAL, fontWeight: '600' }}>Add Day {days.length + 1}</Text>
        </TouchableOpacity>

        {/* Bottom hint */}
        <Text
          style={{
            textAlign: 'center',
            color: LIGHT,
            fontSize: 12,
            marginTop: 20,
            marginHorizontal: 32,
            lineHeight: 18,
          }}
        >
          Tap an activity to edit details. Use arrows to reorder, or move activities between days.
        </Text>
      </ScrollView>

      {/* AI suggest type picker */}
      <Modal visible={showSuggestPicker} transparent animationType="fade" onRequestClose={() => setShowSuggestPicker(false)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSuggestPicker(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View
              style={{
                backgroundColor: CARD,
                borderRadius: 20,
                padding: 20,
                width: 280,
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name="sparkles" size={20} color="#8B5CF6" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: TEXT }}>AI Suggest</Text>
              </View>
              <Text style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>
                What type of activity should AI suggest?
              </Text>

              {(Object.keys(TYPE_ICONS) as ActivityType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setShowSuggestPicker(false);
                    suggestActivity(suggestPickerDay, t);
                  }}
                  activeOpacity={0.65}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: BG,
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: TYPE_COLORS[t] + '18',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={TYPE_ICONS[t]} size={16} color={TYPE_COLORS[t]} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: TEXT, flex: 1 }}>
                    {t === 'food' ? 'Restaurant / Food' : t === 'activity' ? 'Activity / Sightseeing' : t === 'accommodation' ? 'Accommodation' : 'Transport'}
                  </Text>
                  <Ionicons name="sparkles-outline" size={16} color={LIGHT} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => setShowSuggestPicker(false)}
                activeOpacity={0.7}
                style={{ alignItems: 'center', paddingTop: 12 }}
              >
                <Text style={{ color: MUTED, fontSize: 14, fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Move-to-day modal */}
      <MoveToDayModal
        visible={moveModalVisible}
        days={days}
        currentDay={moveActivityData?.dayNum ?? 0}
        onSelect={(targetDay) => {
          if (moveActivityData) {
            moveActivityToDay(moveActivityData.dayNum, moveActivityData.activityId, targetDay);
          }
          setMoveModalVisible(false);
          setMoveActivityData(null);
        }}
        onClose={() => {
          setMoveModalVisible(false);
          setMoveActivityData(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
