import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { localStorage } from 'expo-sqlite/localStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient(url || 'https://example.supabase.co', key || 'missing-key', {
  auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
});

export const createRecoveryClient = () => createClient(url || 'https://example.supabase.co', key || 'missing-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'vanta-recovery' }
});
