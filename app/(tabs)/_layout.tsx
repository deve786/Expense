import React from 'react';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, focused: IconName) {
  return ({ color, focused: f, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={f ? focused : name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.sub,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
        tabBarLabelStyle: { fontSize: 11 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('list-outline', 'list') }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: icon('pie-chart-outline', 'pie-chart') }} />
      <Tabs.Screen name="chat" options={{ title: 'Ask', tabBarIcon: icon('chatbubble-ellipses-outline', 'chatbubble-ellipses') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline', 'settings') }} />
    </Tabs>
  );
}
