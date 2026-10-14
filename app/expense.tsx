import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { METHODS, deleteExpense, findOrCreateCategory, getExpense, listCategories, saveExpense, type Category } from '@/db';
import { fromStr, prettyDate, toStr, todayStr } from '@/dates';
import { numerals, radius, useTheme } from '@/theme';
import { Button, Chip, Field, Header, Row, Screen, T } from '@/ui';

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
  const [customCat, setCustomCat] = useState('');

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
  const isOther = cats.find((k) => k.id === catId)?.name === 'Other';
  const valid = !isNaN(value) && value > 0 && catId !== null;

  async function onSave() {
    if (!valid || catId === null) return;
    const custom = isOther ? customCat.trim() : '';
    const finalCatId = custom ? await findOrCreateCategory(custom) : catId;
    await saveExpense({ id: editId, amount: Math.round(value * 100) / 100, category_id: finalCatId, date, note: note.trim(), method });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  }

  function onDelete() {
    if (!editId) return;
    Alert.alert('Delete this expense?', 'It will be removed from your history.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteExpense(editId); router.back(); } },
    ]);
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Header title={editId ? 'Edit expense' : 'New expense'} onClose={() => router.back()} />

          <Row style={{ alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 22 }}>
            <T size={34} weight="600" sub>{symbol}</T>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={c.faint}
              keyboardType="decimal-pad"
              autoFocus={!editId}
              style={[{
                flex: 1, fontSize: 44, fontWeight: '700', color: c.text,
                padding: 0, letterSpacing: -1.2,
              }, numerals]}
            />
          </Row>

          <T size={13} sub style={{ marginBottom: 9 }}>Category</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cats.map((k) => (
              <Chip key={k.id} label={k.name} color={k.color} active={catId === k.id} onPress={() => setCatId(k.id)} />
            ))}
          </View>

          {isOther && (
            <Field
              label="Name the new category (optional)"
              value={customCat}
              onChangeText={setCustomCat}
              placeholder="e.g. Gifts"
              maxLength={30}
              containerStyle={{ marginTop: 12 }}
            />
          )}

          <T size={13} sub style={{ marginTop: 16, marginBottom: 9 }}>Date</T>
          <Pressable
            onPress={() => setShowPicker((s) => !s)}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 14, marginBottom: 16 }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={15}>{prettyDate(date)}</T>
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

          <T size={13} sub style={{ marginBottom: 9 }}>Paid with</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {METHODS.map((m) => (
              <Chip key={m} label={m} active={method === m} onPress={() => setMethod(m)} />
            ))}
          </View>

          <Button title={editId ? 'Save changes' : 'Add expense'} onPress={onSave} disabled={!valid} style={{ marginTop: 22 }} />
          {editId ? <Button title="Delete expense" kind="danger" onPress={onDelete} style={{ marginTop: 10 }} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
