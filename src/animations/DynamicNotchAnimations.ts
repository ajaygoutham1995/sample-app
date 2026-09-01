import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

/**
 * Motion design for the notch surface.
 *
 * Everything that moves the container is a spring, expressed as duration plus
 * damping ratio so the spec's millisecond targets stay readable while the
 * physics stays interruptible. A spring retargeted mid-flight continues from
 * its current position and velocity; a duration-based `withTiming` restarts,
 * which is exactly the jump the spec forbids.
 *
 * Charging targets from the spec:
 *   expansion   250-350ms
 *   hold        1-2s        (owned by the manager, not by animation)
 *   contraction 300-450ms
 */

export interface MotionSettings {
  /** 0.6 slow .. 1.6 snappy. Divides duration. */
  speed: number;
  /** 0 none .. 1 full designed bounce. Scales overshoot. */
  intensity: number;
  reduceMotion: boolean;
}

const BASE = {
  /** Compact <-> expanded morph. */
  morph: { duration: 430, dampingRatio: 0.82 },
  /** Charger connected: quick, physical. */
  chargingExpand: { duration: 300, dampingRatio: 0.68 },
  /** Charger reaction retiring: calmer than it arrived. */
  chargingCollapse: { duration: 380, dampingRatio: 0.92 },
  /** Idle <-> compact reveal. */
  reveal: { duration: 380, dampingRatio: 0.85 },
} as const;

export type MotionKey = keyof typeof BASE;

function apply(key: MotionKey, settings: MotionSettings): WithSpringConfig {
  const base = BASE[key];
  const speed = Math.max(0.4, settings.speed);

  if (settings.reduceMotion) {
    // Reduce Motion keeps the state change legible but removes the springiness
    // and the overshoot: same geometry, no bounce, shorter travel time.
    return { duration: Math.round(base.duration * 0.7) / speed, dampingRatio: 1 };
  }

  const intensity = Math.min(1, Math.max(0, settings.intensity));
  // intensity 0 -> critically damped (ratio 1); intensity 1 -> designed bounce.
  const dampingRatio = 1 - (1 - base.dampingRatio) * intensity;

  return { duration: base.duration / speed, dampingRatio };
}

export function springFor(key: MotionKey, settings: MotionSettings): WithSpringConfig {
  return apply(key, settings);
}

/**
 * Content cross-fades are timing-based on purpose: text and controls should
 * appear and disappear crisply while the container is still travelling, so the
 * surface reads as one object with changing contents rather than two views
 * swapping places.
 */
export function contentTiming(settings: MotionSettings, appearing: boolean): WithTimingConfig {
  const speed = Math.max(0.4, settings.speed);
  return {
    duration: (appearing ? 180 : 120) / speed,
    easing: appearing ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
  };
}

/** Progress bars and rings track data, not gesture, so they ease smoothly. */
export function progressTiming(settings: MotionSettings): WithTimingConfig {
  return { duration: 320 / Math.max(0.4, settings.speed), easing: Easing.out(Easing.cubic) };
}
