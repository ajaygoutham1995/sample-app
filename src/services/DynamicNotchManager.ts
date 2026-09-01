import { AppState, type AppStateStatus } from 'react-native';

import {
  isTerminal,
  priorityOf,
  remainingMs,
  type Activity,
  type ActivityKind,
  type ActivityStatus,
  type ActivityTimeline,
} from '@/models/activity';
import type { NotchVisualState } from '@/models/visualState';
import {
  activityStore,
  getActivity,
  listActivities,
  patchActivity,
  removeActivity,
  upsertActivity,
} from '@/state/activityStore';
import { dynamicNotchStore } from '@/state/dynamicNotchStore';
import { settingsStore } from '@/state/settingsStore';
import { TypedEmitter } from './EventEmitter';
import { playHaptic } from './HapticsService';
import { liveActivityService } from './LiveActivityService';

export interface NotchEvents {
  ACTIVITY_STARTED: Activity;
  ACTIVITY_UPDATED: Activity;
  ACTIVITY_PAUSED: Activity;
  ACTIVITY_RESUMED: Activity;
  ACTIVITY_COMPLETED: Activity;
  ACTIVITY_CANCELLED: Activity;
  ACTIVITY_EXPIRED: Activity;
  ACTIVITY_ENDED: { id: string };
  CHARGER_CONNECTED: { batteryLevel: number | null };
  CHARGER_DISCONNECTED: { batteryLevel: number | null };
  VISUAL_STATE_CHANGED: { from: NotchVisualState; to: NotchVisualState };
  PRESENTATION_CHANGED: { activityId: string | null };
}

export interface StartActivityInput {
  id?: string;
  type: ActivityKind;
  title: string;
  subtitle?: string;
  symbol: string;
  tint: string;
  progress?: number;
  timeline?: ActivityTimeline;
  actions?: Activity['actions'];
  transientMs?: number;
  metadata?: Record<string, unknown>;
  /** Present the surface in compact form as soon as the activity starts. */
  reveal?: boolean;
}

let idCounter = 0;
function nextId(type: string): string {
  idCounter += 1;
  return type + '-' + Date.now().toString(36) + '-' + idCounter;
}

/**
 * The single orchestration layer.
 *
 * Every feature - timer, stopwatch, music, download, countdown, charging -
 * talks to this object and nothing else. Features never touch the visual
 * state, never decide which activity is on screen, and never drive the
 * surface directly. That is what keeps a seventh activity type from being a
 * rewrite of the notch.
 *
 * Scheduling policy: this class holds at most three timers at any moment -
 * one transient dismissal, one auto-collapse, and one expiry alarm set to the
 * single soonest deadline across all activities. There is no per-activity
 * interval and no render clock here; the UI derives every displayed time from
 * timestamps on the animation thread.
 */
class DynamicNotchManager {
  readonly events = new TypedEmitter<NotchEvents>();

  private transientTimer: ReturnType<typeof setTimeout> | null = null;
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryDeadline: number | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private started = false;

  // ---------------------------------------------------------------- lifecycle

  /** Called once from the app root. Safe to call twice. */
  start(): void {
    if (this.started) return;
    this.started = true;

    this.appStateSubscription = AppState.addEventListener('change', this.handleAppState);

    // Adopt any Live Activity that outlived a previous app process.
    void liveActivityService.restore().then((restored) => {
      restored.forEach((activity) => {
        if (!getActivity(activity.id)) upsertActivity(activity);
      });
      this.reconcile();
    });
  }

  stop(): void {
    this.clearTimer('transientTimer');
    this.clearTimer('collapseTimer');
    this.clearTimer('expiryTimer');
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.started = false;
  }

  private handleAppState = (status: AppStateStatus) => {
    if (status !== 'active') return;
    // Returning to the foreground is a recalculation, not a repair: every
    // deadline is absolute, so we simply re-evaluate them against now.
    this.reconcile();
  };

  // ---------------------------------------------------------------- activities

