import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { listExpenses, listIncome, refreshRecurring, type ExpenseRow, type IncomeRow } from '@/db';
import { monthName, monthRange, todayStr, addDays } from '@/dates';
import { byCategory, fmtMoney, sum } from '@/stats';
import { budgetTone, useTheme } from '@/theme';
import { Button, Divider, Empty, Meter, Money, Row, Screen, Section, T } from '@/ui';
import { ExpenseItem } from '@/ExpenseItem';
import { IncomeItem } from '@/IncomeItem';

type Recent = { kind: 'expense'; row: ExpenseRow } | { kind: 'income'; row: IncomeRow };

export default function Home() {
  const { c, symbol, budget } = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);

  // Derived from the date string rather than a Date object: primitives keep the
  // memoised range referentially stable, which the focus effect depends on.
  const today = todayStr();
  const year = Number(today.slice(0, 4));
  const month0 = Number(today.slice(5, 7)) - 1;
  const { from, to } = useMemo(() => monthRange(year, month0), [year, month0]);

  const load = useCallback(async () => {
    await refreshRecurring();
    const [monthExpenses, monthIncome, allExpenses, allIncome] = await Promise.all([
      listExpenses(from, to),
      listIncome(from, to),
      listExpenses(),
      listIncome(),
    ]);
    setRows(monthExpenses);
    setIncomeRows(monthIncome);
    const merged: Recent[] = [
      ...allExpenses.map((row): Recent => ({ kind: 'expense', row })),
      ...allIncome.map((row): Recent => ({ kind: 'income', row })),
    ].sort((a, b) => b.row.date.localeCompare(a.row.date));
    setRecent(merged.slice(0, 6));
  }, [from, to]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = sum(rows);
  const incomeTotal = sum(incomeRows);
  const net = incomeTotal - total;
  const todayTotal = sum(rows.filter((r) => r.date === today));
  const weekTotal = sum(rows.filter((r) => r.date >= addDays(today, -6)));
  const top = byCategory(rows)[0];
  const pct = budget > 0 ? total / budget : 0;
  const tone = budgetTone(pct, c);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 40 }}>
        <T size={14} sub>{monthName(month0)} {year}</T>
        <T size={48} weight="700" tabular style={{ marginTop: 2, letterSpacing: -1.6 }}>
          {fmtMoney(total, symbol)}
        </T>
        <T size={14} sub style={{ marginTop: 1 }}>spent this month</T>

        {budget > 0 && (
          <View style={{ marginTop: 18 }}>
            <Meter fraction={pct} tone={tone} />
            <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <T size={13} sub tabular>{Math.round(pct * 100)}% of {fmtMoney(budget, symbol)}</T>
              <T size={13} weight="500" tabular style={{ color: tone }}>
                {pct >= 1
                  ? `${fmtMoney(total - budget, symbol)} over`
                  : `${fmtMoney(budget - total, symbol)} left`}
              </T>
            </Row>
          </View>
        )}

        <Row style={{ marginTop: 20 }}>
          <View style={{ flex: 1 }}>
            <T size={13} sub>Income</T>
            <T size={18} weight="700" tabular style={{ marginTop: 3, color: c.good }}>+{fmtMoney(incomeTotal, symbol)}</T>
          </View>
          <View style={{ flex: 1 }}>
            <T size={13} sub>Net</T>
            <T size={18} weight="700" tabular style={{ marginTop: 3, color: net >= 0 ? c.good : c.danger }}>
              {net >= 0 ? '+' : ''}{fmtMoney(net, symbol)}
            </T>
          </View>
        </Row>

        <Row style={{ marginTop: 20, alignItems: 'stretch' }}>
          <View style={{ flex: 1 }}>
            <T size={13} sub>Today</T>
            <Money value={todayTotal} size={21} weight="700" style={{ marginTop: 3 }} />
          </View>
          <View style={{ width: 1, backgroundColor: c.line, marginHorizontal: 18 }} />
          <View style={{ flex: 1 }}>
            <T size={13} sub>Last 7 days</T>
            <Money value={weekTotal} size={21} weight="700" style={{ marginTop: 3 }} />
          </View>
        </Row>

        {top && (
          <>
            <Divider style={{ marginTop: 20 }} />
            <Row style={{ justifyContent: 'space-between', marginTop: 14 }}>
              <T size={14} sub>Most spent on</T>
              <Row style={{ gap: 8 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: top.color }} />
                <T size={14} weight="600">{top.name}</T>
                <Money value={top.total} size={14} weight="600" />
              </Row>
            </Row>
          </>
        )}

        <Row style={{ gap: 10, marginTop: 24 }}>
          <Button title="Add expense" icon="add" onPress={() => router.push('/expense')} style={{ flex: 1 }} />
          <Button
            title="Add income"
            icon="add"
            kind="ghost"
            onPress={() => router.push('/income')}
            style={{ flex: 1, borderColor: c.good }}
          />
        </Row>

        <Section title="Recent" right={<T size={14} sub onPress={() => router.push('/history')}>See all</T>} />
        {recent.length === 0 ? (
          <Empty title="Nothing yet" hint="Add an expense or income entry to start tracking." />
        ) : (
          recent.map((r) =>
            r.kind === 'expense'
              ? <ExpenseItem key={`e${r.row.id}`} e={r.row} onDeleted={load} />
              : <IncomeItem key={`i${r.row.id}`} e={r.row} onDeleted={load} />
          )
        )}
      </ScrollView>
    </Screen>
  );
}
