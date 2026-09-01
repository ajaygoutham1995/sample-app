import type { Activity } from '@/models/activity';
import { createStore, useStore } from './createStore';

export interface ActivityState {
  byId: Record<string, Activity>;
  /** Creation order. Ties in priority are broken by "most recent wins". */
  order: string[];
}

export const activityStore = createStore<ActivityState>({ byId: {}, order: [] });

export function upsertActivity(activity: Activity) {
  activityStore.setState((state) => ({
    byId: { ...state.byId, [activity.id]: activity },
    order: state.order.includes(activity.id) ? state.order : [...state.order, activity.id],
  }));
}

export function patchActivity(id: string, patch: Partial<Activity>): Activity | null {
  const existing = activityStore.getState().byId[id];
  if (!existing) return null;
  const next: Activity = { ...existing, ...patch };
  upsertActivity(next);
  return next;
}

export function removeActivity(id: string) {
  activityStore.setState((state) => {
    if (!state.byId[id]) return state;
    const byId = { ...state.byId };
    delete byId[id];
    return { byId, order: state.order.filter((entry) => entry !== id) };
  });
}

export function getActivity(id: string | null): Activity | null {
  if (!id) return null;
  return activityStore.getState().byId[id] ?? null;
}

export function listActivities(): Activity[] {
  const { byId, order } = activityStore.getState();
  return order.map((id) => byId[id]).filter(Boolean);
}

export function useActivities(): Activity[] {
  const state = useStore(activityStore, (value) => value);
  return state.order.map((id) => state.byId[id]).filter(Boolean);
}

export function useActivity(id: string | null): Activity | null {
  return useStore(activityStore, (state) => (id ? (state.byId[id] ?? null) : null));
}
