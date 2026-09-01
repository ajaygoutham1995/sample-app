import { dynamicNotchManager } from '@/services/DynamicNotchManager';
import { getActivity, listActivities } from '@/state/activityStore';
import { ACTIVITY_TINTS } from '../activityControls';
import type { ActivityAction } from '@/models/activity';

/**
 * Stopwatch.
 *
 * The same timestamp engine as the timer, counting the other way. Reset is
 * modelled as a new `startedAt` rather than a zeroed counter, so the reading
 * stays derivable from the clock at all times.
 */
function stopwatchActions(running: boolean): ActivityAction[] {
  return [
    running
      ? { id: 'pause', label: 'Pause', symbol: 'pause.fill', kind: 'primary' }
      : { id: 'resume', label: 'Start', symbol: 'play.fill', kind: 'primary' },
    { id: 'reset', label: 'Reset', symbol: 'arrow.counterclockwise', kind: 'secondary' },
    { id: 'stop', label: 'Stop', symbol: 'stop.fill', kind: 'destructive' },
  ];
}

export function startStopwatch(): string {
  listActivities()
    .filter((activity) => activity.type === 'stopwatch')
    .forEach((activity) => dynamicNotchManager.end(activity.id));

  const activity = dynamicNotchManager.startActivity({
    type: 'stopwatch',
    title: 'Stopwatch',
    symbol: 'stopwatch',
    tint: ACTIVITY_TINTS.stopwatch,
    timeline: {
      startedAt: Date.now(),
      accumulatedPausedMs: 0,
      countsUp: true,
    },
    actions: stopwatchActions(true),
  });

  dynamicNotchManager.registerActionHandler(activity.id, (actionId) => {
    const current = getActivity(activity.id);
    if (!current) return;

    switch (actionId) {
      case 'pause':
        dynamicNotchManager.pause(activity.id);
        dynamicNotchManager.updateActivity(activity.id, { actions: stopwatchActions(false) });
        break;
      case 'resume':
        dynamicNotchManager.resume(activity.id);
        dynamicNotchManager.updateActivity(activity.id, { actions: stopwatchActions(true) });
        break;
      case 'reset':
        dynamicNotchManager.updateActivity(activity.id, {
          status: 'active',
          timeline: {
            startedAt: Date.now(),
            accumulatedPausedMs: 0,
            countsUp: true,
          },
          actions: stopwatchActions(true),
        });
        break;
      case 'stop':
        dynamicNotchManager.end(activity.id);
        break;
    }
  });

  return activity.id;
}
