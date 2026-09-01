import * as Battery from 'expo-battery';
import { Platform } from 'react-native';

import { dynamicNotchManager } from './DynamicNotchManager';

/**
 * Turns the OS power state into the two events the notch cares about:
 * CHARGER_CONNECTED and CHARGER_DISCONNECTED.
 *
 * This is a listener, not a poll. `expo-battery` pushes state changes from the
 * platform; nothing here runs on an interval.
 */

function isPlugged(state: Battery.BatteryState): boolean {
  return state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
}

class PowerService {
  private subscriptions: { remove: () => void }[] = [];
  private plugged: boolean | null = null;
  private level: number | null = null;
  private started = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    if (Platform.OS === 'web') return;

    try {
      const available = await Battery.isAvailableAsync();
      if (!available) return;

      const power = await Battery.getPowerStateAsync();
      // Seed silently: an app launched while already on charge should not fire
      // a connection animation for something that happened minutes ago.
      this.plugged = isPlugged(power.batteryState);
      this.level = power.batteryLevel;

      this.subscriptions.push(
        Battery.addBatteryStateListener(({ batteryState }) => {
          const nowPlugged = isPlugged(batteryState);
          if (this.plugged === nowPlugged) return;
          this.plugged = nowPlugged;
          if (nowPlugged) dynamicNotchManager.handleChargerConnected(this.level);
          else dynamicNotchManager.handleChargerDisconnected(this.level);
        })
      );

      this.subscriptions.push(
        Battery.addBatteryLevelListener(({ batteryLevel }) => {
          this.level = batteryLevel;
          if (this.plugged) dynamicNotchManager.handleBatteryLevel(batteryLevel);
        })
      );
    } catch (error) {
      console.warn('[Power] unavailable', error);
    }
  }

  stop(): void {
    this.subscriptions.forEach((subscription) => subscription.remove());
    this.subscriptions = [];
    this.started = false;
  }

  getBatteryLevel(): number | null {
    return this.level;
  }

  isCharging(): boolean {
    return this.plugged === true;
  }

  /**
   * Fires the same code path a real charger does. Exists because the charging
   * interaction cannot otherwise be reviewed on a simulator, on Android or on
   * the web, and because reviewers should not have to plug a cable in to see
   * the animation.
   */
  simulateChargerConnected(): void {
    dynamicNotchManager.handleChargerConnected(this.level ?? 0.68);
  }

  simulateChargerDisconnected(): void {
    dynamicNotchManager.handleChargerDisconnected(this.level ?? 0.68);
  }
}

export const powerService = new PowerService();
