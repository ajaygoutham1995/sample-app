import { dynamicNotchManager } from '@/services/DynamicNotchManager';
import { getActivity, listActivities } from '@/state/activityStore';
import { ACTIVITY_TINTS, playbackActions } from '../activityControls';

/**
 * Music.
 *
 * A presentation demo, not a player: there is no audio engine wired up, so
 * "playing" means the activity advances its own position. The point it proves
 * is that a non-clock activity with its own transport reuses the notch engine
 * untouched.
 */
interface Track {
  title: string;
  artist: string;
  durationMs: number;
}

const QUEUE: Track[] = [
  { title: 'Midnight Static', artist: 'Vector Field', durationMs: 214_000 },
  { title: 'Low Orbit', artist: 'Kepler Nine', durationMs: 187_000 },
  { title: 'Paper Cranes', artist: 'Hana Ito', durationMs: 243_000 },
];

let queueIndex = 0;

export function startMusic(): string {
  listActivities()
    .filter((activity) => activity.type === 'music')
    .forEach((activity) => dynamicNotchManager.end(activity.id));

  queueIndex = 0;
  const activity = dynamicNotchManager.startActivity({
    type: 'music',
    title: QUEUE[0].title,
    subtitle: QUEUE[0].artist,
    symbol: 'music.note',
    tint: ACTIVITY_TINTS.music,
    timeline: {
      startedAt: Date.now(),
      accumulatedPausedMs: 0,
      durationMs: QUEUE[0].durationMs,
      endsAt: Date.now() + QUEUE[0].durationMs,
      countsUp: true,
    },
    actions: playbackActions(true, false),
  });

  const loadTrack = (index: number) => {
    queueIndex = (index + QUEUE.length) % QUEUE.length;
    const track = QUEUE[queueIndex];
    const now = Date.now();
    dynamicNotchManager.updateActivity(activity.id, {
      title: track.title,
      subtitle: track.artist,
      status: 'active',
      timeline: {
        startedAt: now,
        endsAt: now + track.durationMs,
        accumulatedPausedMs: 0,
        durationMs: track.durationMs,
        countsUp: true,
      },
      actions: playbackActions(true, queueIndex > 0),
    });
  };

  dynamicNotchManager.registerActionHandler(activity.id, (actionId) => {
    const current = getActivity(activity.id);
    if (!current) return;

    switch (actionId) {
      case 'pause':
        dynamicNotchManager.pause(activity.id);
        dynamicNotchManager.updateActivity(activity.id, {
          actions: playbackActions(false, queueIndex > 0),
        });
        break;
      case 'play':
        dynamicNotchManager.resume(activity.id);
        dynamicNotchManager.updateActivity(activity.id, {
          actions: playbackActions(true, queueIndex > 0),
        });
        break;
      case 'next':
        loadTrack(queueIndex + 1);
        break;
      case 'previous':
        loadTrack(queueIndex - 1);
        break;
    }
  });

  return activity.id;
}
