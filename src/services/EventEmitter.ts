/** Minimal typed event emitter. Listeners are removed via the returned closure. */
export class TypedEmitter<Events extends Record<string, any>> {
  private listeners = new Map<keyof Events, Set<(payload: never) => void>>();

  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as (payload: never) => void);
    return () => {
      set!.delete(listener as (payload: never) => void);
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Copy so a listener that unsubscribes during dispatch cannot skip a peer.
    [...set].forEach((listener) => (listener as (value: Events[K]) => void)(payload));
  }

  removeAll(): void {
    this.listeners.clear();
  }
}
