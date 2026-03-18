import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { pastTripDraft } from '../../lib/pastTripDraft';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const NOTE_MAX = 200;
const STEP_DOTS = [1, 2, 3, 4, 5];

const RATING_LABELS: Record<number, string> = {
  1: 'Disappointing',
  2: 'It was okay',
  3: 'Good',
  4: 'Amazing',
  5: 'Life changing ✨',
};

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

export default function PastTripExperience() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');

  function toggleTag(label: string) {
    setSelectedTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    );
  }

  function handleContinue() {
    pastTripDraft.rating = rating;
    pastTripDraft.moodTags = selectedTags;
    pastTripDraft.note = note;
    router.push('/past-trip/highlights');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
            <ProgressDots step={3} />
            <View style={{ width: 36 }} />
          </View>

          <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
            How was it?
          </Text>
          {pastTripDraft.destination ? (
            <Text style={{ color: TEAL, fontSize: 15, marginTop: 6, fontWeight: '600' }}>
              {pastTripDraft.destination}
            </Text>
          ) : null}
        </View>

        {/* Star rating */}
        <View style={{ paddingHorizontal: 16, marginBottom: 32 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
            Overall rating
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={38}
                  color={n <= rating ? '#f59e0b' : 'rgba(255,255,255,0.25)'}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={{ color: '#f59e0b', fontSize: 15, fontWeight: '600' }}>
              {RATING_LABELS[rating]}
            </Text>
          )}
        </View>

        {/* Mood tags */}
        <View style={{ paddingHorizontal: 16, marginBottom: 32 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
            Mood — select all that apply
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MOOD_TAGS.map((tag) => {
              const active = selectedTags.includes(tag.label);
              return (
                <TouchableOpacity
                  key={tag.label}
                  onPress={() => toggleTag(tag.label)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: active ? `${TEAL}20` : 'rgba(255,255,255,0.06)',
                    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
                    borderWidth: 1.5,
                    borderColor: active ? TEAL : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{tag.emoji}</Text>
                  <Text style={{ color: active ? TEAL : 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: active ? '700' : '400' }}>
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Note */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Add a note (optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={(t) => setNote(t.slice(0, NOTE_MAX))}
            placeholder="What made this trip special?"
            placeholderTextColor="rgba(255,255,255,0.25)"
            multiline
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 14, padding: 14, color: 'white',
              fontSize: 15, minHeight: 100, textAlignVertical: 'top',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
            }}
          />
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'right', marginTop: 6 }}>
            {note.length} / {NOTE_MAX}
          </Text>
        </View>
      </ScrollView>

      {/* Continue button */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 20, left: 16, right: 16 }}>
        <TouchableOpacity
          onPress={handleContinue}
          activeOpacity={0.85}
          style={{
            backgroundColor: TEAL,
            borderRadius: 16, paddingVertical: 18, alignItems: 'center',
            shadowColor: TEAL,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
          }}
        >
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>
            Continue →
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
