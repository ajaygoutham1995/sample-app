import { useEffect } from 'react';
import {
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { MotionSettings } from '@/animations/DynamicNotchAnimations';
import { progressTiming } from '@/animations/DynamicNotchAnimations';
import type { ActivityTimeline } from '@/models/activity';

/**
 * A 0..1 shared value for whatever the activity is measuring.
 *
 * Two sources, one output:
 *   - a timeline (timer, countdown): recomputed on the UI thread from absolute
 *     timestamps, so the bar advances every frame with no JS involvement;
 *   - a reported number (download, battery): eased toward the new value so a
 *     coarse update stream still reads as continuous motion.
 */
export function useProgressValue(params: {
  progress?: number;
  timeline?: ActivityTimeline;
  paused: boolean;
  motion: MotionSettings;
}): SharedValue<number> {
  const { progress, timeline, paused, motion } = params;

  const value = useSharedValue(progress ?? 0);

  const startedAt = timeline?.startedAt ?? 0;
  const pausedAt = timeline?.pausedAt ?? 0;
  const accumulated = timeline?.accumulatedPausedMs ?? 0;
  const durationMs = timeline?.durationMs ?? 0;
  const drivesItself = Boolean(timeline && durationMs > 0);

  const frame = useFrameCallback(() => {
    'worklet';
    const now = pausedAt || Date.now();
    const elapsed = Math.max(0, now - startedAt - accumulated);
    const next = Math.min(1, elapsed / durationMs);
    if (Math.abs(next - value.value) > 0.0005) value.value = next;
  }, false);

  useEffect(() => {
    frame.setActive(drivesItself && !paused);
    return () => frame.setActive(false);
  }, [frame, drivesItself, paused]);

  useEffect(() => {
    if (drivesItself) return;
    value.value = withTiming(progress ?? 0, progressTiming(motion));
  }, [progress, drivesItself, motion, value]);

  return value;
}
