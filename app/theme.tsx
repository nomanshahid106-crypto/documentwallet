import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/ui';
import { useTheme } from '../src/context/ThemeContext';
import { ThemePreference } from '../src/theme/theme';
const OPTIONS: { key: ThemePreference; label: string; hint: string }[] = [
  { key: 'light', label: 'Light', hint: 'White background, black text' },
  { key: 'dark', label: 'Dark', hint: 'Dark background (#121212), white text' },
  { key: 'system', label: 'System Default', hint: 'Follow your phone setting' }];
export default function ThemeScreen() {
  const { colors, preference, setPreference } = useTheme(); const router = useRouter();
  return <Screen>
    <Pressable onPress={() => router.back()}><Text style={{ color: colors.text, fontSize: 20 }}>←</Text></Pressable>
    <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 14 }}>Appearance</Text>
    <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 12 }}>DocVault is monochrome in both modes, exactly like your design samples.</Text>
    {OPTIONS.map(o => <Pressable key={o.key} onPress={() => setPreference(o.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.text, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        {preference === o.key ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text }} /> : null}</View>
      <View><Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{o.label}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{o.hint}</Text></View></Pressable>)}
  </Screen>;
}
