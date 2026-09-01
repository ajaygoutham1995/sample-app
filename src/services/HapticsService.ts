import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { settingsStore } from '@/state/settingsStore';

export type HapticMoment =
  | 'activityStart'
  | 'expand'
  | 'collapse'
  | 'chargerConnected'
  | 'chargerDisconnected'
  | 'activityCompleted'
  | 'selection';

/**
 * Haptics stay deliberately quiet: a Soft/Light impact for surface movement,
 * a notification pattern reserved for the moments that report a real result.
 * Anything heavier turns a premium interaction into a buzzing toy.
 */
export function playHaptic(moment: HapticMoment): void {
  if (!settingsStore.getState().hapticsEnabled) return;
  if (Platform.OS === 'web') return;

  void (async () => {
    try {
      switch (moment) {
        case 'expand':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
          break;
        case 'collapse':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'activityStart':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'chargerConnected':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
          break;
        case 'chargerDisconnected':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
          break;
        case 'activityCompleted':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'selection':
          await Haptics.selectionAsync();
          break;
      }
    } catch {
      // A device without a Taptic Engine is not an error worth surfacing.
    }
  })();
}
