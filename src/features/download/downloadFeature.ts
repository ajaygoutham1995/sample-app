import { dynamicNotchManager } from '@/services/DynamicNotchManager';
import { getActivity, listActivities } from '@/state/activityStore';
import { ACTIVITY_TINTS } from '../activityControls';

/**
 * Download.
 *
 * The progress source here is simulated, but the shape is the real one: a
 * producer pushes progress events into the manager and the surface reacts. A
 * genuine download would replace `scheduleChunk` with the bytes-written
 * callback from the network layer and nothing else would change.
 *
 * The simulation uses a self-cancelling timeout chain rather than an interval
 * so that ending the activity actually stops the work.
 */
export function startDownload(fileName = 'WWDC-Session.mp4'): string {
  listActivities()
    .filter((activity) => activity.type === 'download')
    .forEach((activity) => dynamicNotchManager.end(activity.id));

  const activity = dynamicNotchManager.startActivity({
    type: 'download',
    title: fileName,
    subtitle: 'Starting',
    symbol: 'arrow.down.circle.fill',
    tint: ACTIVITY_TINTS.download,
    progress: 0,
    actions: [{ id: 'cancel', label: 'Cancel download', symbol: 'xmark', kind: 'destructive' }],
  });

  let received = 0;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scheduleChunk = () => {
    // Uneven chunk sizes and gaps: a progress bar that advances perfectly
    // smoothly is the tell of a fake one.
    const delay = 220 + Math.random() * 380;
    timer = setTimeout(() => {
      if (cancelled) return;
      const current = getActivity(activity.id);
      if (!current || current.status !== 'active') {
        if (current?.status === 'paused') scheduleChunk();
        return;
      }

      received = Math.min(1, received + 0.04 + Math.random() * 0.09);

      if (received >= 1) {
        dynamicNotchManager.updateActivity(activity.id, {
          progress: 1,
          subtitle: 'Completed',
          actions: [],
        });
        dynamicNotchManager.complete(activity.id);
        // Let the completed state be seen before the surface retires.
        timer = setTimeout(() => dynamicNotchManager.end(activity.id), 2200);
        return;
      }

      dynamicNotchManager.updateActivity(activity.id, {
        progress: received,
        subtitle: Math.round(received * 100) + '% of 842 MB',
      });
      scheduleChunk();
    }, delay);
  };

  const stop = () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  dynamicNotchManager.registerActionHandler(activity.id, (actionId) => {
    if (actionId !== 'cancel') return;
    stop();
    dynamicNotchManager.cancel(activity.id);
    dynamicNotchManager.end(activity.id);
  });

  // Any other route to ending the activity must also stop the producer.
  const unsubscribe = dynamicNotchManager.events.on('ACTIVITY_ENDED', ({ id }) => {
    if (id !== activity.id) return;
    stop();
    unsubscribe();
  });

  scheduleChunk();
  return activity.id;
}
