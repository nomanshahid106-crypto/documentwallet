import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Screen, Field, PrimaryButton, GhostButton, ErrorText, ConfigBanner } from '../src/components/ui';
import { useTheme } from '../src/context/ThemeContext';
import { supabase, isConfigured, NOT_CONFIGURED_MSG } from '../src/lib/supabase';
export default function Login() {
  const { colors } = useTheme(); const router = useRouter();
  const [id, setId] = useState(''); const [pw, setPw] = useState(''); const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit() {
    setErr(null);
    if (!isConfigured || !supabase) { setErr(NOT_CONFIGURED_MSG); return; }
    if (!id.includes('@')) { setErr('Please enter your email address. (Phone sign-in needs phone auth enabled in Supabase.)'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: id.trim(), password: pw });
    setBusy(false);
    if (error) setErr(error.message); else router.replace('/(tabs)');
  }
  async function google() {
    if (!supabase) { setErr(NOT_CONFIGURED_MSG); return; }
    // Requires the Google provider to be enabled in Supabase Dashboard → Authentication → Providers.
    const redirectTo = Linking.createURL('login');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) setErr(error.message);
  }
  return <Screen><ScrollView keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()}><Text style={{ color: colors.text, fontSize: 20 }}>←</Text></Pressable>
    <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 18 }}>Welcome Back</Text>
    <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: 14 }}>Sign in to your account</Text>
    {!isConfigured ? <ConfigBanner /> : null}
    <Field icon="person-outline" placeholder="Email or Phone" autoCapitalize="none" keyboardType="email-address" value={id} onChangeText={setId} />
    <View><Field icon="lock-closed-outline" placeholder="Password" secureTextEntry={!show} value={pw} onChangeText={setPw} />
      <Pressable onPress={() => setShow(!show)} style={{ position: 'absolute', right: 14, top: 20 }}><Text style={{ color: colors.muted }}>{show ? '🙈' : '👁️'}</Text></Pressable></View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}>
      <Pressable onPress={() => setRemember(!remember)} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 18, height: 18, borderWidth: 1.5, borderColor: colors.text, borderRadius: 4, marginRight: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: remember ? colors.primaryBg : 'transparent' }}>{remember ? <Text style={{ color: colors.primaryText, fontSize: 11 }}>✓</Text> : null}</View>
        <Text style={{ color: colors.text, fontSize: 13 }}>Remember me</Text></Pressable>
      <Pressable onPress={() => router.push('/forgot-password')}><Text style={{ color: colors.text, fontSize: 13 }}>Forgot Password?</Text></Pressable></View>
    <ErrorText text={err} />
    <PrimaryButton title="Log In" onPress={submit} loading={busy} />
    <Text style={{ color: colors.muted, textAlign: 'center', marginVertical: 8 }}>or</Text>
    <GhostButton title="G  Continue with Google" onPress={google} />
    <Pressable onPress={() => router.push('/signup')} style={{ alignItems: 'center', paddingVertical: 12 }}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>Don't have an account?  <Text style={{ color: colors.text, fontWeight: '700' }}>Sign Up</Text></Text></Pressable>
  </ScrollView></Screen>;
}
