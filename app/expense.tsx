import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  METHODS, deleteExpense, findOrCreateCategory, getExpense, listCategories, listExpenseItems,
  saveExpense, saveExpenseItems, type Category, type ExpenseItem as ExpenseItemRow,
} from '@/db';
import { fromStr, prettyDate, toStr, todayStr } from '@/dates';
import { numerals, radius, useTheme } from '@/theme';
import { Button, Chip, ConfirmDialog, Divider, Field, Header, IconDot, Money, Row, Screen, T } from '@/ui';

type DraftItem = { name: string; qty: string; amount: string };
type Mode = 'view' | 'edit';

const parseAmt = (s: string) => parseFloat(s.replace(/,/g, ''));
const round2 = (n: number) => Math.round(n * 100) / 100;
const lineTotal = (it: DraftItem) => (parseAmt(it.qty) || 1) * (parseAmt(it.amount) || 0);

/** Keyword -> default category name. First match wins; falls back to "Other" when nothing matches. */
const CATEGORY_KEYWORDS: [string, string[]][] = [
  ['Food', ['food', 'restaurant', 'pizza', 'coffee', 'cafe', 'lunch', 'dinner', 'breakfast', 'snack', 'swiggy', 'zomato', 'grocery', 'groceries']],
  ['Transport', ['uber', 'ola', 'taxi', 'cab', 'bus', 'train', 'metro', 'fuel', 'petrol', 'diesel', 'parking', 'auto']],
  ['Shopping', ['amazon', 'flipkart', 'shopping', 'clothes', 'shoes', 'mall']],
  ['Bills', ['electricity', 'water bill', 'internet', 'wifi', 'phone bill', 'recharge', 'bill']],
  ['Rent', ['rent']],
  ['Health', ['doctor', 'medicine', 'pharmacy', 'hospital', 'clinic', 'medical']],
  ['Entertainment', ['movie', 'netflix', 'spotify', 'cinema', 'concert', 'game']],
];

function guessCategoryName(title: string): string | null {
  const t = title.toLowerCase();
  if (!t.trim()) return null;
  for (const [name, words] of CATEGORY_KEYWORDS) {
    if (words.some((w) => t.includes(w))) return name;
  }
  return 'Other';
}

