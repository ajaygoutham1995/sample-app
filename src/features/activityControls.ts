import type { Activity, ActivityAction } from '@/models/activity';

/**
 * The control set for anything that runs on a clock.
 *
 * Derived from status rather than stored, so a paused timer cannot end up
 * showing a Pause button - the actions are a function of the state, not a
 * second copy of it that has to be kept in sync.
 */
export function transportActions(activity: Activity): ActivityAction[] {
  const running = activity.status === 'active';
  return [
    running
      ? { id: 'pause', label: 'Pause', symbol: 'pause.fill', kind: 'primary' }
      : { id: 'resume', label: 'Resume', symbol: 'play.fill', kind: 'primary' },
    { id: 'stop', label: 'Stop', symbol: 'stop.fill', kind: 'destructive' },
  ];
}

export function playbackActions(isPlaying: boolean, canGoBack: boolean): ActivityAction[] {
  return [
    {
      id: 'previous',
      label: 'Previous track',
      symbol: 'backward.fill',
      kind: 'secondary',
      disabled: !canGoBack,
    },
    isPlaying
      ? { id: 'pause', label: 'Pause', symbol: 'pause.fill', kind: 'primary' }
      : { id: 'play', label: 'Play', symbol: 'play.fill', kind: 'primary' },
    { id: 'next', label: 'Next track', symbol: 'forward.fill', kind: 'secondary' },
  ];
}

export const ACTIVITY_TINTS = {
  timer: '#FF9F0A',
  stopwatch: '#0A84FF',
  music: '#FF375F',
  download: '#30D158',
  countdown: '#BF5AF2',
  charging: '#34C759',
} as const;
