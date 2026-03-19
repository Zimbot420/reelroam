import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../lib/context/AuthContext';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  Notification,
} from '../lib/notifications';

const TEAL = '#0D9488';
const BG = '#0a0a1a';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  trip_saved:   { icon: 'bookmark',         color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  badge_earned: { icon: 'ribbon',           color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  trip_liked:   { icon: 'heart',            color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  comment_added:{ icon: 'chatbubble',       color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  milestone:    { icon: 'star',             color: TEAL,      bg: 'rgba(13,148,136,0.15)' },
  weekly_recap: { icon: 'calendar-outline', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: 'notifications-outline', color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.08)' };
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (item: Notification) => void;
}) {
  const cfg = getTypeConfig(item.type);

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        backgroundColor: item.is_read ? 'transparent' : 'rgba(13,148,136,0.06)',
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: cfg.bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          flexShrink: 0,
        }}
      >
        <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
      </View>

      {/* Text */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: item.is_read ? 'rgba(255,255,255,0.7)' : 'white',
            fontSize: 14,
            fontWeight: item.is_read ? '400' : '600',
            lineHeight: 20,
          }}
        >
          {item.title}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            marginTop: 2,
            lineHeight: 18,
          }}
        >
          {item.body}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 11,
            marginTop: 4,
          }}
        >
          {timeAgo(item.created_at)}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.is_read && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: TEAL,
            marginTop: 6,
            marginLeft: 8,
            flexShrink: 0,
          }}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: 'rgba(255,255,255,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons name="notifications-outline" size={32} color="rgba(255,255,255,0.25)" />
      </View>
      <Text
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 17,
          fontWeight: '600',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        No notifications yet
      </Text>
      <Text
        style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        You'll be notified when people save or like your trips, and when you earn new badges.
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotifications(user.id);
      setItems(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleMarkAllRead() {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markAllNotificationsRead(user.id);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function handlePress(item: Notification) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark as read
    if (!item.is_read) {
      await markNotificationRead(item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
      );
    }

    // Navigate to relevant content
    const d = item.data ?? {};
    switch (item.type) {
      case 'trip_saved':
      case 'trip_liked':
      case 'milestone':
        if (d.trip_id) router.push(`/trip/${d.trip_id}` as any);
        break;
      case 'comment_added':
        if (d.trip_id) router.push({ pathname: '/trip/[slug]', params: { slug: d.trip_id, openComments: '1' } } as any);
        break;
      case 'badge_earned':
        if (d.username) router.push(`/profile/${d.username}` as any);
        break;
      case 'weekly_recap':
      default:
        break;
    }
  }

  const hasUnread = items.some((n) => !n.is_read);

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>Notifications</Text>
          </View>
          <EmptyState />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 4, marginRight: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <Text style={{ flex: 1, color: 'white', fontSize: 22, fontWeight: '700' }}>
            Notifications
          </Text>

          {hasUnread && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: 'rgba(13,148,136,0.15)',
                borderWidth: 1,
                borderColor: 'rgba(13,148,136,0.3)',
              }}
            >
              <Text style={{ color: TEAL, fontSize: 12, fontWeight: '600' }}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={TEAL} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationRow item={item} onPress={handlePress} />
            )}
            ListEmptyComponent={<EmptyState />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={TEAL}
                colors={[TEAL]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