  startActivity(input: StartActivityInput): Activity {
    const activity: Activity = {
      id: input.id ?? nextId(input.type),
      type: input.type,
      title: input.title,
      subtitle: input.subtitle,
      symbol: input.symbol,
      tint: input.tint,
      progress: input.progress,
      status: 'active',
      timeline: input.timeline,
      actions: input.actions ?? [],
      transientMs: input.transientMs,
      metadata: input.metadata,
      createdAt: Date.now(),
    };

    upsertActivity(activity);
    this.events.emit('ACTIVITY_STARTED', activity);
    void liveActivityService.start(activity);

    if (input.reveal !== false) this.reveal();
    playHaptic(activity.type === 'charging' ? 'chargerConnected' : 'activityStart');

    this.reconcile();
    return activity;
  }

  updateActivity(id: string, patch: Partial<Activity>): Activity | null {
    const next = patchActivity(id, patch);
    if (!next) return null;
    this.events.emit('ACTIVITY_UPDATED', next);
    void liveActivityService.update(next);
    this.reconcile();
    return next;
  }

  pause(id: string): Activity | null {
    const activity = getActivity(id);
    if (!activity || activity.status !== 'active') return activity;

    const timeline = activity.timeline
      ? { ...activity.timeline, pausedAt: Date.now() }
      : undefined;

    const next = this.updateActivity(id, { status: 'paused', timeline });
    if (next) this.events.emit('ACTIVITY_PAUSED', next);
    return next;
  }

  resume(id: string): Activity | null {
    const activity = getActivity(id);
    if (!activity || activity.status !== 'paused') return activity;

    let timeline = activity.timeline;
    if (timeline?.pausedAt) {
      const pausedFor = Date.now() - timeline.pausedAt;
      timeline = {
        ...timeline,
        pausedAt: undefined,
        accumulatedPausedMs: timeline.accumulatedPausedMs + pausedFor,
        // The absolute end moves with the pause so the remaining time is
        // preserved exactly rather than approximately.
        endsAt: timeline.endsAt ? timeline.endsAt + pausedFor : undefined,
      };
    }

    const next = this.updateActivity(id, { status: 'active', timeline });
    if (next) this.events.emit('ACTIVITY_RESUMED', next);
    return next;
  }

  complete(id: string): Activity | null {
    const next = this.updateActivity(id, { status: 'completed', progress: 1 });
    if (next) {
      this.events.emit('ACTIVITY_COMPLETED', next);
      playHaptic('activityCompleted');
    }
    return next;
  }

  cancel(id: string): Activity | null {
    const next = this.updateActivity(id, { status: 'cancelled' });
    if (next) this.events.emit('ACTIVITY_CANCELLED', next);
    return next;
  }

  /** Remove an activity entirely and let the surface fall back or retire. */
  end(id: string): void {
    const activity = getActivity(id);
    if (!activity) return;
    void liveActivityService.end(activity);
    this.actionHandlers.delete(id);
    removeActivity(id);
    this.events.emit('ACTIVITY_ENDED', { id });
    this.reconcile();
  }

  setStatus(id: string, status: ActivityStatus): Activity | null {
    switch (status) {
      case 'paused':
        return this.pause(id);
      case 'active':
        return this.resume(id);
      case 'completed':
        return this.complete(id);
      case 'cancelled':
        return this.cancel(id);
      default:
        return this.updateActivity(id, { status });
    }
  }

  // ------------------------------------------------------------------- actions

  /**
   * Action handlers live here rather than on the Activity because an Activity
   * has to stay serialisable - it crosses the bridge to ActivityKit. A feature
   * registers its handler when it starts an activity; the surface only ever
   * dispatches an action id.
   */
  private actionHandlers = new Map<string, (actionId: string) => void>();

  registerActionHandler(activityId: string, handler: (actionId: string) => void): () => void {
    this.actionHandlers.set(activityId, handler);
    return () => this.actionHandlers.delete(activityId);
  }

  dispatchAction(activityId: string, actionId: string): void {
    this.actionHandlers.get(activityId)?.(actionId);
  }

  // ------------------------------------------------------------------ charging

