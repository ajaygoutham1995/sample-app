import { createStore, useStore } from './createStore';

export interface Settings {
  hapticsEnabled: boolean;
  /** 0.6 = slower and more deliberate, 1.6 = snappier. Scales spring stiffness. */
  animationSpeed: number;
  /** 0 = no overshoot, 1 = full designed bounce. Scales spring damping. */
  animationIntensity: number;
  /** Collapse the expanded surface automatically after a period of no input. */
  autoCollapse: boolean;
  autoCollapseMs: number;
  /**
   * Draw the custom surface on devices that have no physical notch, so the
   * interaction can be reviewed on a simulator, an Android device or the web.
   * Never enabled implicitly on a Dynamic Island device.
   */
  previewMode: boolean;
  /** Model id forced by the geometry inspector, e.g. `iPhone14,8`. */
  simulatedModelId: string | null;
  /** Show the development-only geometry inspector overlay. */
  showGeometryInspector: boolean;
  /** Honour the OS Reduce Motion setting. */
  respectReduceMotion: boolean;
}

const initialSettings: Settings = {
  hapticsEnabled: true,
  animationSpeed: 1,
  animationIntensity: 1,
  autoCollapse: true,
  autoCollapseMs: 6000,
  previewMode: false,
  simulatedModelId: null,
  showGeometryInspector: false,
  respectReduceMotion: true,
};

export const settingsStore = createStore<Settings>(initialSettings);

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  settingsStore.setState((previous) => ({ ...previous, [key]: value }));
}

export function useSettings(): Settings {
  return useStore(settingsStore, (state) => state);
}

export function useSetting<K extends keyof Settings>(key: K): Settings[K] {
  return useStore(settingsStore, (state) => state[key]);
}
