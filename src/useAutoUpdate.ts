import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Away at least this long before a pending update may reload the app. */
const SAFE_TO_RELOAD_AFTER_MS = 30_000;

/**
 * Keeps the installed app on the latest published OTA update without the
 * user having to force-close it.
 *
 *  - On launch, expo-updates checks and downloads in the background by itself
 *    (`checkAutomatically: ON_LOAD` in app.json), so launch is never delayed.
 *  - Each time the app returns to the foreground, it checks again and quietly
 *    downloads anything new.
 *  - A downloaded update applies itself automatically the next time you
 *    return after being away a while — reloading the instant it lands could
 *    wipe an expense you were halfway through entering. Return sooner than
 *    that and `UpdateBanner` offers a manual restart instead.
 *
 * Does nothing in development or Expo Go, where updates are disabled.
 */
export function useAutoUpdate() {
  const { isUpdatePending } = Updates.useUpdates();
  const pending = useRef(isUpdatePending);
  useEffect(() => {
    pending.current = isUpdatePending;
  }, [isUpdatePending]);

  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        leftAt.current = Date.now();
        return;
      }
      if (state !== 'active') return;

      const away = leftAt.current === null ? 0 : Date.now() - leftAt.current;
      leftAt.current = null;

      void (async () => {
        try {
          if (pending.current && away >= SAFE_TO_RELOAD_AFTER_MS) {
            await Updates.reloadAsync();
            return;
          }
          const check = await Updates.checkForUpdateAsync();
          if (check.isAvailable) await Updates.fetchUpdateAsync();
        } catch {
          // Offline or rate limited — launch and the next foreground try again.
        }
      })();
    });

    return () => subscription.remove();
  }, []);
}
