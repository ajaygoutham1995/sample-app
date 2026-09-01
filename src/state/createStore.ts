import { useSyncExternalStore } from 'react';

/**
 * A ~40 line external store.
 *
 * The Dynamic Notch needs state that lives outside React (services push into
 * it from battery events, notification callbacks and native ActivityKit
 * callbacks, none of which are inside a render). `useSyncExternalStore` is the
 * React-blessed way to do that, so a third-party state library would only be
 * adding a dependency, not a capability.
 */
export interface Store<T> {
  getState: () => T;
  setState: (updater: T | ((previous: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      const next =
        typeof updater === 'function' ? (updater as (previous: T) => T)(state) : updater;
      if (Object.is(next, state)) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Subscribe to a slice. `selector` must return a stable reference for
 * unchanged data or the component re-renders on every store write.
 */
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}
