import type { NotchVisualState } from '@/models/visualState';
import { createStore, useStore } from './createStore';

export interface DynamicNotchState {
  visualState: NotchVisualState;
  /** Activity currently owning the surface, chosen by priority. */
  presentedActivityId: string | null;
  /**
   * Activity the surface will return to once a transient system reaction
   * (charging) finishes. Kept alive, never destroyed.
   */
  suspendedActivityId: string | null;
  /** Bumped whenever the user interacts, to reset the auto-collapse window. */
  lastInteractionAt: number;
}

export const dynamicNotchStore = createStore<DynamicNotchState>({
  visualState: 'IDLE',
  presentedActivityId: null,
  suspendedActivityId: null,
  lastInteractionAt: 0,
});

export function useNotchVisualState(): NotchVisualState {
  return useStore(dynamicNotchStore, (state) => state.visualState);
}

export function usePresentedActivityId(): string | null {
  return useStore(dynamicNotchStore, (state) => state.presentedActivityId);
}
