import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { isConfigured } from '../src/lib/supabase';
function Gate() {
  const { session, loading, locked, unlock } = useAuth();
  const { colors, resolved } = useTheme();
  const rawSegments = useSegments(); const router = useRouter();
  const segments = rawSegments as unknown as string[];
  React.useEffect(() => {
    if (loading) return;
    const first = segments[0] ?? 'index';
    const inAuth = ['login','signup','forgot-password','index'].includes(first);
    const atRoot = segments.length === 0;
    if (!session && !inAuth && !atRoot) router.replace('/login');
    if (session && (first === 'login' || first === 'signup')) router.replace('/(tabs)');
  }, [session, loading, segments]);
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.text} /></View>;
  if (locked && session) return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <Text style={{ fontSize: 40 }}>🔒</Text><Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginVertical: 12 }}>DocVault is locked</Text>
    <Pressable onPress={unlock} style={{ backgroundColor: colors.primaryBg, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28 }}><Text style={{ color: colors.primaryText, fontWeight: '600' }}>Unlock with biometrics</Text></Pressable></View>;
  return <><StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" /><Stack.Screen name="login" /><Stack.Screen name="signup" /><Stack.Screen name="forgot-password" />
      <Stack.Screen name="(tabs)" /><Stack.Screen name="add" options={{ presentation: 'modal' }} /><Stack.Screen name="scan" />
      <Stack.Screen name="search" /><Stack.Screen name="document/[id]" /><Stack.Screen name="security" /><Stack.Screen name="theme" />
    </Stack></>;
}
export default function RootLayout() {
  return <ThemeProvider><AuthProvider><Gate /></AuthProvider></ThemeProvider>;
}
export { isConfigured };
