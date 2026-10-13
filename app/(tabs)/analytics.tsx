import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { listExpenses, type ExpenseRow } from '@/db';
import { addDays, daysBetween, fromStr, monthName, monthRange, prettyRange, toStr, todayStr } from '@/dates';
import { byCategory, fmtMoney, previousRange, sum, trend } from '@/stats';
import { useTheme } from '@/theme';
import { Card, Chip, IconDot, Row, Section, T } from '@/ui';
import { Bars, Donut } from '@/charts';

type Mode = 'month' | 'range';

export default function Analytics() {
  const { c, symbol } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const now = new Date();
  const [mode, setMode] = useState<Mode>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const [rangeFrom, setRangeFrom] = useState(addDays(todayStr(), -29));
  const [rangeTo, setRangeTo] = useState(todayStr());
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  const { from, to } = mode === 'month' ? monthRange(year, month0) : { from: rangeFrom, to: rangeTo };
  const prev = previousRange(from, to);

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [prevRows, setPrevRows] = useState<ExpenseRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setRows(await listExpenses(from, to));
        setPrevRows(await listExpenses(prev.from, prev.to));
      })();
    }, [from, to, prev.from, prev.to])
  );

  const total = sum(rows);
  const prevTotal = sum(prevRows);
  const span = daysBetween(from, to);
  const cats = useMemo(() => byCategory(rows), [rows]);
  const series = useMemo(() => trend(rows, from, to), [rows, from, to]);
  const biggest = useMemo(() => [...rows].sort((a, b) => b.amount - a.amount).slice(0, 5), [rows]);
  const methods = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.method, (m.get(r.method) ?? 0) + r.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const diff = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
  const effectiveDays = mode === 'month' && year === now.getFullYear() && month0 === now.getMonth() ? now.getDate() : span;
  const isCurrentMonth = mode === 'month' && year === now.getFullYear() && month0 === now.getMonth();

  function shiftMonth(delta: number) {
    const d = new Date(year, month0 + delta, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}>
      <T size={28} weight="700" style={{ marginBottom: 12 }}>Analytics</T>

      <Row>
        <Chip label="Month" active={mode === 'month'} onPress={() => setMode('month')} />
        <Chip label="Custom range" active={mode === 'range'} onPress={() => setMode('range')} />
      </Row>

      {mode === 'month' ? (
        <Row style={{ justifyContent: 'space-between', marginVertical: 8 }}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={12}><Ionicons name="chevron-back" size={22} color={c.text} /></Pressable>
          <T size={18} weight="600">{monthName(month0)} {year}</T>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={12} disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.25 : 1 }}>
            <Ionicons name="chevron-forward" size={22} color={c.text} />
          </Pressable>
        </Row>
      ) : (
        <View style={{ marginVertical: 8 }}>
          <Row style={{ gap: 10 }}>
            {(['from', 'to'] as const).map((k) => (
              <Pressable
                key={k}
                onPress={() => setPicking(picking === k ? null : k)}
                style={{ flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: picking === k ? c.text : c.line, borderRadius: 12, padding: 12 }}
              >
                <T size={11} sub style={{ textTransform: 'uppercase' }}>{k}</T>
                <T weight="600">{k === 'from' ? rangeFrom : rangeTo}</T>
              </Pressable>
            ))}
          </Row>
          {picking && (
            <DateTimePicker
              value={fromStr(picking === 'from' ? rangeFrom : rangeTo)}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, d) => {
                const which = picking;
                if (Platform.OS !== 'ios') setPicking(null);
                if (!d || !which) return;
                const s = toStr(d);
                if (which === 'from') {
                  setRangeFrom(s);
                  if (s > rangeTo) setRangeTo(s);
                } else {
                  setRangeTo(s);
                  if (s < rangeFrom) setRangeFrom(s);
                }
              }}
            />
          )}
          <T size={12} sub style={{ marginTop: 8 }}>{prettyRange(rangeFrom, rangeTo)} · {span} days</T>
        </View>
      )}

      <Card style={{ marginTop: 8 }}>
        <T size={12} sub>Total spent</T>
        <T size={34} weight="700" style={{ letterSpacing: -0.5 }}>{fmtMoney(total, symbol)}</T>
        {diff !== null ? (
          <T size={13} style={{ color: diff > 0 ? c.danger : c.good, marginTop: 2 }}>
            {diff > 0 ? '▲' : '▼'} {Math.abs(Math.round(diff))}% vs previous period ({fmtMoney(prevTotal, symbol)})
          </T>
        ) : (
          <T size={13} sub style={{ marginTop: 2 }}>No spending in the previous period</T>
        )}
        <Row style={{ marginTop: 14, gap: 24 }}>
          <View>
            <T size={11} sub>Daily avg</T>
            <T weight="700">{fmtMoney(effectiveDays > 0 ? total / effectiveDays : 0, symbol)}</T>
          </View>
          <View>
            <T size={11} sub>Entries</T>
            <T weight="700">{rows.length}</T>
          </View>
          <View>
            <T size={11} sub>Avg / entry</T>
            <T weight="700">{fmtMoney(rows.length ? total / rows.length : 0, symbol)}</T>
          </View>
        </Row>
      </Card>

      {rows.length === 0 ? (
        <T sub style={{ marginTop: 24, textAlign: 'center' }}>No expenses in this period.</T>
      ) : (
        <>
          <Section title="By category" />
          <Card>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Donut data={cats} center={fmtMoney(total, symbol)} />
            </View>
            {cats.map((k) => (
              <Row key={k.name} style={{ paddingVertical: 8, gap: 12 }}>
                <IconDot icon={k.icon} color={k.color} size={34} />
                <View style={{ flex: 1 }}>
                  <T weight="600">{k.name}</T>
                  <T size={12} sub>{k.count} entries · {total > 0 ? Math.round((k.total / total) * 100) : 0}%</T>
                </View>
                <T weight="700">{fmtMoney(k.total, symbol)}</T>
              </Row>
            ))}
          </Card>

          <Section title={span <= 45 ? 'Daily' : span <= 190 ? 'Weekly' : 'Monthly'} />
          <Card>
            <Bars data={series} width={width - 40 - 32} />
          </Card>

          <Section title="Largest expenses" />
          <Card>
            {biggest.map((e, i) => (
              <Row key={e.id} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <View style={{ flex: 1 }}>
                  <T weight="600" numberOfLines={1}>{e.note || e.cat_name}</T>
                  <T size={12} sub>{e.date} · {e.cat_name}</T>
                </View>
                <T weight="700">{fmtMoney(e.amount, symbol)}</T>
              </Row>
            ))}
          </Card>

          <Section title="Payment method" />
          <Card>
            {methods.map(([m, v], i) => (
              <Row key={m} style={{ justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <T>{m}</T>
                <T weight="700">{fmtMoney(v, symbol)}</T>
              </Row>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
