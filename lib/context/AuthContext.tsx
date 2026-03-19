import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  username: string | null;
  /** True when user is signed in but has no profile (username) yet */
  needsOnboarding: boolean;
  /** Re-fetch username from profiles — call after profile creation */
  refreshUsername: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  username: null,
  needsOnboarding: false,
  refreshUsername: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  // Track whether we've finished the initial username lookup
  const [usernameFetched, setUsernameFetched] = useState(false);

  async function fetchUsername(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', userId)
      .maybeSingle();
    setUsername(data?.username ?? null);
    setUsernameFetched(true);
  }

  async function refreshUsername() {
    if (user) await fetchUsername(user.id);
  }

  useEffect(() => {
    // Load persisted session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (session?.user) fetchUsername(session.user.id);
    });

    // Listen for sign in / sign out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (session?.user) fetchUsername(session.user.id);
      else { setUsername(null); setUsernameFetched(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const needsOnboarding = !!user && usernameFetched && username === null;

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAuthenticated: !!user, username, needsOnboarding, refreshUsername }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
