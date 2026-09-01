import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import type { MotionSettings } from '@/animations/DynamicNotchAnimations';
import { useSettings } from '@/state/settingsStore';

/** Combines user preferences with the OS Reduce Motion setting. */
export function useMotionSettings(): MotionSettings {
  const settings = useSettings();
  const systemReduceMotion = useReducedMotion();

  return useMemo(
    () => ({
      speed: settings.animationSpeed,
      intensity: settings.animationIntensity,
      reduceMotion: settings.respectReduceMotion && systemReduceMotion,
    }),
    [
      settings.animationSpeed,
      settings.animationIntensity,
      settings.respectReduceMotion,
      systemReduceMotion,
    ]
  );
}