export default function ExpenseForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id || undefined;
  const router = useRouter();
  const { c, symbol } = useTheme();

  const [mode, setMode] = useState<Mode>(editId ? 'view' : 'edit');
  const [cats, setCats] = useState<Category[]>([]);
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [viewItems, setViewItems] = useState<ExpenseItemRow[]>([]);
  const [catId, setCatId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<string>('UPI');
  const [showPicker, setShowPicker] = useState(false);
  const [customCat, setCustomCat] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Stops auto-categorising from title once the user has picked one themselves.
  const catAutoPick = useRef(true);

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
          setNotes(e.notes);
          setMethod(e.method);
        }
        const existing = await listExpenseItems(editId);
        setViewItems(existing);
        if (existing.length) {
          setItems(existing.map((it) => ({ name: it.name, qty: String(it.quantity), amount: String(it.amount) })));
        }
        catAutoPick.current = false;
      } else if (cs.length) {
        setCatId(cs[0].id);
      }
    })();
  }, [editId]);

  function onChangeNote(t: string) {
    setNote(t);
    if (!catAutoPick.current) return;
    const guess = guessCategoryName(t);
    if (!guess) return;
    const match = cats.find((k) => k.name === guess);
    if (match) setCatId(match.id);
  }

  function onPickCategory(id: string) {
    catAutoPick.current = false;
    setCatId(id);
  }

  const hasItems = items.length > 0;
  const itemsTotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const manualValue = parseAmt(amount);
  const value = hasItems ? itemsTotal : manualValue;
  // A row with nothing typed yet is just not filled in — it shouldn't block
  // saving the items that already have an amount.
  const itemsValid = !hasItems || items.some((it) => lineTotal(it) > 0);
  const isOther = cats.find((k) => k.id === catId)?.name === 'Other';
  const valid = !isNaN(value) && value > 0 && catId !== null && itemsValid;
  const cat = cats.find((k) => k.id === catId);

  function startItems() {
    // Seed with just the one row carrying forward whatever was already typed —
    // "Add item" grows the list from here, so Save isn't blocked by a second,
    // still-empty row the user never asked for.
    const seed = !isNaN(manualValue) && manualValue > 0 ? amount : '';
    setItems([{ name: '', qty: '1', amount: seed }]);
  }
  function clearItems() {
    if (itemsTotal > 0) setAmount(String(itemsTotal));
    setItems([]);
  }
  function addItem() {
    setItems((prev) => [...prev, { name: '', qty: '1', amount: '' }]);
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
    const newId = await saveExpense({
      id: editId, amount: round2(value), category_id: finalCatId, date,
      note: note.trim(), notes: notes.trim(), method,
    });
    const cleanItems = hasItems
      ? items
          .map((it) => ({ name: it.name.trim(), quantity: parseAmt(it.qty) || 1, amount: round2(parseAmt(it.amount) || 0) }))
          .filter((it) => it.quantity * it.amount > 0)
      : [];
    await saveExpenseItems(newId, cleanItems);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  }

  async function confirmDelete() {
    if (!editId) return;
    setConfirmingDelete(false);
    await deleteExpense(editId);
    router.back();
  }

  const itemInputStyle = {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: c.text,
  };

  if (mode === 'view') {
    return (
      <Screen edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 32 }}>
          <Header
            title="Expense"
            onClose={() => router.back()}
            right={
              <Pressable onPress={() => setMode('edit')} hitSlop={14} accessibilityLabel="Edit" style={{ marginRight: 14 }}>
                <Ionicons name="pencil-outline" size={21} color={c.sub} />
              </Pressable>
            }
          />

          <Row style={{ alignItems: 'center', gap: 10, marginTop: 10 }}>
            {cat && <IconDot icon={cat.icon} color={cat.color} size={44} />}
            <View style={{ flex: 1 }}>
              <T size={15} weight="600">{note || cat?.name || ''}</T>
              {note ? <T size={13} sub style={{ marginTop: 2 }}>{cat?.name}</T> : null}
            </View>
          </Row>
          <Money value={value} size={40} weight="700" style={{ marginTop: 18, letterSpacing: -1 }} />

          <Divider style={{ marginTop: 20, marginBottom: 14 }} />

          {viewItems.length > 0 && (
            <>
              {viewItems.map((it) => (
                <Row key={it.id} style={{ justifyContent: 'space-between', paddingVertical: 7 }}>
                  <T size={14} sub style={{ flex: 1 }} numberOfLines={1}>
                    {it.name || 'Item'}{it.quantity !== 1 ? ` ×${it.quantity}` : ''}
                  </T>
                  <Money value={it.quantity * it.amount} size={14} />
                </Row>
              ))}
              <Divider style={{ marginTop: 10, marginBottom: 14 }} />
            </>
          )}

          <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
            <T size={13.5} sub>Date</T>
            <T size={13.5}>{prettyDate(date)}</T>
          </Row>
          <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
            <T size={13.5} sub>Paid with</T>
            <T size={13.5}>{method}</T>
          </Row>
          {notes.trim().length > 0 && (
            <View style={{ marginTop: 14 }}>
              <T size={13} sub style={{ marginBottom: 4 }}>Notes</T>
              <T size={14.5} style={{ lineHeight: 20 }}>{notes}</T>
            </View>
          )}

          <Button title="Edit expense" icon="pencil-outline" kind="ghost" onPress={() => setMode('edit')} style={{ marginTop: 24 }} />
          <Button title="Delete expense" kind="danger" onPress={() => setConfirmingDelete(true)} style={{ marginTop: 10 }} />
        </ScrollView>
        <ConfirmDialog
          visible={confirmingDelete}
          title="Delete this expense?"
          message="It will be removed from your history."
          onConfirm={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Header
            title={editId ? 'Edit expense' : 'New expense'}
            onClose={editId ? () => setMode('view') : () => router.back()}
          />

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
                <View key={i} style={{ marginBottom: 10 }}>
                  <Row style={{ gap: 8, marginBottom: 6 }}>
                    <TextInput
                      value={it.name}
                      onChangeText={(t) => updateItem(i, { name: t })}
                      placeholder={`Item ${i + 1}`}
                      placeholderTextColor={c.faint}
                      style={[itemInputStyle, { flex: 1 }]}
                    />
                    <Pressable onPress={() => removeItem(i)} hitSlop={10} accessibilityLabel={`Remove item ${i + 1}`}>
                      <Ionicons name="close-circle" size={22} color={c.faint} />
                    </Pressable>
                  </Row>
                  <Row style={{ gap: 8 }}>
                    <TextInput
                      value={it.qty}
                      onChangeText={(t) => updateItem(i, { qty: t })}
                      placeholder="1"
                      placeholderTextColor={c.faint}
                      keyboardType="decimal-pad"
                      style={[itemInputStyle, numerals, { width: 56, textAlign: 'center' }]}
                    />
                    <T size={15} sub style={{ alignSelf: 'center' }}>×</T>
                    <TextInput
                      value={it.amount}
                      onChangeText={(t) => updateItem(i, { amount: t })}
                      placeholder="price"
                      placeholderTextColor={c.faint}
                      keyboardType="decimal-pad"
                      style={[itemInputStyle, numerals, { flex: 1, textAlign: 'right' }]}
                    />
                    <T size={14} sub tabular style={{ width: 64, textAlign: 'right', alignSelf: 'center' }}>
                      {lineTotal(it) > 0 ? (lineTotal(it) % 1 === 0 ? lineTotal(it) : lineTotal(it).toFixed(2)) : ''}
                    </T>
                  </Row>
                </View>
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

          <Field
            label="Title (optional)"
            value={note}
            onChangeText={onChangeNote}
            placeholder={hasItems ? 'e.g. Walmart run' : 'e.g. Lunch with team'}
          />

          <T size={13} sub style={{ marginBottom: 9 }}>Category</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cats.map((k) => (
              <Chip key={k.id} label={k.name} color={k.color} active={catId === k.id} onPress={() => onPickCategory(k.id)} />
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

          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Any extra detail" />

          <T size={13} sub style={{ marginBottom: 9 }}>Paid with</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {METHODS.map((m) => (
              <Chip key={m} label={m} active={method === m} onPress={() => setMethod(m)} />
            ))}
          </View>

          <Button title={editId ? 'Save changes' : 'Add expense'} onPress={onSave} disabled={!valid} style={{ marginTop: 22 }} />
          {editId ? <Button title="Delete expense" kind="danger" onPress={() => setConfirmingDelete(true)} style={{ marginTop: 10 }} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={confirmingDelete}
        title="Delete this expense?"
        message="It will be removed from your history."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Screen>
  );
}
