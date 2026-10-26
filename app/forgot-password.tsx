import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Screen, Field, PrimaryButton, ErrorText, ConfigBanner } from '../src/components/ui';
import { useTheme } from '../src/context/ThemeContext';
import { supabase, isConfigured, NOT_CONFIGURED_MSG } from '../src/lib/supabase';
export default function ForgotPassword() {
  const { colors } = useTheme(); const router = useRouter();
  const [email, setEmail] = useState(''); const [err, setErr] = useState<string | null>(null); const [info, setInfo] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit() {
    setErr(null); setInfo(null);
    if (!isConfigured || !supabase) { setErr(NOT_CONFIGURED_MSG); return; }
    if (!email.includes('@')) { setErr('Enter the email you signed up with.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('login') });
    setBusy(false);
    if (error) setErr(error.message); else setInfo('Password reset email sent. Follow the link in the email to set a new password.');
  }
  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={{ color: colors.text, fontSize: 20 }}>←</Text></Pressable>
    <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 18 }}>Forgot Password</Text>
    <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: 14 }}>We'll email you a secure reset link</Text>
    {!isConfigured ? <ConfigBanner /> : null}
    <Field icon="mail-outline" placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
    <ErrorText text={err} />{info ? <Text style={{ color: colors.success, fontSize: 13, marginVertical: 6 }}>{info}</Text> : null}
    <PrimaryButton title="Send Reset Link" onPress={submit} loading={busy} />
  </Screen>;
}
