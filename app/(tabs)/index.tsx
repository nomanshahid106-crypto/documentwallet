import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Chip, DocRow, FolderRow, EmptyState, Loading, ErrorText, ConfigBanner } from '../../src/components/ui';
import { useTheme } from '../../src/context/ThemeContext';
import { isConfigured } from '../../src/lib/supabase';
import { listDocuments, folderCounts, DocumentItem } from '../../src/services/documents';
import { filterDocuments, ChipFilter } from '../../src/lib/search';
import { FOLDERS } from '../../src/lib/format';
const CHIPS: ChipFilter[] = ['All','Documents','Images','PDFs'];
export default function Home() {
  const { colors } = useTheme(); const router = useRouter();
  const [docs, setDocs] = useState<DocumentItem[]>([]); const [chip, setChip] = useState<ChipFilter>('All');
  const [loading, setLoading] = useState(true); const [err, setErr] = useState<string | null>(null); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return; }
    try { setErr(null); setDocs(await listDocuments()); } catch (e: any) { setErr(e.message); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const counts = folderCounts(docs, FOLDERS);
  const recent = filterDocuments(docs, '', chip).slice(0, 5);
  return <Screen><ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>DocVault</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.push('/search')} style={{ marginRight: 14 }}><Ionicons name="search-outline" size={22} color={colors.text} /></Pressable>
        <Pressable onPress={() => router.push('/add')} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryText, fontSize: 20, lineHeight: 22 }}>+</Text></Pressable>
      </View></View>
    <Pressable onPress={() => router.push('/search')} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.inputBg, paddingHorizontal: 12, paddingVertical: 11, marginTop: 16 }}>
      <Ionicons name="search-outline" size={16} color={colors.muted} /><Text style={{ color: colors.muted, marginLeft: 8 }}>Search documents...</Text></Pressable>
    <View style={{ flexDirection: 'row', marginTop: 14 }}>{CHIPS.map(c => <Chip key={c} label={c} active={chip === c} onPress={() => setChip(c)} />)}</View>
    {!isConfigured ? <View style={{ marginTop: 14 }}><ConfigBanner /></View> : null}
    <ErrorText text={err} />
    <View style={{ marginTop: 10 }}>{FOLDERS.map(f => <FolderRow key={f} name={f} count={counts[f] ?? 0} onPress={() => router.push({ pathname: '/(tabs)/files', params: { folder: f } })} />)}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Recent Files</Text>
      <Pressable onPress={() => router.push('/(tabs)/files')}><Text style={{ color: colors.muted, fontSize: 13 }}>See all</Text></Pressable></View>
    {loading ? <Loading /> : recent.length === 0 ? <EmptyState title="No documents yet" subtitle="Tap + to upload your first document." /> : recent.map(d => <DocRow key={d.id} doc={d} onPress={() => router.push(`/document/${d.id}`)} />)}
  </ScrollView></Screen>;
}
