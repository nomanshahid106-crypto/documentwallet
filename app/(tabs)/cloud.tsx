import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, PrimaryButton, Loading, ErrorText, ConfigBanner } from '../../src/components/ui';
import { useTheme } from '../../src/context/ThemeContext';
import { isConfigured } from '../../src/lib/supabase';
import { listDocuments } from '../../src/services/documents';
import { formatBytes } from '../../src/lib/format';
export default function Cloud() {
  const { colors } = useTheme();
  const [count, setCount] = useState(0); const [bytes, setBytes] = useState(0); const [last, setLast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return; }
    setLoading(true);
    try { const docs = await listDocuments(); setCount(docs.length); setBytes(docs.reduce((a, d) => a + d.size_bytes, 0)); setLast(new Date().toLocaleTimeString()); setErr(null); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const Row = ({ k, v }: { k: string; v: string }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ color: colors.text, fontSize: 15 }}>{k}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{v}</Text></View>;
  return <Screen>
    <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 6 }}>Cloud Sync</Text>
    <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>Your documents live in a private Supabase bucket. Sign in on another device and they appear automatically.</Text>
    {!isConfigured ? <ConfigBanner /> : null}<ErrorText text={err} />
    {loading ? <Loading label="Checking sync…" /> : <>
      <Row k="Sync status" v={isConfigured ? 'On' : 'Not configured'} /><Row k="Documents synced" v={String(count)} />
      <Row k="Storage used" v={formatBytes(bytes)} /><Row k="Pending uploads" v="0" /><Row k="Last checked" v={last ?? '—'} />
      <PrimaryButton title="Refresh Now" onPress={load} /></>}
  </Screen>;
}
