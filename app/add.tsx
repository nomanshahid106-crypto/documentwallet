import React, { useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Chip, PrimaryButton, ProgressBar, ErrorText } from '../src/components/ui';
import { useTheme } from '../src/context/ThemeContext';
import { uploadDocument, UploadState } from '../src/services/documents';
import { FOLDERS, formatBytes } from '../src/lib/format';
interface Picked { uri: string; name: string; sizeBytes: number; mimeType: string }
/** Pickers can report a missing/0 size — resolve the real size from disk at pick time. */
async function resolveSize(uri: string, reported?: number): Promise<number> {
  if (reported && reported > 0) return reported;
  try { const i = await FileSystem.getInfoAsync(uri); return i.exists ? ((i as any).size ?? 0) : 0; } catch { return 0; }
}
export default function Add() {
  const { colors } = useTheme(); const router = useRouter(); const params = useLocalSearchParams<{ scannedUri?: string }>();
  const [picked, setPicked] = useState<Picked | null>(params.scannedUri ? { uri: params.scannedUri, name: 'Scanned Document.jpg', sizeBytes: 0, mimeType: 'image/jpeg' } : null);
  const [folder, setFolder] = useState<string>('Personal'); const [state, setState] = useState<UploadState | null>(null);
  const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState(false);
  // Gentle pulse on the upload icon while an upload is in flight.
  const pulse = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (state === 'uploading' || state === 'saving') {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]));
      loop.start();
      return () => { loop.stop(); pulse.setValue(1); };
    }
  }, [state, pulse]);
  React.useEffect(() => { if (params.scannedUri) { resolveSize(params.scannedUri).then(size => setPicked({ uri: params.scannedUri!, name: 'Scanned Document.jpg', sizeBytes: size, mimeType: 'image/jpeg' })); } }, [params.scannedUri]);
  async function browse() {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf','image/*'], copyToCacheDirectory: true });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setPicked({ uri: a.uri, name: a.name, sizeBytes: await resolveSize(a.uri, a.size), mimeType: a.mimeType ?? 'application/pdf' }); setErr(null); }
  }
  async function gallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!perm.granted) { setErr('Gallery permission was denied.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setPicked({ uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, sizeBytes: await resolveSize(a.uri, a.fileSize), mimeType: a.mimeType ?? 'image/jpeg' }); setErr(null); }
  }
  async function photo() {
    const perm = await ImagePicker.requestCameraPermissionsAsync(); if (!perm.granted) { setErr('Camera permission was denied.'); return; }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setPicked({ uri: a.uri, name: a.fileName ?? `photo-${Date.now()}.jpg`, sizeBytes: await resolveSize(a.uri, a.fileSize), mimeType: a.mimeType ?? 'image/jpeg' }); setErr(null); }
  }
  async function upload() {
    if (!picked) { setErr('Choose a file, photo or scan first.'); return; }
    setErr(null); setDone(false);
    try {
      await uploadDocument({ uri: picked.uri, name: picked.name, sizeBytes: picked.sizeBytes, mimeType: picked.mimeType, category: folder }, setState);
      // Brief success state on the button, then the usual confirmation + navigation.
      setDone(true);
      setTimeout(() => { Alert.alert('Uploaded', 'Your document is saved and synced.'); router.replace('/(tabs)/files'); }, 900);
    }
    catch (e: any) { setErr(e.message); }
  }
  const Row = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) =>
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, paddingVertical: 15, paddingHorizontal: 14, marginVertical: 5 }}>
      <Ionicons name={icon as any} size={19} color={colors.text} /><Text style={{ color: colors.text, fontSize: 15, marginLeft: 12 }}>{label}</Text></Pressable>;
  const progress = state === 'validating' ? 0.2 : state === 'uploading' ? 0.6 : state === 'saving' ? 0.9 : state === 'done' ? 1 : 0;
  return <Screen><ScrollView>
    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 }}>Add Document</Text>
    <Pressable onPress={browse} style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 14, paddingVertical: 34, alignItems: 'center', backgroundColor: colors.card }}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}><Ionicons name="cloud-upload-outline" size={30} color={colors.text} /></Animated.View><Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 10 }}>Tap to upload</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>or choose from device</Text></Pressable>
    <View style={{ marginTop: 14 }}>
      <Row icon="camera-outline" label="Take Photo" onPress={photo} />
      <Row icon="image-outline" label="Choose from Gallery" onPress={gallery} />
      <Row icon="folder-outline" label="Browse Files" onPress={browse} />
      <Row icon="scan-outline" label="Scan Document" onPress={() => router.push('/scan')} /></View>
    {picked ? <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 12 }}>
      <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{picked.name}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{picked.sizeBytes ? formatBytes(picked.sizeBytes) : 'Size checked on upload'} • {picked.mimeType}</Text></View> : null}
    <Text style={{ color: colors.text, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Folder</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{FOLDERS.map(f => <View key={f} style={{ marginBottom: 8 }}><Chip label={f} active={folder === f} onPress={() => setFolder(f)} /></View>)}</View>
    {state ? <ProgressBar value={progress} /> : null}
    {state ? <Text style={{ color: colors.muted, fontSize: 12, textTransform: done ? 'none' : 'capitalize' }}>{done ? 'Uploaded ✓' : `${state}…`}</Text> : null}
    <ErrorText text={err} />
    <PrimaryButton title={done ? 'Uploaded ✓' : state === 'error' ? 'Retry Upload' : 'Upload Document'} onPress={upload} disabled={done} loading={state === 'uploading' || state === 'saving'} />
  </ScrollView></Screen>;
}