  /**
   * A charger event never destroys running work. It publishes a transient,
   * top-priority activity; the previous one keeps running underneath and is
   * restored automatically when the transient retires.
   */
  handleChargerConnected(batteryLevel: number | null): void {
    this.events.emit('CHARGER_CONNECTED', { batteryLevel });

    const existing = listActivities().find((entry) => entry.type === 'charging');
    if (existing) this.end(existing.id);

    const percent = batteryLevel == null ? null : Math.round(batteryLevel * 100);

    this.startActivity({
      type: 'charging',
      title: 'Charging Connected',
      subtitle: percent == null ? undefined : percent + '%',
      symbol: 'bolt.fill',
      tint: '#34C759',
      progress: batteryLevel ?? undefined,
      // 1.6s of content sits inside the spec's 1-2 second hold window.
      transientMs: 1600,
      metadata: { batteryLevel },
    });
  }

  handleChargerDisconnected(batteryLevel: number | null): void {
    this.events.emit('CHARGER_DISCONNECTED', { batteryLevel });
    playHaptic('chargerDisconnected');
    // Deliberately silent: the disconnect retires any charging presentation
    // and returns to whatever was underneath, without replaying the animation.
    const existing = listActivities().find((entry) => entry.type === 'charging');
    if (existing) this.end(existing.id);
  }

  handleBatteryLevel(batteryLevel: number): void {
    const charging = listActivities().find((entry) => entry.type === 'charging');
    if (!charging) return;
    this.updateActivity(charging.id, {
      subtitle: Math.round(batteryLevel * 100) + '%',
      progress: batteryLevel,
      metadata: { batteryLevel },
    });
  }

  // -------------------------------------------------------------- visual state

  private setVisualState(to: NotchVisualState): void {
    const from = dynamicNotchStore.getState().visualState;
    if (from === to) return;
    dynamicNotchStore.setState((state) => ({ ...state, visualState: to }));
    this.events.emit('VISUAL_STATE_CHANGED', { from, to });
  }

  getVisualState(): NotchVisualState {
    return dynamicNotchStore.getState().visualState;
  }

  /** Bring the surface out of IDLE into COMPACT if anything is presentable. */
  reveal(): void {
    if (this.getVisualState() === 'IDLE') this.setVisualState('COMPACT');
  }

  expand(): void {
    const state = this.getVisualState();
    if (state === 'EXPANDED' || state === 'EXPANDING') return;
    if (!dynamicNotchStore.getState().presentedActivityId) return;
    this.setVisualState('EXPANDING');
    playHaptic('expand');
    this.noteInteraction();
  }

  /** Called by the surface when its expand animation settles. */
  confirmExpanded(): void {
    if (this.getVisualState() === 'EXPANDING') this.setVisualState('EXPANDED');
    this.scheduleAutoCollapse();
  }

  collapse(): void {
    const state = this.getVisualState();
    if (state === 'COMPACT' || state === 'IDLE' || state === 'COLLAPSING') return;
    this.clearTimer('collapseTimer');
    this.setVisualState('COLLAPSING');
    playHaptic('collapse');
  }

  /** Called by the surface when its collapse animation settles. */
  confirmCollapsed(): void {
    if (this.getVisualState() !== 'COLLAPSING') return;
    this.setVisualState(
      dynamicNotchStore.getState().presentedActivityId ? 'COMPACT' : 'IDLE'
    );
  }

  toggle(): void {
    const state = this.getVisualState();
    if (state === 'EXPANDED' || state === 'EXPANDING') this.collapse();
    else this.expand();
  }

  noteInteraction(): void {
    dynamicNotchStore.setState((state) => ({ ...state, lastInteractionAt: Date.now() }));
    this.scheduleAutoCollapse();
  }

  private scheduleAutoCollapse(): void {
    this.clearTimer('collapseTimer');
    const settings = settingsStore.getState();
    if (!settings.autoCollapse) return;
    const state = this.getVisualState();
    if (state !== 'EXPANDED' && state !== 'EXPANDING') return;

    this.collapseTimer = setTimeout(() => {
      this.collapseTimer = null;
      this.collapse();
    }, settings.autoCollapseMs);
  }

  // ---------------------------------------------------------------- reconcile

