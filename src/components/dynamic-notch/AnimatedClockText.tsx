import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

import { formatDuration, type ActivityTimeline } from '@/models/activity';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface AnimatedClockTextProps {
  timeline: ActivityTimeline;
  paused: boolean;
  /** Show tenths of a second (stopwatch under an hour). */
  withTenths?: boolean;
  style?: TextStyle;
  /** Update granularity in milliseconds. 100 for tenths, 250 otherwise. */
  stepMs?: number;
}

/**
 * A running clock that never re-renders React.
 *
 * The value is recomputed on the UI thread from the activity's absolute
 * timestamps and written straight into a TextInput's `text` prop, so a running
 * timer costs zero JS work per frame and cannot drift: there is no counter to
 * fall behind, only a subtraction against the current clock.
 *
 * The web has no `setNativeProps` path for this, so it falls back to an
 * interval-driven `Text`. That is a platform fallback, not the design.
 */
export function AnimatedClockText({
  timeline,
  paused,
  withTenths = false,
  style,
  stepMs,
}: AnimatedClockTextProps) {
  const step = stepMs ?? (withTenths ? 100 : 250);

  const startedAt = timeline.startedAt;
  const pausedAt = timeline.pausedAt ?? 0;
  const accumulated = timeline.accumulatedPausedMs;
  const durationMs = timeline.durationMs ?? 0;
  const countsUp = timeline.countsUp;

  const tick = useSharedValue(Math.floor(Date.now() / step) * step);

  const frame = useFrameCallback(() => {
    'worklet';
    const quantised = Math.floor(Date.now() / step) * step;
    if (quantised !== tick.value) tick.value = quantised;
  }, false);

  useEffect(() => {
    // A paused clock has nothing to recompute, so the frame callback stops
    // entirely rather than idling.
    frame.setActive(!paused && Platform.OS !== 'web');
    return () => frame.setActive(false);
  }, [frame, paused]);

  const animatedProps = useAnimatedProps(() => {
    const now = paused && pausedAt ? pausedAt : tick.value;
    const stopped = pausedAt || now;
    const elapsed = Math.max(0, stopped - startedAt - accumulated);
    const value = countsUp ? elapsed : Math.max(0, durationMs - elapsed);
    return { text: formatDuration(value, withTenths) } as never;
  }, [startedAt, pausedAt, accumulated, durationMs, countsUp, withTenths, paused]);

  if (Platform.OS === 'web') {
    return <WebClockText {...{ timeline, paused, withTenths, style, step }} />;
  }

  const initial = formatDuration(
    countsUp
      ? Math.max(0, (pausedAt || Date.now()) - startedAt - accumulated)
      : Math.max(0, durationMs - Math.max(0, (pausedAt || Date.now()) - startedAt - accumulated)),
    withTenths
  );

  return (
    <AnimatedTextInput
      editable={false}
      // A read-only TextInput is a display surface here, not an input: it must
      // not steal focus, show a caret, or be reachable by the keyboard.
      pointerEvents="none"
      focusable={false}
      caretHidden
      underlineColorAndroid="transparent"
      defaultValue={initial}
      animatedProps={animatedProps}
      style={[styles.clock, style]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}

function WebClockText({
  timeline,
  paused,
  withTenths,
  style,
  step,
}: Omit<AnimatedClockTextProps, 'stepMs'> & { step: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(Date.now()), step);
    return () => clearInterval(id);
  }, [paused, step]);

  const stopped = timeline.pausedAt ?? now;
  const elapsed = Math.max(0, stopped - timeline.startedAt - timeline.accumulatedPausedMs);
  const value = timeline.countsUp
    ? elapsed
    : Math.max(0, (timeline.durationMs ?? 0) - elapsed);

  return <Text style={[styles.clock, style]}>{formatDuration(value, withTenths)}</Text>;
}

const styles = StyleSheet.create({
  clock: {
    padding: 0,
    margin: 0,
    // A TextInput carries platform padding that a Text does not; zeroing it is
    // what keeps the readout optically aligned with the glyph beside it.
    ...Platform.select({ android: { includeFontPadding: false, textAlignVertical: 'center' } }),
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
});
