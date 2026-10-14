import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ExpenseRow } from './db';
import { prettyDate } from './dates';
import { useTheme } from './theme';
import { IconDot, Money, Row, T } from './ui';

export function ExpenseItem({ e, showDate = true }: { e: ExpenseRow; showDate?: boolean }) {
  const { c } = useTheme();
  const router = useRouter();
  const meta = [
    e.cat_name,
    e.method,
    showDate ? prettyDate(e.date) : null,
    e.recurring_id ? 'Repeats' : null,
    e.item_count > 1 ? `${e.item_count} items` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/expense', params: { id: String(e.id) } })}
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
        <Money value={e.amount} size={15.5} weight="600" />
      </Row>
    </Pressable>
  );
}
