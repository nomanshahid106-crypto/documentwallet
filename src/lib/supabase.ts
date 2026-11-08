import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
// The Supabase URL and publishable (anon) key are PUBLIC client credentials by design —
// they ship inside every app bundle anyway, and all data access is enforced server-side
// by Row Level Security. They are embedded here as fallbacks so a fresh clone or an
// Expo Go run works without a .env file. A .env (EXPO_PUBLIC_SUPABASE_URL /
// EXPO_PUBLIC_SUPABASE_ANON_KEY) still overrides them, e.g. to point at another project.
// The service_role / secret key must NEVER be put here or anywhere in the app.
const FALLBACK_URL = 'https://vxumtvxfqxtemnszaahk.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_u32hlsK3fAbx7D3W22eWgw_XoLpJM2g';
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const url = envUrl && envUrl.startsWith('http') ? envUrl : FALLBACK_URL;
const anon = envAnon && !envAnon.includes('your-') ? envAnon : FALLBACK_ANON_KEY;
export const isConfigured = Boolean(url && anon);
// NOTE: Supabase sessions can exceed SecureStore's per-value limit on some devices;
// this adapter is the documented Expo pattern and stores the session encrypted at rest.
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url, anon, { auth: { storage: SecureStoreAdapter, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })
  : null;
export const NOT_CONFIGURED_MSG = 'Backend not configured — add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see README) to connect DocVault to Supabase.';
