import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Screen, PrimaryButton, GhostButton, ErrorText } from '../src/components/ui';
import { useTheme } from '../src/context/ThemeContext';
export default function Scan() {
  const { colors } = useTheme(); const router = useRouter();
  const [perm, requestPerm] = useCameraPermissions(); const cam = useRef<CameraView>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  if (!perm) return <Screen><Text style={{ color: colors.text }}>Checking camera permission…</Text></Screen>;
  if (!perm.granted) return <Screen><Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Camera permission needed</Text>
    <Text style={{ color: colors.muted, marginVertical: 10 }}>DocVault uses the camera only to scan documents you choose to save.</Text>
    <PrimaryButton title="Allow Camera" onPress={requestPerm} /></Screen>;
  async function capture() {
    setBusy(true); setErr(null);
    try { const photo = await cam.current?.takePictureAsync({ quality: 0.85 }); if (!photo) throw new Error('Capture failed. Try again.'); router.replace({ pathname: '/add', params: { scannedUri: photo.uri } }); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  return <View style={{ flex: 1, backgroundColor: '#000' }}>
    <CameraView ref={cam} style={{ flex: 1 }} facing="back" />
    <View style={{ position: 'absolute', left: 24, right: 24, top: 70, bottom: 140, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 14, opacity: 0.85 }} />
    <View style={{ position: 'absolute', bottom: 34, left: 20, right: 20 }}>
      <Text style={{ color: '#FFF', textAlign: 'center', marginBottom: 10 }}>Place the document inside the frame</Text>
      <ErrorText text={err} /><PrimaryButton title={busy ? 'Capturing…' : 'Capture Scan'} onPress={capture} loading={busy} />
      <GhostButton title="Cancel" onPress={() => router.back()} /></View>
  </View>;
}
