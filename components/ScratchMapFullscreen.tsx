import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ScratchMap, { ScratchMapReadonly } from './ScratchMap';
import { countContinents, calculateWorldPercentage, COUNTRY_DATA } from '../lib/countryUtils';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface CountryResult {
  code: string;
  name: string;
  flag: string;
}

interface ScratchMapFullscreenProps {
  visible: boolean;
  onClose: () => void;
  visitedCodes: string[];
  onToggleCountry?: (isoCode: string, nowVisited: boolean) => void;
  onRemoveAll?: () => void;
  interactive?: boolean;
  ownerName?: string;
}

// ─── Country search result row ────────────────────────────────────────────────
function CountryRow({
  item,
  isVisited,
  onToggle,
}: {
  item: CountryResult;
  isVisited: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <Text style={{ fontSize: 22, marginRight: 12 }}>{item.flag}</Text>
      <Text style={{ flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: 15 }}>
        {item.name}
      </Text>
      {isVisited ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(13,148,136,0.15)',
            borderRadius: 8,
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: 'rgba(20,184,166,0.3)',
          }}
        >
          <Ionicons name="checkmark" size={13} color="#0D9488" />
          <Text style={{ color: '#0D9488', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
            Visited
          </Text>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 8,
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Ionicons name="add" size={13} color="rgba(255,255,255,0.6)" />
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
            Add
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ScratchMapFullscreen({
  visible,
  onClose,
  visitedCodes,
  onToggleCountry,
  onRemoveAll,
  interactive = true,
  ownerName,
}: ScratchMapFullscreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const visitedSet = useMemo(() => new Set(visitedCodes), [visitedCodes]);
  const continents = countContinents(visitedCodes);
  const worldPct = calculateWorldPercentage(visitedCodes);

  // Search results — filtered + sorted (visited first, then alpha)
  const searchResults = useMemo<CountryResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: CountryResult[] = [];
    for (const [code, info] of Object.entries(COUNTRY_DATA)) {
      if (info.name.toLowerCase().includes(q)) {
        results.push({ code, name: info.name, flag: info.flag });
      }
    }
    results.sort((a, b) => {
      const aV = visitedSet.has(a.code) ? 0 : 1;
      const bV = visitedSet.has(b.code) ? 0 : 1;
      if (aV !== bV) return aV - bV;
      return a.name.localeCompare(b.name);
    });
    return results.slice(0, 8);
  }, [query, visitedSet]);

  const handleToggle = (code: string) => {
    if (!onToggleCountry) return;
    const nowVisited = !visitedSet.has(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleCountry(code, nowVisited);
  };

  const mapHeight = SCREEN_H - insets.top - insets.bottom - 160; // header + stats

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#0a0a1a' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Header ── */}
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingHorizontal: 16,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <View>
            {ownerName ? (
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                {ownerName}'s travel map
              </Text>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                Your scratch map
              </Text>
            )}
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginTop: 2 }}>
              {visitedCodes.length} {visitedCodes.length === 1 ? 'Country' : 'Countries'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* ── Map ── */}
        <Pressable style={{ flex: 1, justifyContent: 'center' }} onPress={() => Keyboard.dismiss()}>
          {interactive && onToggleCountry ? (
            <ScratchMap
              visitedCodes={visitedCodes}
              onToggleCountry={onToggleCountry}
              interactive={false}
              width={SCREEN_W}
              height={mapHeight}
            />
          ) : (
            <ScratchMapReadonly
              visitedCodes={visitedCodes}
              width={SCREEN_W}
              height={mapHeight}
            />
          )}
        </Pressable>

        {/* ── Search section (only for interactive / own map) ── */}
        {interactive && onToggleCountry && (
          <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
            {/* Search input row + trash button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginVertical: 12, gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  backgroundColor: '#1e2035',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  height: 44,
                }}
              >
                <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
                <TextInput
                  ref={inputRef}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search countries to add or remove…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{ flex: 1, color: 'white', fontSize: 15 }}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.35)" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Remove all button — only shown when there are visited countries */}
              {onRemoveAll && visitedCodes.length > 0 && (
                <TouchableOpacity
                  onPress={() => setConfirmRemoveAll(true)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>

            {/* Results list */}
            {searchResults.length > 0 && (
              <View
                style={{
                  maxHeight: 220,
                  backgroundColor: '#12132a',
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <FlatList
                  data={searchResults}
                  keyExtractor={item => item.code}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <CountryRow
                      item={item}
                      isVisited={visitedSet.has(item.code)}
                      onToggle={() => handleToggle(item.code)}
                    />
                  )}
                />
              </View>
            )}

            {query.length > 0 && searchResults.length === 0 && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  No countries found for "{query}"
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Stats bar ── */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            paddingVertical: 14,
            paddingBottom: insets.bottom + 14,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {[
            { value: visitedCodes.length, label: 'Countries' },
            { value: continents, label: 'Continents' },
            { value: `${worldPct}%`, label: 'of World' },
          ].map((s, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: '#0D9488', fontSize: 22, fontWeight: '800' }}>
                {s.value}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      </KeyboardAvoidingView>

      {/* ── Remove-all confirmation sheet ── */}
      <Modal
        visible={confirmRemoveAll}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmRemoveAll(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
          onPress={() => setConfirmRemoveAll(false)}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: '#12132a',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 16,
                paddingBottom: insets.bottom + 24,
                paddingHorizontal: 24,
                borderTopWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              {/* Drag handle */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 24 }} />

              {/* Icon */}
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' }}>
                  <Ionicons name="trash-outline" size={26} color="#ef4444" />
                </View>
              </View>

              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                Remove all countries?
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
                This will remove all {visitedCodes.length} {visitedCodes.length === 1 ? 'country' : 'countries'} from your scratch map. This cannot be undone.
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setConfirmRemoveAll(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  onRemoveAll?.();
                }}
                style={{
                  backgroundColor: 'rgba(239,68,68,0.12)',
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.3)',
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700' }}>
                  Yes, remove all
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setConfirmRemoveAll(false)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
