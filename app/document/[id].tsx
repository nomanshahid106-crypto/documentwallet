import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, FileBadge, PrimaryButton, GhostButton, Loading, ErrorText } from '../../src/components/ui';
import { useTheme } from '../../src/context/ThemeContext';
import { getDocument, getSignedUrl, renameDocument, deleteDocument, DocumentItem } from '../../src/services/documents';
import { formatBytes, formatDate, fileTypeLabel } from '../../src/lib/format';
const IMAGE_EXTS = ['jpg','jpeg','png','webp','heic'];
export default function DocumentDetails() {
  const { colors } = useTheme(); const router = useRouter(); const { id } = useLocalSearchParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentItem | null>(null); const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [err, setErr] = useState<string | null>(null); const [newName, setNewName] = useState('');
  const load = useCallback(async () => {
    try { const d = await getDocument(id); setDoc(d); setNewName(d?.name ?? ''); if (d && IMAGE_EXTS.includes(d.file_type)) setUrl(await getSignedUrl(d.storage_path)); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  async function downloadOrShare(share: boolean) {
    if (!doc) return;
    try { const signed = await getSignedUrl(doc.storage_path, 300); const dest = `${FileSystem.cacheDirectory}${doc.doc_code}-${doc.name.replace(/[^\w.\-]+/g, '_')}`;
      const dl = await FileSystem.downloadAsync(signed, dest);
      if (share) { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dl.uri); else Alert.alert('Sharing not available', 'Sharing is not available on this device.'); }
      else Alert.alert('Downloaded', `Saved to app cache:\n${dl.uri}\nUse Share to send it to Files, Drive or any app.`); }
    catch (e: any) { setErr(e.message); }
  }
  async function rename() { if (!doc) return; try { await renameDocument(doc.id, newName); setDoc({ ...doc, name: newName.trim() }); Alert.alert('Renamed', 'Document name updated.'); } catch (e: any) { setErr(e.message); } }
  function confirmDelete() { if (!doc) return; Alert.alert('Delete document?', `"${doc.name}" will be deleted from the cloud and all your devices.`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteDocument(doc); router.replace('/(tabs)/files'); } catch (e: any) { setErr(e.message); } } } ]); }
  if (loading) return <Screen><Loading /></Screen>;
  if (!doc) return <Screen><ErrorText text={err ?? 'Document not found.'} /><GhostButton title="Back" onPress={() => router.back()} /></Screen>;
  const Action = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) =>
    <Pressable onPress={onPress} style={{ alignItems: 'center', marginHorizontal: 12 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon as any} size={20} color={colors.text} /></View>
      <Text style={{ color: colors.text, fontSize: 12, marginTop: 6 }}>{label}</Text></Pressable>;
  const Row = ({ k, v }: { k: string; v: string }) => <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ color: colors.muted, fontSize: 14 }}>{k}</Text><Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>{v}</Text></View>;
  return <Screen><ScrollView>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Pressable onPress={() => router.back()}><Text style={{ color: colors.text, fontSize: 20 }}>←</Text></Pressable>
      <Pressable onPress={confirmDelete}><Text style={{ fontSize: 18 }}>🗑️</Text></Pressable></View>
    <View style={{ alignItems: 'center', marginTop: 18 }}>
      {url ? <Image source={{ uri: url }} style={{ width: 220, height: 220, borderRadius: 12 }} resizeMode="cover" /> : <FileBadge ext={doc.file_type} size={84} />}
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 14, textAlign: 'center' }}>{doc.name}</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{formatBytes(doc.size_bytes)}  •  {fileTypeLabel(doc.file_type)}</Text></View>
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 20 }}>
      <Action icon="open-outline" label="Open" onPress={() => downloadOrShare(true)} />
      <Action icon="download-outline" label="Download" onPress={() => downloadOrShare(false)} />
      <Action icon="share-social-outline" label="Share" onPress={() => downloadOrShare(true)} />
      <Action icon="ellipsis-horizontal" label="More" onPress={confirmDelete} /></View>
    <Row k="File Name" v={doc.name} /><Row k="Type" v={fileTypeLabel(doc.file_type)} /><Row k="Size" v={formatBytes(doc.size_bytes)} />
    <Row k="Date Added" v={formatDate(doc.created_at)} /><Row k="Code" v={doc.doc_code} /><Row k="Folder" v={doc.category} />
    <PrimaryButton title="Copy Code" onPress={async () => { await Clipboard.setStringAsync(doc.doc_code); Alert.alert('Copied', `Code ${doc.doc_code} copied.`); }} />
    <Text style={{ color: colors.text, fontWeight: '600', marginTop: 16, marginBottom: 6 }}>Rename</Text>
    <TextInput value={newName} onChangeText={setNewName} placeholderTextColor={colors.muted} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, backgroundColor: colors.inputBg }} />
    <GhostButton title="Save New Name" onPress={rename} />
    <ErrorText text={err} />
  </ScrollView></Screen>;
}
