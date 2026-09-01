import { dynamicNotchManager } from '@/services/DynamicNotchManager';
import { notificationService } from '@/services/NotificationService';
import { getActivity, listActivities } from '@/state/activityStore';
import { ACTIVITY_TINTS, transportActions } from '../activityControls';

/**
 * Timer.
 *
 * Owns nothing but timestamps. There is no interval, no tick handler and no
 * stored "seconds remaining" - the manager holds one alarm for the soonest
 * deadline and the UI derives the readout from `endsAt`. Backgrounding the app
 * for ten minutes therefore costs nothing to recover from.
 */
export function startTimer(durationMs: number, label = 'Timer'): string {
  // One timer at a time keeps the demo honest about which activity owns the
  // surface; a real product would allow several and let priority decide.
  listActivities()
    .filter((activity) => activity.type === 'timer')
    .forEach((activity) => dynamicNotchManager.end(activity.id));

  const now = Date.now();
  const activity = dynamicNotchManager.startActivity({
    type: 'timer',
    title: label,
    symbol: 'timer',
    tint: ACTIVITY_TINTS.timer,
    timeline: {
      startedAt: now,
      endsAt: now + durationMs,
      accumulatedPausedMs: 0,
      durationMs,
      countsUp: false,
    },
    actions: [],
  });

  dynamicNotchManager.updateActivity(activity.id, {
    actions: transportActions({ ...activity, status: 'active' }),
  });

  dynamicNotchManager.registerActionHandler(activity.id, (actionId) => {
    const current = getActivity(activity.id);
    if (!current) return;

    switch (actionId) {
      case 'pause': {
        const next = dynamicNotchManager.pause(activity.id);
        if (next) {
          dynamicNotchManager.updateActivity(activity.id, {
            actions: transportActions(next),
          });
        }
        break;
      }
      case 'resume': {
        const next = dynamicNotchManager.resume(activity.id);
        if (next) {
          dynamicNotchManager.updateActivity(activity.id, {
            actions: transportActions(next),
          });
        }
        break;
      }
      case 'stop':
        dynamicNotchManager.end(activity.id);
        break;
    }
  });

  return activity.id;
}

/** Announce a finished timer when the app was not in the foreground. */
export function attachTimerCompletionNotice(): () => void {
  return dynamicNotchManager.events.on('ACTIVITY_EXPIRED', (activity) => {
    if (activity.type !== 'timer' && activity.type !== 'countdown') return;
    void notificationService.notifyActivityFinished(activity.title, 'Finished.');
  });
}
