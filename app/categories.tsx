import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addCategory, deleteCategory, listCategories, type Category } from '@/db';
import { useTheme } from '@/theme';
import { Button, Card, Field, IconDot, Row, T } from '@/ui';

const ICONS = ['cafe-outline', 'fitness-outline', 'airplane-outline', 'school-outline', 'paw-outline', 'gift-outline', 'phone-portrait-outline', 'construct-outline', 'game-controller-outline', 'cart-outline'];
const COLORS = ['#E4572E', '#2E86AB', '#A23B72', '#F18F01', '#3BB273', '#7768AE', '#5C6B73', '#17BEBB'];

export default function Categories() {
  const { c } = useTheme();
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);

  const load = useCallback(async () => setCats(await listCategories()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function add() {
    const n = name.trim();
    if (!n) return;
    if (cats.some((k) => k.name.toLowerCase() === n.toLowerCase())) {
      Alert.alert('Already exists', 'Pick a different name.');
      return;
    }
    await addCategory(n, icon, color);
    setName('');
    load();
  }

  function remove(k: Category) {
    if (k.name === 'Other') {
      Alert.alert('Cannot delete', '"Other" is the fallback category.');
      return;
    }
    Alert.alert(`Delete ${k.name}?`, 'Its expenses move to "Other".', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCategory(k.id); load(); } },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <T size={20} weight="700">Categories</T>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="close" size={24} color={c.text} /></Pressable>
      </Row>

      <Card>
        {cats.map((k, i) => (
          <Row key={k.id} style={{ paddingVertical: 8, gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <IconDot icon={k.icon} color={k.color} size={36} />
            <T weight="600" style={{ flex: 1 }}>{k.name}</T>
            <Pressable onPress={() => remove(k)} hitSlop={10}><Ionicons name="trash-outline" size={20} color={c.sub} /></Pressable>
          </Row>
        ))}
      </Card>

      <T size={13} sub weight="600" style={{ marginTop: 24, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>New category</T>
      <Field value={name} onChangeText={setName} placeholder="Name" />
      <Row style={{ flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        {ICONS.map((i) => (
          <Pressable key={i} onPress={() => setIcon(i)} style={{ borderRadius: 20, borderWidth: 2, borderColor: icon === i ? c.text : 'transparent' }}>
            <IconDot icon={i} color={color} size={40} />
          </Pressable>
        ))}
      </Row>
      <Row style={{ flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        {COLORS.map((col) => (
          <Pressable
            key={col}
            onPress={() => setColor(col)}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: col, borderWidth: 3, borderColor: color === col ? c.text : 'transparent' }}
          />
        ))}
      </Row>
      <Button title="Add category" onPress={add} disabled={!name.trim()} />
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
