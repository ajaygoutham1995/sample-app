import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  liveActivityService,
  type LiveActivityAuthorization,
} from '@/services/LiveActivityService';
import {
  notificationService,
  type PermissionSnapshot,
} from '@/services/NotificationService';

/**
 * The real OS permission state, re-read whenever the app returns to the
 * foreground. That re-read is the whole point: the user can change this in
 * Settings while we are backgrounded, and a cached value would then be a lie
 * shown in our own UI.
 */
export function useNotificationPermission() {
  const [snapshot, setSnapshot] = useState<PermissionSnapshot | null>(null);

  const refresh = useCallback(async () => {
    setSnapshot(await notificationService.check());
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    setSnapshot(await notificationService.request());
  }, []);

  return { snapshot, refresh, request, openSettings: notificationService.openSettings };
}

export function useLiveActivityAuthorization(): LiveActivityAuthorization {
  const [state, setState] = useState<LiveActivityAuthorization>(() =>
    liveActivityService.getAuthorization()
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setState(liveActivityService.getAuthorization());
    });
    return () => subscription.remove();
  }, []);

  return state;
}
