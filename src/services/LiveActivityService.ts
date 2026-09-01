import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import type { Activity } from '@/models/activity';

/**
 * ActivityKit bridge.
 *
 *   TypeScript -> Expo native module -> Swift -> ActivityKit -> WidgetKit
 *
 * The native module lives in `modules/dynamic-notch-activity` and only exists
 * in a development build. `requireOptionalNativeModule` returns null in Expo
 * Go, on Android and on web, so every method here degrades to a no-op rather
 * than throwing. Layer A (the in-app Dynamic Notch) never depends on this.
 */

export type LiveActivityAuthorization =
  | 'ENABLED'
  | 'DENIED'
  | 'UNSUPPORTED_DEVICE'
  | 'UNSUPPORTED_OS'
  | 'MODULE_UNAVAILABLE';

/** Serialisable mirror of an Activity. Functions and symbols never cross. */
export interface LiveActivityPayload {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  symbol: string;
  tint: string;
  progress: number | null;
  status: string;
  /** Absolute epoch milliseconds; the widget builds its own ProgressView. */
  startedAt: number | null;
  endsAt: number | null;
  countsUp: boolean;
  isPaused: boolean;
}

interface DynamicNotchActivityModule {
  getAuthorization(): LiveActivityAuthorization;
  startActivity(payload: LiveActivityPayload): Promise<string | null>;
  updateActivity(payload: LiveActivityPayload): Promise<void>;
  endActivity(id: string, dismissImmediately: boolean): Promise<void>;
  getActiveActivities(): Promise<LiveActivityPayload[]>;
}

const nativeModule = requireOptionalNativeModule<DynamicNotchActivityModule>(
  'DynamicNotchActivity'
);

function toPayload(activity: Activity): LiveActivityPayload {
  const timeline = activity.timeline;
  return {
    id: activity.id,
    type: activity.type,
    title: activity.title,
    subtitle: activity.subtitle ?? null,
    symbol: activity.symbol,
    tint: activity.tint,
    progress: activity.progress ?? null,
    status: activity.status,
    startedAt: timeline?.startedAt ?? null,
    endsAt: timeline?.endsAt ?? null,
    countsUp: timeline?.countsUp ?? false,
    isPaused: activity.status === 'paused',
  };
}

function fromPayload(payload: LiveActivityPayload): Activity {
  return {
    id: payload.id,
    type: (payload.type as Activity['type']) ?? 'custom',
    title: payload.title,
    subtitle: payload.subtitle ?? undefined,
    symbol: payload.symbol,
    tint: payload.tint,
    progress: payload.progress ?? undefined,
    status: (payload.status as Activity['status']) ?? 'active',
    timeline:
      payload.startedAt == null
        ? undefined
        : {
            startedAt: payload.startedAt,
            endsAt: payload.endsAt ?? undefined,
            accumulatedPausedMs: 0,
            durationMs:
              payload.endsAt == null ? undefined : payload.endsAt - payload.startedAt,
            countsUp: payload.countsUp,
          },
    actions: [],
    createdAt: payload.startedAt ?? Date.now(),
  };
}

class LiveActivityService {
  /** Ids we have handed to ActivityKit, so we only end what we started. */
  private live = new Set<string>();

  get isAvailable(): boolean {
    return Platform.OS === 'ios' && nativeModule != null;
  }

  getAuthorization(): LiveActivityAuthorization {
    if (!this.isAvailable) return 'MODULE_UNAVAILABLE';
    try {
      return nativeModule!.getAuthorization();
    } catch {
      return 'MODULE_UNAVAILABLE';
    }
  }

  async start(activity: Activity): Promise<void> {
    // A charging reaction is a one-second in-app flourish, not something worth
    // putting on the Lock Screen.
    if (activity.type === 'charging') return;
    if (!this.isAvailable) return;
    if (this.getAuthorization() !== 'ENABLED') return;

    try {
      await nativeModule!.startActivity(toPayload(activity));
      this.live.add(activity.id);
    } catch (error) {
      console.warn('[LiveActivity] start failed', error);
    }
  }

  async update(activity: Activity): Promise<void> {
    if (!this.isAvailable || !this.live.has(activity.id)) return;
    try {
      await nativeModule!.updateActivity(toPayload(activity));
    } catch (error) {
      console.warn('[LiveActivity] update failed', error);
    }
  }

  async end(activity: Activity): Promise<void> {
    if (!this.isAvailable || !this.live.has(activity.id)) return;
    try {
      await nativeModule!.endActivity(activity.id, true);
    } catch (error) {
      console.warn('[LiveActivity] end failed', error);
    } finally {
      this.live.delete(activity.id);
    }
  }

  /**
   * Live Activities outlive the app process. On launch we adopt whatever is
   * still running rather than assuming a clean slate.
   */
  async restore(): Promise<Activity[]> {
    if (!this.isAvailable) return [];
    try {
      const payloads = await nativeModule!.getActiveActivities();
      payloads.forEach((payload) => this.live.add(payload.id));
      return payloads.map(fromPayload);
    } catch (error) {
      console.warn('[LiveActivity] restore failed', error);
      return [];
    }
  }
}

export const liveActivityService = new LiveActivityService();

export function describeAuthorization(state: LiveActivityAuthorization): string {
  switch (state) {
    case 'ENABLED':
      return 'Live Activities are enabled for this app.';
    case 'DENIED':
      return 'Live Activities are turned off. Enable them in Settings > Dynamic Notch > Live Activities.';
    case 'UNSUPPORTED_DEVICE':
      return 'This device does not support Live Activities.';
    case 'UNSUPPORTED_OS':
      return 'Live Activities require iOS 16.1 or later.';
    case 'MODULE_UNAVAILABLE':
      return 'Not available in this build. Live Activities need a development build with the ActivityKit module.';
  }
}
