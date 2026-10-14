import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { getDb } from '@/db';
import { UpdateBanner } from '@/components/UpdateBanner';
import { useAutoUpdate } from '@/useAutoUpdate';

function Shell() {
  const { c, isDark } = useTheme();
  const [ready, setReady] = useState(false);

  useAutoUpdate();

  useEffect(() => {
    getDb().then(() => setReady(true));
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {ready ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="expense" options={{ presentation: 'modal' }} />
          <Stack.Screen name="recurring" options={{ presentation: 'modal' }} />
          <Stack.Screen name="categories" options={{ presentation: 'modal' }} />
        </Stack>
      ) : (
        // Painted in theme colours so launch doesn't flash white before the DB opens.
        <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.faint} />
        </View>
      )}
      <UpdateBanner />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