  /**
   * Recompute what the surface should be showing.
   *
   * Priority order comes from `priorityOf`; ties break toward the most
   * recently created activity. This is the only place presentation is decided,
   * which is what stops two features fighting over the surface.
   */
  reconcile(): void {
    const activities = listActivities();

    const candidates = activities.filter((activity) => !isTerminal(activity.status));
    const presentable = candidates.length > 0 ? candidates : activities;

    const winner =
      presentable
        .slice()
        .sort((a, b) => {
          const byPriority = priorityOf(b) - priorityOf(a);
          if (byPriority !== 0) return byPriority;
          return b.createdAt - a.createdAt;
        })
        .at(0) ?? null;

    const previous = dynamicNotchStore.getState().presentedActivityId;
    const winnerId = winner?.id ?? null;

    if (previous !== winnerId) {
      dynamicNotchStore.setState((state) => ({
        ...state,
        presentedActivityId: winnerId,
        // Remember what a transient reaction is standing in front of.
        suspendedActivityId:
          winner?.type === 'charging' && previous && previous !== winnerId
            ? previous
            : winner?.type === 'charging'
              ? state.suspendedActivityId
              : null,
      }));
      this.events.emit('PRESENTATION_CHANGED', { activityId: winnerId });
    }

    if (!winnerId && this.getVisualState() !== 'IDLE') {
      this.setVisualState('IDLE');
    } else if (winnerId && this.getVisualState() === 'IDLE') {
      this.setVisualState('COMPACT');
    }

    this.scheduleTransientDismissal(winner);
    this.scheduleExpiry(activities);
  }

  /** One alarm for the transient activity currently on screen. */
  private scheduleTransientDismissal(winner: Activity | null): void {
    this.clearTimer('transientTimer');
    if (!winner?.transientMs) return;

    const dueIn = Math.max(0, winner.createdAt + winner.transientMs - Date.now());
    this.transientTimer = setTimeout(() => {
      this.transientTimer = null;
      // Only retire it if it is still the thing on screen.
      if (dynamicNotchStore.getState().presentedActivityId === winner.id) {
        this.end(winner.id);
      }
    }, dueIn);
  }

  /**
   * One alarm for the soonest deadline across every countdown-style activity.
   * Rescheduled whenever an activity changes or the app returns to the
   * foreground - never a per-activity interval.
   */
  private scheduleExpiry(activities: Activity[]): void {
    const now = Date.now();

    // Fire anything already past its deadline before scheduling the next one.
    let firedAny = false;
    activities.forEach((activity) => {
      if (activity.status !== 'active' || !activity.timeline) return;
      const { timeline } = activity;
      if (timeline.countsUp || timeline.durationMs == null) return;
      if (remainingMs(timeline, now) > 0) return;

      const settled = patchActivity(activity.id, { status: 'completed', progress: 1 });
      if (settled) {
        this.events.emit('ACTIVITY_EXPIRED', settled);
        this.events.emit('ACTIVITY_COMPLETED', settled);
        void liveActivityService.update(settled);
        playHaptic('activityCompleted');
        firedAny = true;
      }
    });

    const deadlines = listActivities()
      .filter(
        (activity) =>
          activity.status === 'active' &&
          activity.timeline &&
          !activity.timeline.countsUp &&
          activity.timeline.durationMs != null
      )
      .map((activity) => now + remainingMs(activity.timeline!, now));

    const soonest = deadlines.length ? Math.min(...deadlines) : null;

    if (soonest === this.expiryDeadline && !firedAny) return;

    this.clearTimer('expiryTimer');
    this.expiryDeadline = soonest;
    if (soonest == null) return;

    this.expiryTimer = setTimeout(
      () => {
        this.expiryTimer = null;
        this.expiryDeadline = null;
        this.reconcile();
      },
      Math.max(16, soonest - now)
    );
  }

  private clearTimer(key: 'transientTimer' | 'collapseTimer' | 'expiryTimer'): void {
    const timer = this[key];
    if (timer) clearTimeout(timer);
    this[key] = null;
  }
}

export const dynamicNotchManager = new DynamicNotchManager();

/** Convenience for debugging in the dev menu. */
export function debugSnapshot() {
  return {
    notch: dynamicNotchStore.getState(),
    activities: activityStore.getState(),
  };
}
