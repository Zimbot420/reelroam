import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../lib/context/AuthContext';
import { getUnreadCount } from '../lib/notifications';

export function useUnreadNotifications() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) { setCount(0); return; }
    try {
      const n = await getUnreadCount(user.id);
      setCount(n);
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-check when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { count, refresh };
}
