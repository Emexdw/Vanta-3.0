import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import * as api from './api';
import { User } from '../types';

interface SignUpInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

interface AuthState {
  session: Session | null;
  profile: User | null;
  booting: boolean;
  profileError: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  resendEmailCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ya existe una cuenta con ese correo.';
  if (m.includes('email not confirmed')) return 'Confirmá tu correo antes de entrar. Revisá tu bandeja de entrada.';
  if (m.includes('password should be')) return 'La contraseña es demasiado débil.';
  if (m.includes('expired') || m.includes('invalid otp')) return 'Código inválido o vencido. Solicitá uno nuevo.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Esperá unos minutos.';
  if (m.includes('invalid email')) return 'El correo no es válido.';
  return message;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (!data.session) setBooting(false);
    });
    // Solo guardamos la sesión aquí: hacer llamadas a Supabase dentro de este callback puede bloquear el cliente
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const p = await api.fetchProfileById(userId);
      setProfile(p);
      setProfileError(!p);
    } catch {
      setProfileError(true);
    } finally {
      setBooting(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileError(false);
      return;
    }
    loadProfile();
  }, [userId, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(translateAuthError(error.message));
  }, []);

  const signUp = useCallback(async ({ email, password, username, displayName }: SignUpInput) => {
    const uname = username.trim().toLowerCase();
    if (!USERNAME_RE.test(uname)) {
      throw new Error('El usuario debe tener 3 a 24 caracteres: letras minúsculas, números, punto o guion bajo.');
    }
    if (!(await api.isUsernameAvailable(uname))) throw new Error('Ese nombre de usuario ya está en uso.');

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: uname, display_name: displayName.trim() || uname } }
    });
    if (error) throw new Error(translateAuthError(error.message));
    return { needsConfirmation: !data.session };
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (error) throw new Error(translateAuthError(error.message));
  }, []);

  const resendEmailCode = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    if (error) throw new Error(translateAuthError(error.message));
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, profile, booting, profileError, refreshProfile: loadProfile, signIn, signUp, verifyEmailCode, resendEmailCode, signOut }),
    [session, profile, booting, profileError, loadProfile, signIn, signUp, verifyEmailCode, resendEmailCode, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
