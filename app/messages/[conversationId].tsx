import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  supabase,
  getMessages,
  sendMessage,
  markConversationRead,
  Message,
} from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

function timeStr(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Trip card embed in chat ─────────────────────────────────────────────────

function TripEmbed({ slug, onPress }: { slug: string; onPress: () => void }) {
  const [trip, setTrip] = useState<any>(null);

  useEffect(() => {
    supabase.from('trips').select('title, itinerary, share_slug').eq('share_slug', slug).maybeSingle()
      .then(({ data }) => { if (data) setTrip(data); });
  }, [slug]);

  if (!trip) return (
    <TouchableOpacity onPress={onPress} style={{ padding: 10 }}>
      <Text style={{ color: TEAL, fontSize: 13 }}>View trip</Text>
    </TouchableOpacity>
  );

  const dest = trip.itinerary?.destination ?? '';
  const days = trip.itinerary?.totalDays ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: 'rgba(13,148,136,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(13,148,136,0.2)',
        borderRadius: 12,
        padding: 12,
        gap: 4,
        marginTop: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="map" size={14} color={TEAL} />
        <Text style={{ color: TEAL, fontSize: 11, fontWeight: '600' }}>SHARED TRIP</Text>
      </View>
      <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
        {trip.title ?? 'Untitled Trip'}
      </Text>
      {(dest || days > 0) && (
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          {dest}{dest && days > 0 ? ' · ' : ''}{days > 0 ? `${days} days` : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine, onTripPress }: { msg: Message; isMine: boolean; onTripPress: (slug: string) => void }) {
  return (
    <View style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '78%', marginBottom: 6 }}>
      <View
        style={{
          backgroundColor: isMine ? TEAL : 'rgba(255,255,255,0.08)',
          borderRadius: 18,
          borderBottomRightRadius: isMine ? 4 : 18,
          borderBottomLeftRadius: isMine ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        {msg.content && (
          <Text style={{ color: isMine ? 'white' : 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 21 }}>
            {msg.content}
          </Text>
        )}
        {msg.trip_slug && (
          <TripEmbed slug={msg.trip_slug} onPress={() => onTripPress(msg.trip_slug!)} />
        )}
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 2, alignSelf: isMine ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>
        {timeStr(msg.created_at)}
      </Text>
    </View>
  );
}

// ─── Main chat screen ────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { conversationId, friendUsername } = useLocalSearchParams<{ conversationId: string; friendUsername: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { username: authUsername } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showTripPicker, setShowTripPicker] = useState(false);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function loadMessages() {
    if (!conversationId) return;
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
      if (authUsername) markConversationRead(conversationId, authUsername).catch(() => {});
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadMessages(); }, [conversationId]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId, authUsername]);

  useFocusEffect(useCallback(() => {
    if (conversationId && authUsername) {
      markConversationRead(conversationId, authUsername).catch(() => {});
    }
  }, [conversationId, authUsername]));

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || !authUsername || !conversationId) return;

    setSending(true);
    try {
      const msg = await sendMessage(conversationId, authUsername, trimmed);
      setMessages((prev) => [...prev, msg]);
      setText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

      // Notify friend (fire-and-forget)
      if (friendUsername) {
        supabase.from('profiles').select('user_id').eq('username', friendUsername).maybeSingle().then(({ data: p }) => {
          if (p?.user_id) {
            supabase.from('notifications').insert({
              user_id: p.user_id,
              type: 'new_message',
              title: `${authUsername} sent a message`,
              body: trimmed.slice(0, 80),
              data: { conversation_id: conversationId, username: authUsername },
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch {}
    setSending(false);
  }

  async function handleShareTrip(tripSlug: string) {
    if (!authUsername || !conversationId) return;
    setShowTripPicker(false);
    try {
      const msg = await sendMessage(conversationId, authUsername, undefined, tripSlug);
      setMessages((prev) => [...prev, msg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

      // Notify friend
      if (friendUsername) {
        supabase.from('profiles').select('user_id').eq('username', friendUsername).maybeSingle().then(({ data: p }) => {
          if (p?.user_id) {
            supabase.from('notifications').insert({
              user_id: p.user_id,
              type: 'new_message',
              title: `${authUsername} shared a trip`,
              body: 'Tap to view',
              data: { conversation_id: conversationId, username: authUsername },
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch {}
  }

  async function openTripPicker() {
    setShowTripPicker(true);
    setLoadingTrips(true);
    try {
      const { data } = await supabase.from('trips').select('id, title, share_slug, itinerary').eq('username', authUsername).eq('is_public', true).order('created_at', { ascending: false }).limit(20);
      setMyTrips(data ?? []);
    } catch {}
    setLoadingTrips(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(`/profile/${friendUsername}` as any)} activeOpacity={0.7} style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '700' }}>@{friendUsername}</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={TEAL} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1, justifyContent: messages.length === 0 ? 'center' : undefined }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 32 }}>👋</Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Say hello to @{friendUsername}!</Text>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble
                msg={item}
                isMine={item.sender_username === authUsername}
                onTripPress={(slug) => router.push({ pathname: '/trip/[slug]', params: { slug } } as any)}
              />
            )}
          />
        )}

        {/* Input bar */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) + 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', gap: 8 }}>
          {/* Trip share button */}
          <TouchableOpacity
            onPress={openTripPicker}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="map-outline" size={20} color={TEAL} />
          </TouchableOpacity>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            multiline
            maxLength={1000}
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.07)',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 10,
              color: 'white',
              fontSize: 15,
              maxHeight: 100,
              borderWidth: 1,
              borderColor: text.trim() ? 'rgba(13,148,136,0.3)' : 'rgba(255,255,255,0.08)',
            }}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: text.trim() ? TEAL : 'rgba(255,255,255,0.07)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="arrow-up" size={20} color={text.trim() ? 'white' : 'rgba(255,255,255,0.3)'} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Trip picker modal */}
      <Modal visible={showTripPicker} transparent animationType="slide" onRequestClose={() => setShowTripPicker(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowTripPicker(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: '#111128', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16, minHeight: 280 }}>
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </View>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 12 }}>Share a Trip</Text>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 }} />

              {loadingTrips ? (
                <View style={{ paddingTop: 40, alignItems: 'center' }}><ActivityIndicator color={TEAL} /></View>
              ) : myTrips.length === 0 ? (
                <View style={{ paddingTop: 30, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No trips to share</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 350 }} contentContainerStyle={{ paddingVertical: 8 }}>
                  {myTrips.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => handleShareTrip(t.share_slug)}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(13,148,136,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="map-outline" size={18} color={TEAL} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{t.title ?? 'Untitled'}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{t.itinerary?.destination ?? ''}</Text>
                      </View>
                      <Ionicons name="paper-plane" size={16} color={TEAL} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
