import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, ThemeColors, ThemePreference } from '../theme/theme';
const KEY = 'docvault-theme-preference';
interface Ctx { colors: ThemeColors; preference: ThemePreference; resolved: 'light'|'dark'; setPreference: (p: ThemePreference) => void }
const ThemeCtx = createContext<Ctx>({ colors: lightColors, preference: 'system', resolved: 'light', setPreference: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');
  useEffect(() => { AsyncStorage.getItem(KEY).then(v => { if (v === 'light' || v === 'dark' || v === 'system') setPref(v); }).catch(() => {}); }, []);
  const setPreference = (p: ThemePreference) => { setPref(p); AsyncStorage.setItem(KEY, p).catch(() => {}); };
  const resolved: 'light'|'dark' = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo<Ctx>(() => ({ colors: resolved === 'dark' ? darkColors : lightColors, preference, resolved, setPreference }), [resolved, preference]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);
