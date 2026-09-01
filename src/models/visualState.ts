/**
 * Visual state of the notch surface.
 *
 * Deliberately separate from `ActivityStatus`. An activity can be ACTIVE while
 * the surface is COMPACT, and PAUSED while the surface is EXPANDED. Collapsing
 * the two produces the classic bug where dismissing the UI cancels the work.
 */
export type NotchVisualState =
  | 'IDLE'
  | 'COMPACT'
  | 'EXPANDING'
  | 'EXPANDED'
  | 'COLLAPSING';

/** The geometry variant the surface is currently animating toward. */
export type NotchSurfaceVariant = 'idle' | 'compact' | 'charging' | 'expanded';

export function isExpandedish(state: NotchVisualState): boolean {
  return state === 'EXPANDING' || state === 'EXPANDED';
}

export function isVisible(state: NotchVisualState): boolean {
  return state !== 'IDLE';
}
