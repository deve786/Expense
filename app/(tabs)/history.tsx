import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listCategories, listExpenses, type Category, type ExpenseRow } from '@/db';
import { fmtMoney, sum } from '@/stats';
import { useTheme } from '@/theme';
import { Chip, Field, Row, T } from '@/ui';
import { ExpenseItem } from '@/ExpenseItem';

export default function History() {
  const { symbol } = useTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [catId, setCatId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setRows(await listExpenses());
        setCats(await listCategories());
      })();
    }, [])
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (catId && r.cat_name !== catId) return false;
      if (!needle) return true;
      return (
        r.note.toLowerCase().includes(needle) ||
        r.cat_name.toLowerCase().includes(needle) ||
        r.method.toLowerCase().includes(needle) ||
        String(r.amount).includes(needle) ||
        r.date.includes(needle)
      );
    });
  }, [rows, q, catId]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 16 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <T size={28} weight="700" style={{ marginBottom: 12 }}>History</T>
        <Field value={q} onChangeText={setQ} placeholder="Search note, category, amount, date" />
      </View>
      <View style={{ height: 44 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <Chip label="All" active={catId === null} onPress={() => setCatId(null)} />
          {cats.map((k) => (
            <Chip key={k.id} label={k.name} color={k.color} active={catId === k.name} onPress={() => setCatId(catId === k.name ? null : k.name)} />
          ))}
        </ScrollView>
      </View>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 4 }}>
        <T size={12} sub>{filtered.length} entries</T>
        <T size={12} sub weight="600">{fmtMoney(sum(filtered), symbol)}</T>
      </Row>
      <FlatList
        data={filtered}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        renderItem={({ item }) => <ExpenseItem e={item} />}
        ListEmptyComponent={<T sub style={{ marginTop: 24 }}>Nothing found.</T>}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}
