import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { METHODS, addRecurring, deleteRecurring, listCategories, listRecurring, type Category, type Recurring } from '@/db';
import { fmtMoney } from '@/stats';
import { useTheme } from '@/theme';
import { Button, Card, Chip, Field, Row, T } from '@/ui';

export default function RecurringScreen() {
  const { c, symbol } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<Recurring[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState('1');
  const [catId, setCatId] = useState<number | null>(null);
  const [method, setMethod] = useState<string>('UPI');

  const load = useCallback(async () => setList(await listRecurring()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    listCategories().then((cs) => { setCats(cs); if (cs.length) setCatId(cs[0].id); });
  }, []);

  const amt = parseFloat(amount);
  const d = parseInt(day, 10);
  const valid = !isNaN(amt) && amt > 0 && !isNaN(d) && d >= 1 && d <= 31 && catId !== null;

  async function add() {
    if (!valid || catId === null) return;
    await addRecurring({ amount: amt, category_id: catId, note: note.trim(), method, day: d });
    setAmount(''); setNote(''); setDay('1');
    load();
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <T size={20} weight="700">Recurring expenses</T>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="close" size={24} color={c.text} /></Pressable>
      </Row>
      <T size={13} sub style={{ marginBottom: 16 }}>Added automatically on the chosen day each month (when you open the app).</T>

      {list.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          {list.map((r, i) => (
            <Row key={r.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <View style={{ flex: 1 }}>
                <T weight="600">{r.note || r.cat_name}</T>
                <T size={12} sub>{r.cat_name} · day {r.day} · {r.method}</T>
              </View>
              <T weight="700" style={{ marginRight: 12 }}>{fmtMoney(r.amount, symbol)}</T>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert('Remove recurring?', 'Past entries stay in your history.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: async () => { await deleteRecurring(r.id); load(); } },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={20} color={c.sub} />
              </Pressable>
            </Row>
          ))}
        </Card>
      )}

      <T size={13} sub weight="600" style={{ marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>New recurring</T>
      <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
      <Field label="Note" value={note} onChangeText={setNote} placeholder="e.g. Rent, Netflix" />
      <Field label="Day of month (1-31)" value={day} onChangeText={setDay} keyboardType="number-pad" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cats.map((k) => <Chip key={k.id} label={k.name} color={k.color} active={catId === k.id} onPress={() => setCatId(k.id)} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {METHODS.map((m) => <Chip key={m} label={m} active={method === m} onPress={() => setMethod(m)} />)}
      </View>
      <Button title="Add recurring" onPress={add} disabled={!valid} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}
