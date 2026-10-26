import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Chip, DocRow, EmptyState, Loading, ErrorText, FileBadge, ConfigBanner } from '../../src/components/ui';
import { useTheme } from '../../src/context/ThemeContext';
import { isConfigured } from '../../src/lib/supabase';
import { listDocuments, DocumentItem } from '../../src/services/documents';
import { filterDocuments, ChipFilter } from '../../src/lib/search';
import { formatBytes, formatDate, FOLDERS } from '../../src/lib/format';
const CHIPS: ChipFilter[] = ['All','Documents','Images','PDFs'];
export default function Files() {
  const { colors } = useTheme(); const router = useRouter(); const params = useLocalSearchParams<{ folder?: string }>();
  const [docs, setDocs] = useState<DocumentItem[]>([]); const [chip, setChip] = useState<ChipFilter>('All');
  const [folder, setFolder] = useState<string | undefined>(params.folder); const [grid, setGrid] = useState(false);
  const [loading, setLoading] = useState(true); const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return; }
    try { setErr(null); setDocs(await listDocuments()); } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { if (params.folder) setFolder(params.folder); load(); }, [load, params.folder]));
  const shown = filterDocuments(docs, '', chip, folder);
  return <Screen>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{folder ?? 'All Documents'}</Text>
      <Pressable onPress={() => setGrid(!grid)}><Text style={{ color: colors.text, fontSize: 18 }}>{grid ? '☰' : '▦'}</Text></Pressable></View>
    {folder ? <Pressable onPress={() => setFolder(undefined)} style={{ marginTop: 8 }}><Text style={{ color: colors.muted, fontSize: 13 }}>✕ Clear folder filter ({folder})</Text></Pressable> : null}
    <View style={{ flexDirection: 'row', marginVertical: 12 }}>{CHIPS.map(c => <Chip key={c} label={c} active={chip === c} onPress={() => setChip(c)} />)}</View>
    <View style={{ flexDirection: 'row', marginBottom: 8 }}>{FOLDERS.map(f => <Chip key={f} label={f} active={folder === f} onPress={() => setFolder(folder === f ? undefined : f)} />)}</View>
    {!isConfigured ? <ConfigBanner /> : null}<ErrorText text={err} />
    {loading ? <Loading /> : shown.length === 0 ? <EmptyState title="Nothing here yet" subtitle="Documents you upload will appear here." /> :
    <FlatList data={shown} key={grid ? 'g' : 'l'} numColumns={grid ? 2 : 1} keyExtractor={d => d.id}
      renderItem={({ item }) => grid
        ? <Pressable onPress={() => router.push(`/document/${item.id}`)} style={{ flex: 1, margin: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.surface }}>
            <FileBadge ext={item.file_type} size={46} /><Text style={{ color: colors.text, fontWeight: '600', marginTop: 10 }} numberOfLines={2}>{item.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{formatBytes(item.size_bytes)} • {formatDate(item.created_at)}</Text></Pressable>
        : <DocRow doc={item} onPress={() => router.push(`/document/${item.id}`)} />} />}
  </Screen>;
}
