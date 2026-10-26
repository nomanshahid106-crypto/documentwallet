import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, PrimaryButton } from '../../src/components/ui';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
export default function Profile() {
  const { colors, preference } = useTheme(); const router = useRouter(); const { user, signOut } = useAuth();
  const name = (user?.user_metadata?.full_name as string) || 'DocVault User';
  const Row = ({ icon, label, value, onPress }: { icon: string; label: string; value?: string; onPress: () => void }) =>
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Ionicons name={icon as any} size={19} color={colors.text} /><Text style={{ color: colors.text, fontSize: 15, flex: 1, marginLeft: 12 }}>{label}</Text>
      {value ? <Text style={{ color: label === 'Cloud Sync' ? colors.success : colors.muted, fontSize: 13, marginRight: 6 }}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={15} color={colors.muted} /></Pressable>;
  return <Screen><ScrollView>
    <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>←  Settings</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person" size={26} color={colors.muted} /></View>
      <View style={{ marginLeft: 14 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{name}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{user?.email ?? ''}</Text></View></View>
    <Row icon="person-outline" label="Account" onPress={() => Alert.alert('Account', `Signed in as ${user?.email ?? '—'}`)} />
    <Row icon="shield-checkmark-outline" label="Security" onPress={() => router.push('/security')} />
    <Row icon="cloud-outline" label="Cloud Sync" value="On" onPress={() => router.push('/(tabs)/cloud')} />
    <Row icon="contrast-outline" label="Appearance" value={preference === 'system' ? 'System' : preference === 'dark' ? 'Dark' : 'Light'} onPress={() => router.push('/theme')} />
    <Row icon="help-circle-outline" label="Help & Support" onPress={() => Alert.alert('Help & Support', 'Email support from the address you registered with. User guides ship with the README of this project.')} />
    <Row icon="information-circle-outline" label="About" onPress={() => Alert.alert('DocVault', 'Simple. Clean. Secure.\nYour Documents, Your Control.\nVersion 1.0.0')} />
    <View style={{ marginTop: 22 }}><PrimaryButton title="Sign Out" onPress={async () => { await signOut(); router.replace('/login'); }} /></View>
  </ScrollView></Screen>;
}
