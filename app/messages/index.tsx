import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getConversations,
  getMutualFollows,
  getOrCreateConversation,
  ConversationPreview,
} from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import { getOrCreateDeviceId } from '../../lib/deviceId';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function ConversationRow({ convo, onPress }: { convo: ConversationPreview; onPress: () => void }) {
  const preview = convo.last_trip_slug ? 'Shared a trip' : convo.last_message ?? '';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
      }}
    >
      {/* Avatar */}
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          backgroundColor: 'rgba(13,148,136,0.12)',
          borderWidth: 1,
          borderColor: 'rgba(13,148,136,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 24 }}>{convo.friend_avatar_emoji ?? '🌍'}</Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontSize: 15, fontWeight: convo.unread_count > 0 ? '700' : '500' }}>
          {convo.friend_username}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: convo.unread_count > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
            fontSize: 13,
            marginTop: 2,
            fontWeight: convo.unread_count > 0 ? '500' : '400',
          }}
        >
          {preview}
        </Text>
      </View>

      {/* Time + unread */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
          {timeAgo(convo.last_message_at)}
        </Text>
        {convo.unread_count > 0 && (
          <View
            style={{
              backgroundColor: TEAL,
              borderRadius: 10,
              minWidth: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 6,
            }}
          >
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{convo.unread_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { username: authUsername, isAuthenticated } = useAuth();

  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [friends, setFriends] = useState<{ username: string; avatar_emoji: string | null }[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  async function loadConversations() {
    if (!authUsername) return;
    try {
      const data = await getConversations(authUsername);
      setConversations(data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadConversations(); }, [authUsername]);

  useFocusEffect(useCallback(() => {
    if (authUsername) loadConversations();
  }, [authUsername]));

  async function openNewMessage() {
    setShowNewMessage(true);
    setLoadingFriends(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      if (authUsername) {
        const mutual = await getMutualFollows(deviceId, authUsername);
        setFriends(mutual);
      }
    } catch {}
    setLoadingFriends(false);
  }

  async function startConversation(friendUsername: string) {
    if (!authUsername) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNewMessage(false);
    try {
      const convoId = await getOrCreateConversation(authUsername, friendUsername);
      router.push({ pathname: '/messages/[conversationId]', params: { conversationId: convoId, friendUsername } } as any);
    } catch {}
  }

  if (!isAuthenticated || !authUsername) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.1)" />
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 16, textAlign: 'center' }}>
          Sign in to message friends
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/auth/login' as any)}
          style={{ marginTop: 16, backgroundColor: TEAL, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
        >
          <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={{ flex: 1, color: 'white', fontSize: 20, fontWeight: '700', marginLeft: 8 }}>Messages</Text>
        <TouchableOpacity
          onPress={openNewMessage}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(13,148,136,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="create-outline" size={20} color={TEAL} />
        </TouchableOpacity>
      </View>

      {/* Conversations list */}
      {loading ? (
        <View style={{ paddingTop: 40, alignItems: 'center' }}>
          <ActivityIndicator color={TEAL} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={{ paddingTop: 60, alignItems: 'center', gap: 8, paddingHorizontal: 32 }}>
          <Ionicons name="chatbubbles-outline" size={40} color="rgba(255,255,255,0.1)" />
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, textAlign: 'center' }}>No messages yet</Text>
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
            Follow someone and have them follow you back to start chatting
          </Text>
          <TouchableOpacity
            onPress={openNewMessage}
            style={{ marginTop: 12, backgroundColor: TEAL, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 }}
          >
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>New Message</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => (
            <ConversationRow
              convo={item}
              onPress={() => router.push({ pathname: '/messages/[conversationId]', params: { conversationId: item.id, friendUsername: item.friend_username } } as any)}
            />
          )}
        />
      )}

      {/* New message modal — friend picker */}
      <Modal visible={showNewMessage} transparent animationType="slide" onRequestClose={() => setShowNewMessage(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowNewMessage(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: '#111128', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 16, minHeight: 300 }}>
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </View>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', paddingHorizontal: 20, paddingVertical: 12 }}>
                New Message
              </Text>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 }} />

              {loadingFriends ? (
                <View style={{ paddingTop: 40, alignItems: 'center' }}>
                  <ActivityIndicator color={TEAL} />
                </View>
              ) : friends.length === 0 ? (
                <View style={{ paddingTop: 30, alignItems: 'center', gap: 8, paddingHorizontal: 32 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center' }}>
                    No mutual friends yet
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                    You can message people who follow you back. Start by following travelers you like!
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 350 }} contentContainerStyle={{ paddingVertical: 8 }}>
                  {friends.map((f) => (
                    <TouchableOpacity
                      key={f.username}
                      onPress={() => startConversation(f.username)}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, gap: 12 }}
                    >
                      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(13,148,136,0.12)', borderWidth: 1, borderColor: 'rgba(13,148,136,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>{f.avatar_emoji ?? '🌍'}</Text>
                      </View>
                      <Text style={{ flex: 1, color: 'white', fontSize: 15, fontWeight: '500' }}>@{f.username}</Text>
                      <Ionicons name="chatbubble-outline" size={18} color={TEAL} />
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
