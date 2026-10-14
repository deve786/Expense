import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, useTheme } from '@/theme';
import { Row, T } from '@/ui';

/**
 * Appears once a new version has finished downloading, so it can be applied
 * with one tap instead of waiting for the next cold start.
 *
 * It asks rather than reloading by itself: a reload mid-entry would throw
 * away an expense the user was halfway through typing. If ignored,
 * useAutoUpdate() still applies the update next time the app returns from
 * the background after a while.
 *
 * Sits in normal layout flow (not floating), reporting its own measured
 * height via onHeightChange so the caller can push the rest of the screen
 * down by exactly that much — a floating overlay here would just cover
 * whatever was at the top of the current screen.
 */
export function UpdateBanner({ onHeightChange }: { onHeightChange?: (height: number) => void }) {
  const { c } = useTheme();
  const { isUpdatePending } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  const [restarting, setRestarting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const visible = !__DEV__ && Updates.isEnabled && isUpdatePending && !dismissed;

  useEffect(() => {
    if (!visible) onHeightChange?.(0);
    // Reset the reserved space immediately when the banner goes away —
    // otherwise the gap it leaves behind would linger.
  }, [visible, onHeightChange]);

  if (!visible) return null;

  async function restart() {
    setRestarting(true);
    try {
      await Updates.reloadAsync();
    } catch {
      // Reload refused (rare) — leave the bar up so it can be tried again.
      setRestarting(false);
    }
  }

  return (
    <View
      accessibilityRole="alert"
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
      style={{
        backgroundColor: c.ink, paddingTop: insets.top + 10, paddingBottom: 12, paddingHorizontal: 20,
      }}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={13.5} weight="600" style={{ color: c.inkText }}>Update ready</T>
        <Row style={{ gap: 18 }}>
          <Pressable onPress={() => setDismissed(true)} hitSlop={10} disabled={restarting}>
            <T size={13.5} style={{ color: c.inkText, opacity: 0.55 }}>Later</T>
          </Pressable>
          <Pressable
            onPress={() => void restart()}
            hitSlop={10}
            disabled={restarting}
            accessibilityLabel="Restart to use the new version"
            style={{
              minWidth: 72, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12,
              borderRadius: radius.sm, backgroundColor: c.inkText,
            }}
          >
            {restarting ? (
              <ActivityIndicator size="small" color={c.ink} />
            ) : (
              <T size={13} weight="600" style={{ color: c.ink }}>Restart</T>
            )}
          </Pressable>
        </Row>
      </Row>
    </View>
  );
}
