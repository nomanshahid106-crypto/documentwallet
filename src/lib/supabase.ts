import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
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
