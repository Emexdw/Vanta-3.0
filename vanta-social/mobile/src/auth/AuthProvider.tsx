import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Profile = { id: string; username: string; display_name: string; avatar_url: string; bio: string; followers_count: number; following_count: number; posts_count: number; is_verified: boolean; banner_url?: string; background_url?: string; music_url?: string; theme_color?: string; location?: string };
type AuthContextValue = { session: Session | null; profile: Profile | null; loading: boolean; refreshProfile: () => Promise<void>; signIn: (email: string, password: string) => Promise<void>; signUp: (email: string, password: string, username: string, displayName: string) => Promise<boolean>; verifyEmailCode: (email: string, code: string) => Promise<void>; resendEmailCode: (email: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const id = session?.user.id;
    if (!id) { setProfile(null); return; }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) { setSession(data.session); setLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (session?.user.id) refreshProfile().catch(() => setProfile(null)); else setProfile(null); }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(() => ({
    session, profile, loading, refreshProfile,
    signIn: async (email, password) => { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw new Error(error.message); },
    signUp: async (email, password, username, displayName) => {
      const normalized = username.trim().toLowerCase();
      if (!/^[a-z0-9_.]{3,24}$/.test(normalized)) throw new Error('El usuario debe tener entre 3 y 24 caracteres (letras, números, punto o guion bajo).');
      const { data: available, error: lookupError } = await supabase.rpc('username_available', { uname: normalized });
      if (lookupError) throw lookupError;
      if (!available) throw new Error('Ese nombre de usuario ya está ocupado.');
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: normalized, display_name: displayName.trim() || normalized } } });
      if (error) throw new Error(error.message);
      return !data.session;
    },
    verifyEmailCode: async (email, code) => { const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' }); if (error) throw error; },
    resendEmailCode: async (email) => { const { error } = await supabase.auth.resend({ email: email.trim(), type: 'signup' }); if (error) throw error; },
    signOut: async () => { const { error } = await supabase.auth.signOut(); if (error) throw error; }
  }), [session, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider'); return value; }
