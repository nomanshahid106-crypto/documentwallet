import React, { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Field, PrimaryButton, ErrorText, ConfigBanner } from '../src/components/ui';
import { useTheme } from '../src/context/ThemeContext';
import { supabase, isConfigured, NOT_CONFIGURED_MSG } from '../src/lib/supabase';
export default function SignUp() {
  const { colors } = useTheme(); const router = useRouter();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null); const [info, setInfo] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit() {
    setErr(null); setInfo(null);
    if (!isConfigured || !supabase) { setErr(NOT_CONFIGURED_MSG); return; }
    if (!email.includes('@')) { setErr('Enter a valid email address.'); return; }
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pw, options: { data: { full_name: name.trim() } } });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (data.session) router.replace('/(tabs)'); else setInfo('Account created. Check your email to confirm, then log in.');
  }
  return <Screen><ScrollView keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()}><Text style={{ color: colors.text, fontSize: 20 }}>←</Text></Pressable>
    <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 18 }}>Create Account</Text>
    <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: 14 }}>Your documents stay private to your account</Text>
    {!isConfigured ? <ConfigBanner /> : null}
    <Field icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} />
    <Field icon="mail-outline" placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
    <Field icon="lock-closed-outline" placeholder="Password (min. 8 characters)" secureTextEntry value={pw} onChangeText={setPw} />
    <Field icon="lock-closed-outline" placeholder="Confirm password" secureTextEntry value={pw2} onChangeText={setPw2} />
    <ErrorText text={err} />{info ? <Text style={{ color: colors.success, fontSize: 13, marginVertical: 6 }}>{info}</Text> : null}
    <PrimaryButton title="Sign Up" onPress={submit} loading={busy} />
    <Pressable onPress={() => router.push('/login')} style={{ alignItems: 'center', paddingVertical: 12 }}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>Already have an account?  <Text style={{ color: colors.text, fontWeight: '700' }}>Log In</Text></Text></Pressable>
  </ScrollView></Screen>;
}
