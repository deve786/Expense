import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { METHODS, deleteExpense, getExpense, listCategories, saveExpense, type Category } from '@/db';
import { fromStr, prettyDate, toStr, todayStr } from '@/dates';
import { useTheme } from '@/theme';
import { Button, Chip, Field, Row, T } from '@/ui';

export default function ExpenseForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : undefined;
  const router = useRouter();
  const { c, symbol } = useTheme();

  const [cats, setCats] = useState<Category[]>([]);
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState<number | null>(null);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<string>('UPI');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const cs = await listCategories();
      setCats(cs);
      if (editId) {
        const e = await getExpense(editId);
        if (e) {
          setAmount(String(e.amount));
          setCatId(e.category_id);
          setDate(e.date);
          setNote(e.note);
          setMethod(e.method);
        }
      } else if (cs.length) {
        setCatId(cs[0].id);
      }
    })();
  }, [editId]);

  const value = parseFloat(amount.replace(/,/g, ''));
  const valid = !isNaN(value) && value > 0 && catId !== null;

  async function onSave() {
    if (!valid || catId === null) return;
    await saveExpense({ id: editId, amount: Math.round(value * 100) / 100, category_id: catId, date, note: note.trim(), method });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  }

  function onDelete() {
    if (!editId) return;
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteExpense(editId); router.back(); } },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <T size={20} weight="700">{editId ? 'Edit expense' : 'New expense'}</T>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={c.text} />
          </Pressable>
        </Row>

        <T size={12} sub style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>Amount</T>
        <Row style={{ marginBottom: 18, marginTop: 4 }}>
          <T size={36} weight="700" sub>{symbol}</T>
          <Field
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="decimal-pad"
            autoFocus={!editId}
            style={{ fontSize: 36, fontWeight: '700', borderWidth: 0, backgroundColor: 'transparent', flex: 1 }}
          />
        </Row>

        <T size={12} sub style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>Category</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cats.map((k) => (
            <Chip key={k.id} label={k.name} color={k.color} active={catId === k.id} onPress={() => setCatId(k.id)} />
          ))}
        </View>

        <T size={12} sub style={{ marginTop: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>Date</T>
        <Pressable
          onPress={() => setShowPicker((s) => !s)}
          style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 14, marginBottom: 14 }}
        >
          <Row style={{ justifyContent: 'space-between' }}>
            <T>{prettyDate(date)} · {date}</T>
            <Ionicons name="calendar-outline" size={18} color={c.sub} />
          </Row>
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={fromStr(date)}
            mode="date"
            maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') setShowPicker(false);
              if (d) setDate(toStr(d));
            }}
          />
        )}

        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Lunch with team" />

        <T size={12} sub style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>Paid with</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {METHODS.map((m) => (
            <Chip key={m} label={m} active={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>

        <Button title={editId ? 'Save changes' : 'Add expense'} onPress={onSave} disabled={!valid} style={{ marginTop: 20 }} />
        {editId ? <Button title="Delete" kind="danger" onPress={onDelete} style={{ marginTop: 10 }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
