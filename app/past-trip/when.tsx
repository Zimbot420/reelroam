import { useState } from 'react';
import {
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { pastTripDraft } from '../../lib/pastTripDraft';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

interface DatePickerProps {
  label: string;
  selectedMonth: number | null;
  selectedYear: number | null;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
}

function DatePicker({ label, selectedMonth, selectedYear, onMonthChange, onYearChange }: DatePickerProps) {
  const currentYear = new Date().getFullYear();

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </Text>

      {/* Month row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {MONTHS.map((m, i) => (
          <TouchableOpacity
            key={m}
            onPress={() => onMonthChange(i)}
            style={{
              paddingHorizontal: 12, paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: selectedMonth === i ? TEAL : 'rgba(255,255,255,0.07)',
              borderWidth: 1,
              borderColor: selectedMonth === i ? TEAL : 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ color: selectedMonth === i ? 'white' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' }}>
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Year selector */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
        <TouchableOpacity
          onPress={() => onYearChange((selectedYear ?? currentYear) - 1)}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>
            {selectedYear ?? currentYear}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            const y = (selectedYear ?? currentYear) + 1;
            if (y <= currentYear) onYearChange(y);
          }}
          disabled={(selectedYear ?? currentYear) >= currentYear}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center', justifyContent: 'center',
            opacity: (selectedYear ?? currentYear) >= currentYear ? 0.3 : 1,
          }}
        >
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDuration(
  startMonth: number | null, startYear: number | null,
  endMonth: number | null, endYear: number | null,
  destination: string,
): string | null {
  if (startMonth === null || startYear === null) return null;

  const startLabel = `${MONTHS[startMonth]} ${startYear}`;
  const endLabel = endMonth !== null && endYear !== null ? `${MONTHS[endMonth]} ${endYear}` : null;

  if (!endLabel || (endMonth === startMonth && endYear === startYear)) {
    return startLabel;
  }

  // Calculate rough days
  const startDate = new Date(startYear, startMonth, 1);
  const endDate = new Date(endYear!, endMonth!, 1);
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return `${startLabel} – ${endLabel}  ·  ~${diffDays} days in ${destination}`;
  }
  return `${startLabel} – ${endLabel}`;
}

export default function PastTripWhen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const currentYear = new Date().getFullYear();

  const [startMonth, setStartMonth] = useState<number | null>(null);
  const [startYear, setStartYear] = useState<number | null>(currentYear);
  const [endMonth, setEndMonth] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(currentYear);
  const [approximate, setApproximate] = useState(false);

  const durationLabel = formatDuration(startMonth, startYear, endMonth, endYear, pastTripDraft.destination);
  const canContinue = startMonth !== null && startYear !== null;

  function handleContinue() {
    pastTripDraft.startMonth = startMonth;
    pastTripDraft.startYear = startYear;
    // When approximate, there's no "end" — don't save the defaulted year
    pastTripDraft.endMonth = approximate ? null : endMonth;
    pastTripDraft.endYear = approximate ? null : endYear;
    pastTripDraft.approximateDates = approximate;
    router.push('/past-trip/experience');
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
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
            <ProgressDots step={2} />
            <View style={{ width: 36 }} />
          </View>

          <Text style={{ color: 'white', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
            When did{'\n'}you go?
          </Text>
          {pastTripDraft.destination ? (
            <Text style={{ color: TEAL, fontSize: 15, marginTop: 6, fontWeight: '600' }}>
              {pastTripDraft.destination}
            </Text>
          ) : null}
        </View>

        {/* Approximate toggle */}
        <View
          style={{
            marginHorizontal: 16, marginBottom: 24,
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Text style={{ flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            I'm not sure of the exact dates
          </Text>
          <Switch
            value={approximate}
            onValueChange={setApproximate}
            trackColor={{ false: 'rgba(255,255,255,0.15)', true: TEAL }}
            thumbColor="white"
          />
        </View>

        {/* Date pickers */}
        <View style={{ paddingHorizontal: 16 }}>
          <DatePicker
            label={approximate ? 'Approximate month & year' : 'Start (month & year)'}
            selectedMonth={startMonth}
            selectedYear={startYear}
            onMonthChange={setStartMonth}
            onYearChange={setStartYear}
          />

          {!approximate && (
            <DatePicker
              label="End (month & year)"
              selectedMonth={endMonth}
              selectedYear={endYear}
              onMonthChange={setEndMonth}
              onYearChange={setEndYear}
            />
          )}
        </View>

        {/* Duration display */}
        {durationLabel && (
          <View
            style={{
              marginHorizontal: 16, marginTop: 8,
              backgroundColor: `${TEAL}15`,
              borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: `${TEAL}30`,
              flexDirection: 'row', alignItems: 'center', gap: 8,
            }}
          >
            <Text style={{ fontSize: 18 }}>📅</Text>
            <Text style={{ color: TEAL, fontSize: 14, fontWeight: '600', flex: 1 }}>
              {durationLabel}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Continue button */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 20, left: 16, right: 16 }}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
          style={{
            backgroundColor: canContinue ? TEAL : 'rgba(255,255,255,0.1)',
            borderRadius: 16, paddingVertical: 18, alignItems: 'center',
            shadowColor: canContinue ? TEAL : 'transparent',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
          }}
        >
          <Text style={{ color: canContinue ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 17, fontWeight: '700' }}>
            Continue →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
