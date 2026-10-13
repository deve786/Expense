import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listExpenses, refreshRecurring, type ExpenseRow } from '@/db';
import { monthName, monthRange, todayStr, addDays } from '@/dates';
import { byCategory, fmtMoney, sum } from '@/stats';
import { useTheme } from '@/theme';
import { Button, Card, Row, Section, T } from '@/ui';
import { ExpenseItem } from '@/ExpenseItem';

export default function Home() {
  const { c, symbol, budget } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [recent, setRecent] = useState<ExpenseRow[]>([]);

  const now = new Date();
  const { from, to } = monthRange(now.getFullYear(), now.getMonth());

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await refreshRecurring();
        setRows(await listExpenses(from, to));
        setRecent((await listExpenses()).slice(0, 6));
      })();
    }, [from, to])
  );

  const total = sum(rows);
  const today = todayStr();
  const todayTotal = sum(rows.filter((r) => r.date === today));
  const weekTotal = sum(rows.filter((r) => r.date >= addDays(today, -6)));
  const top = byCategory(rows)[0];
  const pct = budget > 0 ? total / budget : 0;
  const barColor = pct >= 1 ? c.danger : pct >= 0.8 ? '#F18F01' : c.good;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }}>
      <T size={13} sub weight="600" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {monthName(now.getMonth())} {now.getFullYear()}
      </T>
      <T size={44} weight="700" style={{ marginTop: 4, letterSpacing: -1 }}>{fmtMoney(total, symbol)}</T>
      <T sub size={13}>spent this month</T>

      {budget > 0 && (
        <View style={{ marginTop: 16 }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(pct, 1) * 100}%`, height: 8, backgroundColor: barColor }} />
          </View>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <T size={12} sub>{Math.round(pct * 100)}% of {fmtMoney(budget, symbol)}</T>
            <T size={12} style={{ color: pct >= 1 ? c.danger : c.sub }}>
              {pct >= 1 ? `Over by ${fmtMoney(total - budget, symbol)}` : `${fmtMoney(budget - total, symbol)} left`}
            </T>
          </Row>
        </View>
      )}

      <Row style={{ gap: 12, marginTop: 20 }}>
        <Card style={{ flex: 1 }}>
          <T size={12} sub>Today</T>
          <T size={20} weight="700" style={{ marginTop: 2 }}>{fmtMoney(todayTotal, symbol)}</T>
        </Card>
        <Card style={{ flex: 1 }}>
          <T size={12} sub>Last 7 days</T>
          <T size={20} weight="700" style={{ marginTop: 2 }}>{fmtMoney(weekTotal, symbol)}</T>
        </Card>
      </Row>
      {top && (
        <Card style={{ marginTop: 12 }}>
          <T size={12} sub>Top category</T>
          <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
            <T weight="600">{top.name}</T>
            <T weight="700">{fmtMoney(top.total, symbol)}</T>
          </Row>
        </Card>
      )}

      <Button title="Add expense" icon="add" onPress={() => router.push('/expense')} style={{ marginTop: 20 }} />

      <Section title="Recent" right={<T size={13} sub onPress={() => router.push('/history')}>See all</T>} />
      {recent.length === 0 ? (
        <T sub>No expenses yet. Add your first one.</T>
      ) : (
        recent.map((e) => <ExpenseItem key={e.id} e={e} />)
      )}
    </ScrollView>
  );
}
