import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeMode } from '@/theme';
import { Button, Chip, Divider, Field, Row, Screen, Section, T, Title } from '@/ui';
import { exportCsv } from '@/csv';
import { checkForOtaUpdate, updateInfo } from '@/ota';

const SYMBOLS = ['₹', '$', '€', '£'];

function NavRow({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15,
        borderBottomWidth: 1, borderBottomColor: c.line, opacity: pressed ? 0.55 : 1,
      })}
    >
      <Ionicons name={icon} size={19} color={c.sub} />
      <T size={15} style={{ flex: 1 }}>{label}</T>
      <Ionicons name="chevron-forward" size={17} color={c.faint} />
    </Pressable>
  );
}

export default function Settings() {
  const { c, mode, setMode, symbol, setSymbol, budget, setBudget } = useTheme();
  const router = useRouter();
  const [budgetText, setBudgetText] = useState(budget ? String(budget) : '');
  const info = updateInfo();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Title>Settings</Title>

        <Section title="Monthly budget" />
        <T size={13.5} sub style={{ marginBottom: 10, lineHeight: 19 }}>
          Sets the progress bar on Home. Leave empty for no budget.
        </T>
        <Row style={{ gap: 10, alignItems: 'flex-start' }}>
          <Field
            value={budgetText}
            onChangeText={setBudgetText}
            placeholder="0"
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <Button
            title="Save"
            kind="ghost"
            onPress={() => {
              const n = parseFloat(budgetText);
              const clean = isNaN(n) || n < 0 ? 0 : n;
              setBudget(clean);
              Alert.alert('Saved', clean > 0 ? `Budget set to ${symbol}${clean}.` : 'Budget cleared.');
            }}
          />
        </Row>

        <Section title="Currency" />
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
        <Divider />
        <NavRow label="Categories" icon="pricetags-outline" onPress={() => router.push('/categories')} />
        <NavRow label="Recurring expenses" icon="repeat-outline" onPress={() => router.push('/recurring')} />
        <NavRow
          label="Export as CSV"
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

        <Section title="Updates" />
        <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
          <T size={13.5} sub>Version</T>
          <T size={13.5} tabular>{info.runtimeVersion}</T>
        </Row>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
          <T size={13.5} sub>Channel</T>
          <T size={13.5}>{info.channel}</T>
        </Row>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
          <T size={13.5} sub>Build</T>
          <T size={13.5} tabular>{String(info.updateId).slice(0, 8)}</T>
        </Row>
        <Button
          title="Check for updates"
          kind="ghost"
          icon="cloud-download-outline"
          onPress={() => checkForOtaUpdate(true)}
          style={{ marginTop: 14 }}
        />

        <T size={12.5} faint style={{ marginTop: 28, textAlign: 'center', lineHeight: 18 }}>
          Spendly keeps every expense on this device.{'\n'}Nothing is uploaded anywhere.
        </T>
        <View style={{ height: 8, backgroundColor: c.bg }} />
      </ScrollView>
    </Screen>
  );
}
