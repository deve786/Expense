import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ExpenseRow } from './db';
import { fmtMoney } from './stats';
import { prettyDate } from './dates';
import { useTheme } from './theme';
import { IconDot, Row, T } from './ui';

export function ExpenseItem({ e, showDate = true }: { e: ExpenseRow; showDate?: boolean }) {
  const { c, symbol } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/expense', params: { id: String(e.id) } })}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line,
      })}
    >
      <Row style={{ gap: 12 }}>
        <IconDot icon={e.cat_icon} color={e.cat_color} />
        <View style={{ flex: 1 }}>
          <T weight="600" numberOfLines={1}>{e.note || e.cat_name}</T>
          <T size={12} sub numberOfLines={1}>
            {e.cat_name} · {e.method}{showDate ? ` · ${prettyDate(e.date)}` : ''}{e.recurring_id ? ' · recurring' : ''}
          </T>
        </View>
        <T weight="700">{fmtMoney(e.amount, symbol)}</T>
      </Row>
    </Pressable>
  );
}
