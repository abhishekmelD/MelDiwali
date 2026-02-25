import { DevSettings, Platform } from 'react-native';
import { useCallback, useState } from 'react';

interface UseReloadOnRefreshOptions {
  delayMs?: number;
  onBeforeReload?: () => void;
}

export function useReloadOnRefresh({
  delayMs = 2000,
  onBeforeReload,
}: UseReloadOnRefreshOptions = {}) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    onBeforeReload?.();
    setRefreshing(true);
    setTimeout(() => {
      try {
        if (Platform.OS === 'web') {
          window.location.reload();
          return;
        }
        DevSettings.reload();
      } catch {
        if (Platform.OS === 'web') {
          window.location.reload();
        }
      }
    }, delayMs);
  }, [delayMs, onBeforeReload]);

  return { refreshing, onRefresh };
}
