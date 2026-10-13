import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

/** Check for an OTA update; download it and offer to restart. Silent in dev / when updates are disabled. */
export async function checkForOtaUpdate(manual = false) {
  if (__DEV__ || !Updates.isEnabled) {
    if (manual) Alert.alert('Updates', 'OTA updates only work in a release build (not in Expo Go / dev mode).');
    return;
  }
  try {
    const res = await Updates.checkForUpdateAsync();
    if (!res.isAvailable) {
      if (manual) Alert.alert('Up to date', 'You are on the latest version.');
      return;
    }
    await Updates.fetchUpdateAsync();
    Alert.alert('Update ready', 'A new version was downloaded. Restart to apply it.', [
      { text: 'Later', style: 'cancel' },
      { text: 'Restart', onPress: () => Updates.reloadAsync() },
    ]);
  } catch (e) {
    if (manual) Alert.alert('Update check failed', String(e instanceof Error ? e.message : e));
  }
}

export function updateInfo() {
  return {
    enabled: Updates.isEnabled,
    runtimeVersion: Updates.runtimeVersion ?? 'n/a',
    channel: Updates.channel ?? 'n/a',
    updateId: Updates.updateId ?? 'embedded',
  };
}
