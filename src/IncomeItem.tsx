import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { deleteIncome, type IncomeRow } from './db';
import { prettyDate } from './dates';
import { fmtMoney } from './stats';
import { useTheme } from './theme';
import { IconDot, Row, T } from './ui';

export function IncomeItem({ e, showDate = true, onDeleted }: { e: IncomeRow; showDate?: boolean; onDeleted?: () => void }) {
  const { c, symbol } = useTheme();
  const router = useRouter();
  const meta = [e.cat_name, e.method, showDate ? prettyDate(e.date) : null].filter(Boolean).join('  ·  ');

  function onLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert('Delete this income entry?', 'It will be removed from your history.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteIncome(e.id); onDeleted?.(); } },
    ]);
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/income', params: { id: String(e.id) } })}
      onLongPress={onLongPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        opacity: pressed ? 0.55 : 1,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
      })}
    >
      <Row style={{ gap: 13 }}>
        <IconDot icon={e.cat_icon} color={e.cat_color} />
        <View style={{ flex: 1 }}>
          <T size={15} weight="600" numberOfLines={1}>{e.note || e.cat_name}</T>
          <T size={12.5} sub numberOfLines={1} style={{ marginTop: 2 }}>{meta}</T>
        </View>
        <T size={15.5} weight="600" tabular style={{ color: c.good }}>+{fmtMoney(e.amount, symbol)}</T>
      </Row>
    </Pressable>
  );
}
