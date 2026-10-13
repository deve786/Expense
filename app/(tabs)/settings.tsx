import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeMode } from '@/theme';
import { Button, Card, Chip, Field, Row, Section, T } from '@/ui';
import { exportCsv } from '@/csv';
import { checkForOtaUpdate, updateInfo } from '@/ota';

const SYMBOLS = ['₹', '$', '€', '£'];

export default function Settings() {
  const { mode, setMode, symbol, setSymbol, budget, setBudget } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [budgetText, setBudgetText] = useState(budget ? String(budget) : '');
  const info = updateInfo();

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <T size={28} weight="700">Settings</T>

      <Section title="Monthly budget" />
      <Card>
        <Field
          value={budgetText}
          onChangeText={setBudgetText}
          placeholder="0 = no budget"
          keyboardType="decimal-pad"
          style={{ marginBottom: 0 }}
        />
        <Button
          title="Save budget"
          kind="ghost"
          onPress={() => {
            const n = parseFloat(budgetText);
            setBudget(isNaN(n) || n < 0 ? 0 : n);
            Alert.alert('Saved', n > 0 ? 'Budget updated.' : 'Budget cleared.');
          }}
          style={{ marginTop: 10 }}
        />
      </Card>

      <Section title="Currency symbol" />
      <Row style={{ flexWrap: 'wrap' }}>
        {SYMBOLS.map((s) => (
          <Chip key={s} label={s} active={symbol === s} onPress={() => setSymbol(s)} />
        ))}
      </Row>

      <Section title="Appearance" />
      <Row>
        {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
          <Chip key={m} label={m[0].toUpperCase() + m.slice(1)} active={mode === m} onPress={() => setMode(m)} />
        ))}
      </Row>

      <Section title="Manage" />
      <View style={{ gap: 10 }}>
        <Button title="Categories" kind="ghost" icon="pricetags-outline" onPress={() => router.push('/categories')} />
        <Button title="Recurring expenses" kind="ghost" icon="repeat-outline" onPress={() => router.push('/recurring')} />
        <Button
          title="Export CSV"
          kind="ghost"
          icon="download-outline"
          onPress={async () => {
            try {
              const n = await exportCsv();
              if (n === 0) Alert.alert('Nothing to export', 'Add some expenses first.');
            } catch (e) {
              Alert.alert('Export failed', String(e instanceof Error ? e.message : e));
            }
          }}
        />
      </View>

      <Section title="App updates" />
      <Card>
        <T size={12} sub>Runtime {info.runtimeVersion} · channel {info.channel}</T>
        <T size={12} sub style={{ marginTop: 2 }}>Update: {String(info.updateId).slice(0, 8)}</T>
        <Button title="Check for updates" kind="ghost" icon="cloud-download-outline" onPress={() => checkForOtaUpdate(true)} style={{ marginTop: 12 }} />
      </Card>
    </ScrollView>
  );
}
