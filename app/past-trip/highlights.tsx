import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { generateHighlights } from '../../lib/api/highlights';

const TEAL = '#0D9488';
const BG = '#0a0a1a';
const MAX_HIGHLIGHTS = 8;
const STEP_DOTS = [1, 2, 3, 4, 5];

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

// Generate preset highlight suggestions based on destination and mood tags
function generateSuggestions(destination: string, moodTags: string[]): string[] {
  const dest = destination.split(',')[0];
  const suggestions: string[] = [];

  if (moodTags.includes('Food lover')) {
    suggestions.push(`Local food scene in ${dest}`, 'Street food markets', 'Trying regional specialties');
  }
  if (moodTags.includes('Adventurous')) {
    suggestions.push('Hiking & outdoor adventures', 'Scenic viewpoints', 'Off-the-beaten-path discoveries');
  }
  if (moodTags.includes('Relaxing')) {
    suggestions.push('Beach & waterfront time', 'Sunsets & golden hours', 'Peaceful morning walks');
  }
  if (moodTags.includes('Cultural')) {
    suggestions.push(`${dest} historical landmarks`, 'Local museums & galleries', 'Traditional festivals & events');
  }
  if (moodTags.includes('Luxury')) {
    suggestions.push('Luxury accommodation', 'Fine dining experiences', 'Spa & wellness');
  }
  if (moodTags.includes('Romantic')) {
    suggestions.push('Romantic dinners', 'Scenic walks together', 'Couples activities');
  }
  if (moodTags.includes('Family')) {
    suggestions.push('Family-friendly attractions', 'Kid-friendly activities', 'Parks & outdoor spaces');
  }
  if (moodTags.includes('Solo')) {
    suggestions.push('Solo exploration days', 'Meeting locals', 'Personal adventure');
  }
  if (moodTags.includes('With Friends')) {
    suggestions.push('Group activities', 'Nightlife & social scene', 'Shared experiences');
  }

  // Generic fallbacks
  suggestions.push(`${dest} city center`, 'Hidden local gems', 'Day trips & excursions');

  // Deduplicate and cap
  return [...new Set(suggestions)].slice(0, MAX_HIGHLIGHTS);
}

export default function PastTripHighlights() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  function toggleHighlight(h: string) {
    setSelected((prev) => {
      if (prev.includes(h)) return prev.filter((x) => x !== h);
      if (prev.length >= MAX_HIGHLIGHTS) return prev;
      return [...prev, h];
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const aiHighlights = await generateHighlights(
        pastTripDraft.destination,
        pastTripDraft.moodTags,
      );
      setSuggestions(aiHighlights);
      setGenerated(true);
    } catch {
      // Fall back to local presets so the user isn't blocked
      const presets = generateSuggestions(pastTripDraft.destination, pastTripDraft.moodTags);
      setSuggestions(presets);
      setGenerated(true);
      setGenerateError('AI unavailable — showing suggestions based on your travel style.');
    } finally {
      setGenerating(false);
    }
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (!trimmed || selected.length >= MAX_HIGHLIGHTS) return;
    if (!selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
    }
    setCustom('');
  }

  function handleContinue() {
    pastTripDraft.highlights = selected;
    router.push('/past-trip/cover');
  }

  const availableSuggestions = suggestions.filter((s) => !selected.includes(s));

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
            <ProgressDots step={4} />
            <View style={{ width: 36 }} />
          </View>

          <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
            Trip highlights
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, marginTop: 6 }}>
            Optional — up to {MAX_HIGHLIGHTS} highlights
          </Text>
        </View>

        {/* Generate with AI button */}
        {!generated && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={generating}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: `${TEAL}20`,
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                borderWidth: 1.5, borderColor: TEAL,
              }}
            >
              {generating ? (
                <ActivityIndicator size="small" color={TEAL} />
              ) : (
                <Text style={{ fontSize: 18 }}>✨</Text>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: TEAL, fontSize: 15, fontWeight: '700' }}>
                  {generating ? 'Generating highlights...' : 'Generate highlights with AI'}
                </Text>
                {!generating && (
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                    Based on {pastTripDraft.destination} and your travel style
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* AI fallback notice */}
        {generateError && (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{generateError}</Text>
          </View>
        )}

        {/* Suggested highlights */}
        {availableSuggestions.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Suggestions — tap to add
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {availableSuggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleHighlight(s)}
                  disabled={selected.length >= MAX_HIGHLIGHTS}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
                    opacity: selected.length >= MAX_HIGHLIGHTS ? 0.4 : 1,
                  }}
                >
                  <Ionicons name="add" size={13} color="rgba(255,255,255,0.5)" />
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Added highlights */}
        {selected.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
                Added
              </Text>
              <Text style={{ color: selected.length >= MAX_HIGHLIGHTS ? '#ef4444' : TEAL, fontSize: 12, fontWeight: '600' }}>
                {selected.length} / {MAX_HIGHLIGHTS}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {selected.map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => toggleHighlight(h)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: `${TEAL}20`,
                    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
                    borderWidth: 1.5, borderColor: TEAL,
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>{h}</Text>
                  <Ionicons name="close" size={13} color={TEAL} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Manual add */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Add your own
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={custom}
              onChangeText={setCustom}
              onSubmitEditing={addCustom}
              placeholder="e.g. Sunrise at Angkor Wat"
              placeholderTextColor="rgba(255,255,255,0.25)"
              returnKeyType="done"
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                color: 'white', fontSize: 14,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
              }}
            />
            <TouchableOpacity
              onPress={addCustom}
              disabled={!custom.trim() || selected.length >= MAX_HIGHLIGHTS}
              style={{
                width: 46, borderRadius: 12,
                backgroundColor: custom.trim() && selected.length < MAX_HIGHLIGHTS ? TEAL : 'rgba(255,255,255,0.1)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="add" size={22} color="white" />
            </TouchableOpacity>
          </View>
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
            {selected.length > 0 ? `Continue with ${selected.length} highlights →` : 'Skip for now →'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
