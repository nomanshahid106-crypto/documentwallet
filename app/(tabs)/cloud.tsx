import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, PrimaryButton, GhostButton, Loading, ErrorText, ConfigBanner } from '../../src/components/ui';
import { useTheme } from '../../src/context/ThemeContext';
import { isConfigured } from '../../src/lib/supabase';
import { listDocuments, onDocsChanged, getPendingCount, getLastSyncTime, syncPending } from '../../src/services/documents';
import { isOnline, subscribeOnline } from '../../src/lib/sync';
import { formatBytes, formatDate } from '../../src/lib/format';
export default function Cloud() {
  const { colors } = useTheme();
  const [count, setCount] = useState(0); const [bytes, setBytes] = useState(0);
  const [pending, setPending] = useState(0); const [lastSync, setLastSync] = useState<string | null>(null);
  const [online, setOnlineState] = useState(isOnline());
  const [loading, setLoading] = useState(true); const [syncing, setSyncing] = useState(false); const [err, setErr] = useState<string | null>(null);
  const applyDocs = useCallback(async (docs: Awaited<ReturnType<typeof listDocuments>>) => {
    setCount(docs.filter(d => d.syncStatus === 'synced').length);
    setBytes(docs.reduce((a, d) => a + d.size_bytes, 0));
    setPending(await getPendingCount());
    setLastSync(await getLastSyncTime());
  }, []);
  const load = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return; }
    setLoading(true);
    try { await applyDocs(await listDocuments()); setErr(null); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, [applyDocs]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  // Live updates: doc list changes + connectivity changes refresh this screen.
  useEffect(() => onDocsChanged(docs => { void applyDocs(docs); }), [applyDocs]);
  useEffect(() => subscribeOnline(setOnlineState), []);
  async function syncNow() {
    setSyncing(true);
    try { await syncPending(); await applyDocs(await listDocuments()); }
    catch (e: any) { setErr(e.message); } finally { setSyncing(false); }
  }
  const Row = ({ k, v }: { k: string; v: string }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ color: colors.text, fontSize: 15 }}>{k}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{v}</Text></View>;
  return <Screen>
    <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 6 }}>Cloud Sync</Text>
    <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>Your documents are saved on this phone first and synced to a private Supabase bucket. Anything added offline uploads automatically when the internet returns — and synced documents stay readable offline.</Text>
    {!isConfigured ? <ConfigBanner /> : null}<ErrorText text={err} />
    {loading ? <Loading label="Checking sync…" /> : <>
      <Row k="Connection" v={online ? 'Online' : 'Offline'} />
      <Row k="Sync status" v={isConfigured ? (online ? 'On' : 'On — waiting for internet') : 'Not configured'} />
      <Row k="Documents synced" v={String(count)} />
      <Row k="Storage used" v={formatBytes(bytes)} />
      <Row k="Pending uploads" v={String(pending)} />
      <Row k="Last synced" v={lastSync ? formatDate(lastSync) : '—'} />
      <PrimaryButton title={syncing ? 'Syncing…' : 'Sync Now'} onPress={syncNow} disabled={!online || syncing} loading={syncing} />
      <GhostButton title="Refresh" onPress={load} /></>}
  </Screen>;
}
