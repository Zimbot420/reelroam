import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  supabase,
  getComments,
  TripComment,
} from '../lib/supabase';
import { notifyTripOwner } from '../lib/notifications';
import { useAuth } from '../lib/context/AuthContext';
import { getOrCreateDeviceId } from '../lib/deviceId';

const TEAL = '#0D9488';
const BG = '#111128';
const CARD_BG = 'rgba(255,255,255,0.06)';
const MAX_COMMENT_LENGTH = 500;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CommentRow({
  comment,
  isOwn,
  onDelete,
  onProfilePress,
}: {
  comment: TripComment;
  isOwn: boolean;
  onDelete: () => void;
  onProfilePress: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}>
      {/* Avatar */}
      <TouchableOpacity onPress={onProfilePress} activeOpacity={0.7}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(13,148,136,0.15)',
            borderWidth: 1,
            borderColor: 'rgba(13,148,136,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18 }}>{comment.avatar_emoji ?? '🌍'}</Text>
        </View>
      </TouchableOpacity>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity onPress={onProfilePress} activeOpacity={0.7}>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' }}>
              {comment.username ?? 'Traveler'}
            </Text>
          </TouchableOpacity>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
            {timeAgo(comment.created_at)}
          </Text>
          {comment.is_edited && (
            <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontStyle: 'italic' }}>edited</Text>
          )}
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20, marginTop: 2 }}>
          {comment.content}
        </Text>
      </View>

      {/* Delete (own comments only) */}
      {isOwn && (
        <TouchableOpacity
          onPress={onDelete}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function CommentsSheet({
  visible,
  tripId,
  onClose,
  onCommentCountChange,
}: {
  visible: boolean;
  tripId: string;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, username: authUsername } = useAuth();

  const [comments, setComments] = useState<TripComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  useEffect(() => {
    if (!visible || !tripId) return;
    loadComments();
  }, [visible, tripId]);

  async function loadComments() {
    setLoading(true);
    try {
      const data = await getComments(tripId);
      setComments(data);
      onCommentCountChange?.(data.length);
    } catch {
      // Silent — show empty state
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    const trimmed = text.trim();
    if (!trimmed || posting) return;

    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Create an account to leave comments.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => { onClose(); router.push('/auth/login' as any); } },
      ]);
      return;
    }

    setPosting(true);
    try {
      // Ensure deviceId is loaded
      const did = deviceId || await getOrCreateDeviceId();
      if (!did) throw new Error('Could not identify device');

      // Fetch profile info (best-effort, don't fail if this errors)
      let profileUsername = authUsername ?? undefined;
      let profileEmoji: string | undefined;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_emoji')
          .eq('device_id', did)
          .maybeSingle();
        if (profile?.username) profileUsername = profile.username;
        if (profile?.avatar_emoji) profileEmoji = profile.avatar_emoji;
      } catch {}

      // Insert the comment — this is the only critical call
      const { data: inserted, error: insertError } = await supabase
        .from('trip_comments')
        .insert({
          trip_id: tripId,
          device_id: did,
          user_id: user?.id ?? null,
          username: profileUsername ?? null,
          avatar_emoji: profileEmoji ?? null,
          content: trimmed,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Comment posted — update UI immediately
      const newComment = inserted as TripComment;
      setComments((prev) => {
        const updated = [...prev, newComment];
        onCommentCountChange?.(updated.length);
        return updated;
      });
      setText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not post comment. Please try again.');
    } finally {
      setPosting(false);
    }

    // Side effects — completely outside try/catch, never show errors
    supabase.from('trips').select('comment_count').eq('id', tripId).single().then(({ data }) => {
      if (data) supabase.from('trips').update({ comment_count: (data.comment_count ?? 0) + 1 }).eq('id', tripId);
    }).catch(() => {});
    try { notifyTripOwner(tripId, 'comment_added' as any, 'New comment on your trip!', trimmed.slice(0, 80), { trip_id: tripId }).catch(() => {}); } catch {}
  }

  function handleDelete(comment: TripComment) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Resolve device ID upfront
          const did = deviceId || await getOrCreateDeviceId();

          // Delete from DB
          const { error: delError } = await supabase
            .from('trip_comments')
            .delete()
            .eq('id', comment.id)
            .eq('device_id', did);

          if (delError) {
            Alert.alert('Error', 'Could not delete comment.');
            return;
          }

          // Success — update UI
          setComments((prev) => {
            const updated = prev.filter((c) => c.id !== comment.id);
            onCommentCountChange?.(updated.length);
            return updated;
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View
              style={{
                backgroundColor: BG,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: 'rgba(13,148,136,0.18)',
                maxHeight: '75%',
                minHeight: 320,
              }}
            >
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 }}>
                <Text style={{ flex: 1, color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>
                  Comments
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                  {comments.length}
                </Text>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 }} />

              {/* Comments list */}
              {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator color={TEAL} />
                </View>
              ) : comments.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 }}>
                  <Ionicons name="chatbubble-outline" size={32} color="rgba(255,255,255,0.15)" />
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                    No comments yet
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                    Be the first to share your thoughts
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={comments}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <CommentRow
                      comment={item}
                      isOwn={item.device_id === deviceId}
                      onDelete={() => handleDelete(item)}
                      onProfilePress={() => {
                        if (item.username) {
                          onClose();
                          router.push(`/profile/${item.username}` as any);
                        }
                      }}
                    />
                  )}
                  style={{ flexGrow: 0, maxHeight: 400 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 8 }}
                />
              )}

              {/* Input bar */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: Math.max(insets.bottom, 16) + 4,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255,255,255,0.06)',
                  gap: 10,
                }}
              >
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={(v) => setText(v.slice(0, MAX_COMMENT_LENGTH))}
                  placeholder={isAuthenticated ? 'Add a comment...' : 'Sign in to comment'}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  editable={!posting}
                  multiline
                  maxLength={MAX_COMMENT_LENGTH}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingTop: 10,
                    paddingBottom: 10,
                    color: 'white',
                    fontSize: 14,
                    maxHeight: 80,
                    borderWidth: 1,
                    borderColor: text.trim() ? 'rgba(13,148,136,0.3)' : 'rgba(255,255,255,0.08)',
                  }}
                />
                <TouchableOpacity
                  onPress={handlePost}
                  disabled={!text.trim() || posting}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: text.trim() ? TEAL : 'rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 0,
                  }}
                >
                  {posting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons
                      name="arrow-up"
                      size={20}
                      color={text.trim() ? 'white' : 'rgba(255,255,255,0.3)'}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}
