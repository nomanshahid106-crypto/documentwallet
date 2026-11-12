import React from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import type { LocalDocument } from '../lib/localStore';
import { formatBytes, formatDate } from '../lib/format';

// ---------- Animation helpers (built-in Animated API only) ----------

/** Subtle press feedback: scale to 0.98 while pressed, spring back on release. */
function usePressScale() {
  const scale = React.useRef(new Animated.Value(1)).current;
  const onPressIn = React.useCallback(() => {
    Animated.timing(scale, { toValue: 0.98, duration: 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [scale]);
  const onPressOut = React.useCallback(() => {
    Animated.timing(scale, { toValue: 1, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [scale]);
  return { scale, onPressIn, onPressOut };
}

/** One-shot staggered entrance for list rows: fade + slight rise, delay by index (capped). */
function Entrance({ index, children }: { index?: number; children: React.ReactNode }) {
  const v = React.useRef(new Animated.Value(index === undefined ? 1 : 0)).current;
  React.useEffect(() => {
    if (index === undefined) return;
    const anim = Animated.timing(v, {
      toValue: 1,
      duration: 260,
      delay: Math.min(index * 45, 300),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  return <Animated.View style={{ opacity: v, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ---------- Layout ----------

export function Screen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Entrance: fade in + slight rise, once on mount.
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const anim = Animated.timing(v, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + 18,
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 20,
        opacity: v,
        transform: [{ translateY }],
      }}
    >
      {children}
    </Animated.View>
  );
}

// ---------- Controls ----------

export function PrimaryButton({ title, onPress, disabled, loading }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled || loading} style={{ backgroundColor: colors.primaryBg, borderRadius: 10, paddingVertical: 15, alignItems: 'center', opacity: disabled ? 0.5 : 1, marginVertical: 8 }}>
        {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={{ color: colors.primaryText, fontSize: 16, fontWeight: '600' }}>{title}</Text>}
      </Pressable>
    </Animated.View>
  );
}
export function GhostButton({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginVertical: 8, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}
export function Field(props: React.ComponentProps<typeof TextInput> & { icon?: string }) {
  const { colors } = useTheme();
  const { icon, style, ...rest } = props as any;
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.inputBg, paddingHorizontal: 12, marginVertical: 6 }}>
    {icon ? <Ionicons name={icon as any} size={18} color={colors.muted} style={{ marginRight: 8 }} /> : null}
    <TextInput placeholderTextColor={colors.muted} style={[{ flex: 1, paddingVertical: 13, color: colors.text, fontSize: 15 }, style]} {...rest} />
  </View>;
}
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable onPress={onPress} style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: active ? colors.chipActiveBg : colors.surface, marginRight: 8, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
    <Text style={{ color: active ? colors.chipActiveText : colors.text, fontSize: 13, fontWeight: active ? '600' : '400' }}>{label}</Text></Pressable>;
}
export function FileBadge({ ext, size = 40 }: { ext: string; size?: number }) {
  const { colors } = useTheme();
  const isPdf = ext === 'pdf';
  return <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: isPdf ? '#FEE2E2' : '#DBEAFE', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: size * 0.32 }}>{isPdf ? '📄' : '🖼️'}</Text></View>;
}
export function DocRow({ doc, onPress, index }: { doc: LocalDocument; onPress: () => void; index?: number }) {
  const { colors } = useTheme();
  return <Entrance index={index}>
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <FileBadge ext={doc.file_type} /><View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }} numberOfLines={1}>{doc.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{formatBytes(doc.size_bytes)}  •  {formatDate(doc.created_at)}</Text>
        {doc.syncStatus === 'pending' ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>On this phone — will upload when online</Text> : null}
        {doc.syncStatus === 'failed' ? <Text style={{ color: colors.danger, fontSize: 11, marginTop: 2 }}>Upload failed — will retry automatically</Text> : null}
      </View><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>
  </Entrance>;
}
export function FolderRow({ name, count, onPress, index }: { name: string; count: number; onPress: () => void; index?: number }) {
  const { colors } = useTheme();
  return <Entrance index={index}>
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <Ionicons name="folder-outline" size={20} color={colors.text} />
      <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: colors.text, fontSize: 15 }}>{name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{count} files</Text></View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>
  </Entrance>;
}
export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return <View style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={{ fontSize: 36 }}>🗂️</Text>
    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 10 }}>{title}</Text>
    {subtitle ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>{subtitle}</Text> : null}</View>;
}
export function Loading({ label = 'Loading…' }: { label?: string }) {
  const { colors } = useTheme();
  return <View style={{ alignItems: 'center', paddingVertical: 40 }}><ActivityIndicator color={colors.text} /><Text style={{ color: colors.muted, marginTop: 8 }}>{label}</Text></View>;
}
export function ProgressBar({ value }: { value: number }) {
  const { colors } = useTheme();
  const anim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const a = Animated.timing(anim, { toValue: Math.max(0, Math.min(1, value)), duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [value, anim]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.card, overflow: 'hidden', marginVertical: 8 }}><Animated.View style={{ height: 8, width, backgroundColor: colors.primaryBg }} /></View>;
}
export function ErrorText({ text }: { text?: string | null }) {
  const { colors } = useTheme();
  if (!text) return null;
  return <Text style={{ color: colors.danger, fontSize: 13, marginVertical: 6 }}>{text}</Text>;
}
export function ConfigBanner() {
  const { colors } = useTheme();
  return <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 12 }}>
    <Text style={{ color: colors.text, fontSize: 13 }}>Backend not configured — add the Supabase URL and anon key from the README to enable sign-in, upload and sync.</Text></View>;
}
