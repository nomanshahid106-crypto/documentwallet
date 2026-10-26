import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase, isConfigured } from '../lib/supabase';
const BIO_KEY = 'docvault-biometric-enabled';
interface Ctx { session: Session | null; user: User | null; loading: boolean; biometricEnabled: boolean; locked: boolean; setBiometricEnabled: (b: boolean) => Promise<void>; unlock: () => Promise<boolean>; signOut: () => Promise<void> }
const AuthCtx = createContext<Ctx>({ session: null, user: null, loading: true, biometricEnabled: false, locked: false, setBiometricEnabled: async () => {}, unlock: async () => true, signOut: async () => {} });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBio] = useState(false);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(BIO_KEY).then(v => { const on = v === '1'; setBio(on); }).catch(() => {});
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); if (data.session) AsyncStorage.getItem(BIO_KEY).then(v => setLocked(v === '1')).catch(() => {}); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const setBiometricEnabled = async (b: boolean) => { setBio(b); await AsyncStorage.setItem(BIO_KEY, b ? '1' : '0'); if (!b) setLocked(false); };
  const unlock = async (): Promise<boolean> => {
    const has = await LocalAuthentication.hasHardwareAsync();
    if (!has) { setLocked(false); return true; }
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock DocVault' });
    if (res.success) setLocked(false);
    return res.success;
  };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setSession(null); setLocked(false); };
  const value = useMemo<Ctx>(() => ({ session, user: session?.user ?? null, loading, biometricEnabled, locked, setBiometricEnabled, unlock, signOut }), [session, loading, biometricEnabled, locked]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
export { isConfigured };
