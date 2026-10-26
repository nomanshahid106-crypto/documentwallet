import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
export default function TabsLayout() {
  const { colors } = useTheme();
  const icon = (name: string) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name as any} size={size} color={color} />;
  return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, tabBarActiveTintColor: colors.text, tabBarInactiveTintColor: colors.muted }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-outline') }} />
    <Tabs.Screen name="files" options={{ title: 'Files', tabBarIcon: icon('folder-outline') }} />
    <Tabs.Screen name="cloud" options={{ title: 'Cloud', tabBarIcon: icon('cloud-outline') }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-outline') }} />
  </Tabs>;
}
