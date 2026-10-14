import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  METHODS, deleteExpense, findOrCreateCategory, getExpense, listCategories, listExpenseItems,
  saveExpense, saveExpenseItems, type Category,
} from '@/db';
import { fromStr, prettyDate, toStr, todayStr } from '@/dates';
import { numerals, radius, useTheme } from '@/theme';
import { Button, Chip, Field, Header, Row, Screen, T } from '@/ui';

type DraftItem = { name: string; amount: string };

const parseAmt = (s: string) => parseFloat(s.replace(/,/g, ''));
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function ExpenseForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : undefined;
  const router = useRouter();
  const { c, symbol } = useTheme();

  const [cats, setCats] = useState<Category[]>([]);
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
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
        const existing = await listExpenseItems(editId);
        if (existing.length) setItems(existing.map((it) => ({ name: it.name, amount: String(it.amount) })));
      } else if (cs.length) {
        setCatId(cs[0].id);
      }
    })();
  }, [editId]);

  const hasItems = items.length > 0;
  const itemsTotal = items.reduce((s, it) => s + (parseAmt(it.amount) || 0), 0);
  const manualValue = parseAmt(amount);
  const value = hasItems ? itemsTotal : manualValue;
  // A row with nothing typed yet is just not filled in — it shouldn't block
  // saving the items that already have an amount.
  const itemsValid = !hasItems || items.some((it) => (parseAmt(it.amount) || 0) > 0);
  const isOther = cats.find((k) => k.id === catId)?.name === 'Other';
  const valid = !isNaN(value) && value > 0 && catId !== null && itemsValid;

  function startItems() {
    // Seed with just the one row carrying forward whatever was already typed —
    // "Add item" grows the list from here, so Save isn't blocked by a second,
    // still-empty row the user never asked for.
    const seed = !isNaN(manualValue) && manualValue > 0 ? amount : '';
    setItems([{ name: '', amount: seed }]);
  }
  function clearItems() {
    if (itemsTotal > 0) setAmount(String(itemsTotal));
    setItems([]);
  }
  function addItem() {
    setItems((prev) => [...prev, { name: '', amount: '' }]);
  }
  function updateItem(i: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSave() {
    if (!valid || catId === null) return;
    const custom = isOther ? customCat.trim() : '';
    const finalCatId = custom ? await findOrCreateCategory(custom) : catId;
    const newId = await saveExpense({ id: editId, amount: round2(value), category_id: finalCatId, date, note: note.trim(), method });
    const cleanItems = hasItems
      ? items.map((it) => ({ name: it.name.trim(), amount: round2(parseAmt(it.amount) || 0) })).filter((it) => it.amount > 0)
      : [];
    await saveExpenseItems(newId, cleanItems);
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

  const itemInputStyle = {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: c.text,
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Header title={editId ? 'Edit expense' : 'New expense'} onClose={() => router.back()} />

          <Row style={{ alignItems: 'center', gap: 6, marginTop: 6, marginBottom: hasItems ? 2 : 22 }}>
            <T size={34} weight="600" sub>{symbol}</T>
            {hasItems ? (
              <T size={44} weight="700" tabular style={{ flex: 1, letterSpacing: -1.2 }}>
                {itemsTotal % 1 === 0 ? itemsTotal : itemsTotal.toFixed(2)}
              </T>
            ) : (
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
            )}
          </Row>

          {hasItems ? (
            <View style={{ marginBottom: 20 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <T size={13} sub>{items.length} item{items.length === 1 ? '' : 's'}</T>
                <T size={13} sub onPress={clearItems}>Clear</T>
              </Row>
              {items.map((it, i) => (
                <Row key={i} style={{ gap: 8, marginBottom: 8 }}>
                  <TextInput
                    value={it.name}
                    onChangeText={(t) => updateItem(i, { name: t })}
                    placeholder={`Item ${i + 1}`}
                    placeholderTextColor={c.faint}
                    style={[itemInputStyle, { flex: 1 }]}
                  />
                  <TextInput
                    value={it.amount}
                    onChangeText={(t) => updateItem(i, { amount: t })}
                    placeholder="0"
                    placeholderTextColor={c.faint}
                    keyboardType="decimal-pad"
                    style={[itemInputStyle, numerals, { width: 92, textAlign: 'right' }]}
                  />
                  <Pressable onPress={() => removeItem(i)} hitSlop={10} accessibilityLabel={`Remove item ${i + 1}`}>
                    <Ionicons name="close-circle" size={22} color={c.faint} />
                  </Pressable>
                </Row>
              ))}
              <Pressable onPress={addItem} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Ionicons name="add-circle-outline" size={16} color={c.sub} />
                <T size={13.5} sub>Add item</T>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={startItems} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 }}>
              <Ionicons name="add-circle-outline" size={16} color={c.sub} />
              <T size={13.5} sub>Split into items</T>
            </Pressable>
          )}

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

          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder={hasItems ? 'e.g. Walmart run' : 'e.g. Lunch with team'} />

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
