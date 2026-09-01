import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

/**
 * Notification authorisation.
 *
 * Two rules the app never breaks:
 *
 *  1. The displayed state is always the real OS state, read back from
 *     `getPermissionsAsync`. Nothing is cached optimistically after a prompt.
 *  2. The system prompt is shown at most once. iOS only ever presents it while
 *     the status is NOT_DETERMINED; asking again afterwards is a silent no-op
 *     that leaves the user stuck, so once denied we route to Settings instead.
 *
 * Scope note: iOS gives no third-party app read access to other apps'
 * notifications. This service manages only this app's own notifications.
 */

export type PermissionState =
  | 'notDetermined'
  | 'authorized'
  | 'provisional'
  | 'ephemeral'
  | 'denied'
  | 'restricted'
  | 'unknown';

export interface PermissionSnapshot {
  state: PermissionState;
  /** True when a prompt would actually appear. */
  canAsk: boolean;
  /** True when the only route forward is the Settings app. */
  needsSettings: boolean;
}

function interpret(status: Notifications.NotificationPermissionsStatus): PermissionSnapshot {
  if (Platform.OS === 'ios') {
    // On iOS the granular ios.status is the truth; the coarse `status` field
    // collapses provisional and ephemeral into "granted".
    switch (status.ios?.status) {
      case Notifications.IosAuthorizationStatus.NOT_DETERMINED:
        return { state: 'notDetermined', canAsk: true, needsSettings: false };
      case Notifications.IosAuthorizationStatus.AUTHORIZED:
        return { state: 'authorized', canAsk: false, needsSettings: false };
      case Notifications.IosAuthorizationStatus.PROVISIONAL:
        return { state: 'provisional', canAsk: true, needsSettings: false };
      case Notifications.IosAuthorizationStatus.EPHEMERAL:
        return { state: 'ephemeral', canAsk: false, needsSettings: false };
      case Notifications.IosAuthorizationStatus.DENIED:
        return { state: 'denied', canAsk: false, needsSettings: true };
      default:
        return { state: 'unknown', canAsk: status.canAskAgain, needsSettings: false };
    }
  }

  if (status.granted) return { state: 'authorized', canAsk: false, needsSettings: false };
  if (status.canAskAgain) return { state: 'notDetermined', canAsk: true, needsSettings: false };
  return { state: 'denied', canAsk: false, needsSettings: true };
}

export function describePermission(snapshot: PermissionSnapshot): string {
  switch (snapshot.state) {
    case 'authorized':
      return 'Notifications are allowed.';
    case 'provisional':
      return 'Delivered quietly to Notification Centre. Allow them to appear on the Lock Screen.';
    case 'ephemeral':
      return 'Temporary authorisation granted for this session.';
    case 'notDetermined':
      return 'Not asked yet. Activities can still run in the app.';
    case 'denied':
      return 'Turned off in iOS Settings. Activity alerts will not be delivered.';
    case 'restricted':
      return 'Restricted by device management or Screen Time.';
    default:
      return 'Permission state unavailable.';
  }
}

class NotificationService {
  private configured = false;

  /** Foreground presentation. Called once from the app root. */
  configure(): void {
    if (this.configured) return;
    this.configured = true;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        // The in-app Dynamic Notch already reports the activity, so a banner
        // on top of it would be the same news twice.
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  async check(): Promise<PermissionSnapshot> {
    try {
      return interpret(await Notifications.getPermissionsAsync());
    } catch {
      return { state: 'unknown', canAsk: false, needsSettings: false };
    }
  }

  /**
   * Request authorisation, then read the real state back. Returns the current
   * snapshot unchanged if a prompt would not appear.
   */
  async request(): Promise<PermissionSnapshot> {
    const current = await this.check();
    if (!current.canAsk) return current;

    try {
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
    } catch {
      // Fall through: the read-back below reports whatever actually happened.
    }
    return this.check();
  }

  async openSettings(): Promise<void> {
    await Linking.openSettings();
  }

  /** Local alert for an activity that finished while the app was away. */
  async notifyActivityFinished(title: string, body: string): Promise<void> {
    const snapshot = await this.check();
    if (snapshot.state !== 'authorized' && snapshot.state !== 'provisional') return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch (error) {
      console.warn('[Notifications] schedule failed', error);
    }
  }
}

export const notificationService = new NotificationService();
