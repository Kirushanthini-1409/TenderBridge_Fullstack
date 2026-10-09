import { createContext, useEffect, useMemo, useState } from 'react';
import { setApiTokenProvider } from '../services/api.js';
import { supabase, supabaseConfigured } from '../services/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setApiTokenProvider(null);
      return undefined;
    }

    let active = true;
    setApiTokenProvider(async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      return data.session?.access_token || null;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
      setError(null);
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      setSession(data.session);
      setError(sessionError);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      setApiTokenProvider(null);
    };
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    role: String(session?.user?.app_metadata?.role || '').toUpperCase(),
    loading,
    configured: supabaseConfigured,
    error,
    async signIn(email, password) {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      setSession(data.session);
      setLoading(false);
      return data;
    },
    async signUp(email, password, fullName) {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: fullName ? { full_name: fullName } : {} },
      });
      if (signUpError) throw signUpError;
      return data;
    },
    async signOut() {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setSession(null);
    },
  }), [session, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
