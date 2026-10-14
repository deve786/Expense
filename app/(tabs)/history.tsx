import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { listCategories, listExpenses, type Category, type ExpenseRow } from '@/db';
import { sum } from '@/stats';
import { Chip, Divider, Empty, Field, Money, Row, Screen, T, Title } from '@/ui';
import { ExpenseItem } from '@/ExpenseItem';

export default function History() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [catName, setCatName] = useState<string | null>(null);

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
      if (catName && r.cat_name !== catName) return false;
      if (!needle) return true;
      return (
        r.note.toLowerCase().includes(needle) ||
        r.cat_name.toLowerCase().includes(needle) ||
        r.method.toLowerCase().includes(needle) ||
        String(r.amount).includes(needle) ||
        r.date.includes(needle)
      );
    });
  }, [rows, q, catName]);

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Title style={{ marginBottom: 14 }}>History</Title>
        <Field value={q} onChangeText={setQ} placeholder="Search notes, categories, amounts" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        style={{ flexGrow: 0 }}
      >
        <Chip label="All" active={catName === null} onPress={() => setCatName(null)} />
        {cats.map((k) => (
          <Chip
            key={k.id}
            label={k.name}
            color={k.color}
            active={catName === k.name}
            onPress={() => setCatName(catName === k.name ? null : k.name)}
          />
        ))}
      </ScrollView>

      <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 }}>
        <T size={13} sub tabular>{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</T>
        <Money value={sum(filtered)} size={13} weight="600" />
      </Row>
      <Divider style={{ marginHorizontal: 20 }} />

      <FlatList
        data={filtered}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        renderItem={({ item }) => <ExpenseItem e={item} />}
        ListEmptyComponent={
          <Empty
            title={rows.length ? 'Nothing matches' : 'No expenses yet'}
            hint={rows.length ? 'Try a different search or category.' : 'Add your first one from Home.'}
          />
        }
        keyboardShouldPersistTaps="handled"
      />
    </Screen>
  );
}
