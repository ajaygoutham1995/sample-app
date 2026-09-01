import { dynamicNotchManager } from '@/services/DynamicNotchManager';
import { listActivities } from '@/state/activityStore';
import { ACTIVITY_TINTS } from '../activityControls';

/**
 * Countdown to an event.
 *
 * Identical machinery to the timer, different framing: the deadline is a real
 * moment rather than a duration the user chose, so there is no pause - you
 * cannot pause a launch.
 */
export function startCountdown(
  eventTitle: string,
  endsAt: number,
  startedAt = Date.now()
): string {
  listActivities()
    .filter((activity) => activity.type === 'countdown')
    .forEach((activity) => dynamicNotchManager.end(activity.id));

  const activity = dynamicNotchManager.startActivity({
    type: 'countdown',
    title: eventTitle,
    symbol: 'calendar',
    tint: ACTIVITY_TINTS.countdown,
    timeline: {
      startedAt,
      endsAt,
      accumulatedPausedMs: 0,
      durationMs: Math.max(0, endsAt - startedAt),
      countsUp: false,
    },
    actions: [{ id: 'dismiss', label: 'Dismiss', symbol: 'xmark', kind: 'destructive' }],
  });

  dynamicNotchManager.registerActionHandler(activity.id, (actionId) => {
    if (actionId === 'dismiss') dynamicNotchManager.end(activity.id);
  });

  return activity.id;
}
