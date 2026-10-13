import React from 'react';
import { Pressable, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.line }, style]}>
      {children}
    </View>
  );
}

export function T({ children, size = 15, weight = '400', sub, style, numberOfLines, onPress }: {
  children: React.ReactNode; size?: number; weight?: TextStyle['fontWeight']; sub?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number; onPress?: () => void;
}) {
  const { c } = useTheme();
  return (
    <Text onPress={onPress} numberOfLines={numberOfLines} style={[{ fontSize: size, fontWeight: weight, color: sub ? c.sub : c.text }, style]}>
      {children}
    </Text>
  );
}

export function Button({ title, onPress, kind = 'primary', icon, disabled, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = kind === 'primary' ? c.accent : 'transparent';
  const fg = kind === 'primary' ? c.accentText : kind === 'danger' ? c.danger : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, backgroundColor: bg,
        borderWidth: kind === 'primary' ? 0 : 1, borderColor: kind === 'danger' ? c.danger : c.line,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      }, style]}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '600', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginRight: 8, marginBottom: 8,
        backgroundColor: active ? c.accent : c.card, borderWidth: 1, borderColor: active ? c.accent : c.line,
        flexDirection: 'row', alignItems: 'center', gap: 6,
      }}
    >
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
      <Text style={{ color: active ? c.accentText : c.text, fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const { c } = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <T size={12} sub style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</T> : null}
      <TextInput
        placeholderTextColor={c.sub}
        {...rest}
        style={[{
          backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.text,
        }, style]}
      />
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Section({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }}>
      <T size={13} sub weight="600" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</T>
      {right}
    </Row>
  );
}

export function IconDot({ icon, color, size = 40 }: { icon: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={size * 0.48} color={color} />
    </View>
  );
}
