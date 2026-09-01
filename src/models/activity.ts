/**
 * The generic activity model.
 *
 * The Dynamic Notch renders an `Activity` and knows nothing about how a timer,
 * a download or a track counts. Features own their mechanics and publish an
 * Activity; the notch owns presentation. Adding a seventh activity type must
 * not require touching the notch surface.
 */

export type ActivityKind =
  | 'timer'
  | 'stopwatch'
  | 'music'
  | 'download'
  | 'countdown'
  | 'charging'
  | 'custom';

export type ActivityStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'error';

export type ActivityActionKind = 'primary' | 'secondary' | 'destructive';

export interface ActivityAction {
  id: string;
  label: string;
  /** SF Symbol name on iOS; the renderer falls back to a glyph elsewhere. */
  symbol: string;
  kind: ActivityActionKind;
  /** Rendered but not tappable, e.g. `Previous` at the head of a queue. */
  disabled?: boolean;
}

/**
 * Timestamp-driven clock state.
 *
 * There is deliberately no "secondsRemaining" field. Storing a countdown as a
 * number means something has to decrement it, which means the value is wrong
 * every time the app is backgrounded, throttled or suspended. Everything the
 * UI shows is derived from these absolute timestamps against `Date.now()`, so
 * returning from background is a recalculation rather than a repair.
 */
export interface ActivityTimeline {
  /** Wall-clock start. */
  startedAt: number;
  /** Wall-clock end for countdowns. Absent for open-ended stopwatches. */
  endsAt?: number;
  /** Wall-clock instant of the current pause, if paused. */
  pausedAt?: number;
  /** Total time already accumulated across previous pause cycles. */
  accumulatedPausedMs: number;
  /** Configured duration for countdown-style activities. */
  durationMs?: number;
  /** Counts up (stopwatch) rather than down (timer, countdown). */
  countsUp: boolean;
}

/**
 * Presentation priority. A transient system reaction such as a charger being
 * connected outranks a running user activity, which outranks a paused one.
 * Features never decide this for themselves; `DynamicNotchManager` does.
 */
export const ActivityPriority = {
  SYSTEM_TRANSIENT: 300,
  USER_ACTIVE: 200,
  USER_PAUSED: 100,
  BACKGROUND: 50,
} as const;

export interface Activity {
  id: string;
  type: ActivityKind;

  title: string;
  subtitle?: string;

  /** 0..1 when the activity is measurable. Absent means indeterminate. */
  progress?: number;

  status: ActivityStatus;

  timeline?: ActivityTimeline;

  /** Accent used by the compact glyph and the progress ring. */
  tint: string;
  /** SF Symbol name for the compact leading glyph. */
  symbol: string;

  actions: ActivityAction[];

  /**
   * Auto-dismisses after this long. Used by transient reactions such as
   * charging. Absent means the activity stays until it is ended.
   */
  transientMs?: number;

  createdAt: number;
  metadata?: Record<string, unknown>;
}

export function priorityOf(activity: Activity): number {
  if (activity.type === 'charging') return ActivityPriority.SYSTEM_TRANSIENT;
  switch (activity.status) {
    case 'active':
      return ActivityPriority.USER_ACTIVE;
    case 'paused':
      return ActivityPriority.USER_PAUSED;
    default:
      return ActivityPriority.BACKGROUND;
  }
}

export function isTerminal(status: ActivityStatus): boolean {
  return (
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'expired' ||
    status === 'error'
  );
}

/**
 * Elapsed milliseconds, excluding paused time. Pure function of timestamps.
 */
export function elapsedMs(timeline: ActivityTimeline, now: number): number {
  const stopped = timeline.pausedAt ?? now;
  return Math.max(0, stopped - timeline.startedAt - timeline.accumulatedPausedMs);
}

/**
 * Remaining milliseconds for a countdown-style activity. Never negative.
 */
export function remainingMs(timeline: ActivityTimeline, now: number): number {
  if (timeline.durationMs == null) return 0;
  return Math.max(0, timeline.durationMs - elapsedMs(timeline, now));
}

/** 0..1 completion for a countdown-style activity. */
export function timelineProgress(timeline: ActivityTimeline, now: number): number {
  if (!timeline.durationMs) return 0;
  return Math.min(1, elapsedMs(timeline, now) / timeline.durationMs);
}

/** `9:05`, `1:02:03`, `00.0` - the format the compact readout uses. */
export function formatDuration(ms: number, withTenths = false): string {
  'worklet';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => (value < 10 ? '0' + value : String(value));

  if (withTenths && hours === 0) {
    const tenths = Math.floor((ms % 1000) / 100);
    return minutes + ':' + pad(seconds) + '.' + tenths;
  }
  if (hours > 0) {
    return hours + ':' + pad(minutes) + ':' + pad(seconds);
  }
  return minutes + ':' + pad(seconds);
}
