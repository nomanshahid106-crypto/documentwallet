import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Field, DocRow, EmptyState, Loading, ErrorText, ConfigBanner } from '../src/components/ui';
import { useTheme } from '../src/context/ThemeContext';
import { isConfigured } from '../src/lib/supabase';
import { listDocuments, DocumentItem } from '../src/services/documents';
import { filterDocuments } from '../src/lib/search';
export default function Search() {
  const { colors } = useTheme(); const router = useRouter();
  const [q, setQ] = useState(''); const [docs, setDocs] = useState<DocumentItem[]>([]); const [loading, setLoading] = useState(true); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (!isConfigured) { setLoading(false); return; } listDocuments().then(setDocs).catch((e: any) => setErr(e.message)).finally(() => setLoading(false)); }, []);
  const shown = filterDocuments(docs, q);
  return <Screen>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={() => router.back()} style={{ marginRight: 10 }}><Text style={{ color: colors.text, fontSize: 20 }}>←</Text></Pressable>
      <View style={{ flex: 1 }}><Field icon="search-outline" placeholder="Search by name, code or folder…" autoFocus value={q} onChangeText={setQ} /></View></View>
    {!isConfigured ? <ConfigBanner /> : null}<ErrorText text={err} />
    {loading ? <Loading /> : <FlatList data={shown} keyExtractor={d => d.id} ListEmptyComponent={<EmptyState title="No matches" subtitle="Try a file name, its code (e.g. A7F3-9K2D) or a folder name." />} renderItem={({ item }) => <DocRow doc={item} onPress={() => router.push(`/document/${item.id}`)} />} />}
  </Screen>;
}
