import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, PrimaryButton } from '../src/components/ui';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
export default function Welcome() {
  const { colors } = useTheme(); const router = useRouter(); const { session } = useAuth();
  React.useEffect(() => { if (session) router.replace('/(tabs)'); }, [session]);
  return <Screen><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 84, height: 84, borderWidth: 2.5, borderColor: colors.text, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 38 }}>🗂️</Text></View>
    <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 22 }}>DocVault</Text>
    <Text style={{ color: colors.muted, fontSize: 15, marginTop: 8 }}>Your Documents, Always Safe</Text>
    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>Save  •  Organize  •  Access Anywhere</Text></View>
    <PrimaryButton title="Get Started" onPress={() => router.push('/signup')} />
    <Pressable onPress={() => router.push('/login')} style={{ alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>Already have an account?  <Text style={{ color: colors.text, fontWeight: '700' }}>Log In</Text></Text></Pressable>
  </Screen>;
}
