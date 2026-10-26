import React, { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { Screen, Field, PrimaryButton, ErrorText } from '../src/components/ui';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { supabase } from '../src/lib/supabase';
export default function Security() {
  const { colors } = useTheme(); const router = useRouter(); const { biometricEnabled, setBiometricEnabled, signOut } = useAuth();
  const [pw, setPw] = useState(''); const [err, setErr] = useState<string | null>(null); const [info, setInfo] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function toggleBio(v: boolean) {
    if (v) { const has = await LocalAuthentication.hasHardwareAsync(); const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!has || !enrolled) { setErr('No fingerprint / face unlock is set up on this device.'); return; } }
    setErr(null); await setBiometricEnabled(v);
  }
  async function changePw() {
    setErr(null); setInfo(null);
    if (!supabase) { setErr('Backend not configured — see README.'); return; }
    if (pw.length < 8) { setErr('New password must be at least 8 characters.'); return; }
    setBusy(true); const { error } = await supabase.auth.updateUser({ password: pw }); setBusy(false);
    if (error) setErr(error.message); else { setInfo('Password updated.'); setPw(''); }
  }
  return <Screen><ScrollView>
    <Pressable onPress={() => router.back()}><Text style={{ color: colors.text, fontSize: 20 }}>←</Text></Pressable>
    <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 14 }}>Security</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flex: 1, paddingRight: 12 }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>Biometric unlock</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>Ask for fingerprint / Face ID when opening DocVault. This unlocks the app on this device — it does not replace your account password.</Text></View>
      <Switch value={biometricEnabled} onValueChange={toggleBio} /></View>
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 18 }}>Change password</Text>
    <Field icon="lock-closed-outline" placeholder="New password (min. 8 characters)" secureTextEntry value={pw} onChangeText={setPw} />
    <ErrorText text={err} />{info ? <Text style={{ color: colors.success, fontSize: 13, marginVertical: 6 }}>{info}</Text> : null}
    <PrimaryButton title="Update Password" onPress={changePw} loading={busy} />
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10, padding: 14, marginTop: 14 }}>
      <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>How your documents are protected</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>• Only you can access your documents: database Row Level Security and private storage policies restrict every file to your account. Files open through short-lived signed links (60 seconds). No public links, ever.{"\n"}• Your login and biometric unlock protect access to the app.{"\n"}• Documents are encrypted in transit (HTTPS/TLS) and at rest by Supabase. They are NOT end-to-end encrypted — that means the cloud provider's infrastructure can technically access stored files; DocVault's own access controls are what keep other users out.</Text></View>
    <PrimaryButton title="Sign Out" onPress={async () => { await signOut(); router.replace('/login'); }} />
  </ScrollView></Screen>;
}
