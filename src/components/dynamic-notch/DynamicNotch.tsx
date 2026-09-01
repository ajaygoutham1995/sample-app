import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  contentTiming,
  springFor,
  type MotionKey,
  type MotionSettings,
} from '@/animations/DynamicNotchAnimations';
import type { DeviceGeometry, NotchSurfaceGeometry } from '@/geometry/DeviceGeometry';
import { useMotionSettings } from '@/hooks/useMotionSettings';
import { useProgressValue } from '@/hooks/useProgressValue';
import type { Activity } from '@/models/activity';
import type { NotchSurfaceVariant } from '@/models/visualState';
import { isExpandedish } from '@/models/visualState';
import { useDeviceGeometry } from '@/services/DeviceGeometryService';
import { dynamicNotchManager } from '@/services/DynamicNotchManager';
import { useActivity } from '@/state/activityStore';
import { useNotchVisualState, usePresentedActivityId } from '@/state/dynamicNotchStore';
import { useSetting } from '@/state/settingsStore';
import { ChargingActivity } from './ChargingActivity';
import { CompactActivity } from './CompactActivity';
import { ExpandedActivity } from './ExpandedActivity';
import { NotchDebugOverlay } from './NotchDebugOverlay';

/**
 * The Dynamic Notch surface.
 *
 * There is exactly one of these and exactly one animated view inside it. Every
 * state change - idle, compact, charging, expanded - retargets the same four
 * shared values (width, height, and the two corner radii) rather than mounting
 * a different component, which is what makes the transition a transformation
 * of one object instead of a cross-fade between two.
 *
 * Because every change is a spring retarget on a live shared value, an
 * interruption mid-flight continues from the current position and velocity.
 * Nothing here ever restarts an animation from its origin.
 */
export function DynamicNotch() {
  const geometry = useDeviceGeometry();
  const visualState = useNotchVisualState();
  const presentedId = usePresentedActivityId();
  const activity = useActivity(presentedId);
  const motion = useMotionSettings();
  const previewMode = useSetting('previewMode');
  const showInspector = useSetting('showGeometryInspector');

  const variant: NotchSurfaceVariant = useMemo(() => {
    if (visualState === 'IDLE' || !activity) return 'idle';
    if (isExpandedish(visualState)) return 'expanded';
    if (activity.type === 'charging') return 'charging';
    return 'compact';
  }, [visualState, activity]);

  const target: NotchSurfaceGeometry = geometry[variant];

  const width = useSharedValue(target.width);
  const height = useSharedValue(target.height);
  const topRadius = useSharedValue(target.topRadius);
  const bottomRadius = useSharedValue(target.bottomRadius);
  /** 0 compact .. 1 expanded. Drives content, backdrop and shadow. */
  const expandT = useSharedValue(variant === 'expanded' ? 1 : 0);
  /** 0 normal .. 1 charging reaction. */
  const chargeT = useSharedValue(variant === 'charging' ? 1 : 0);
  /** Live gesture offset, added on top of the spring. */
  const dragY = useSharedValue(0);

  const previousVariant = useRef<NotchSurfaceVariant>(variant);

  useEffect(() => {
    const from = previousVariant.current;
    const key = motionKeyFor(from, variant);
    const spring = springFor(key, motion);

    width.value = withSpring(target.width, spring);
    topRadius.value = withSpring(target.topRadius, spring);
    bottomRadius.value = withSpring(target.bottomRadius, spring);

    // Height carries the settle callback: it is the last dimension to come to
    // rest in every transition, so it is the honest signal that the surface
    // has arrived.
    height.value = withSpring(target.height, spring, (finished) => {
      'worklet';
      if (finished) runOnJS(handleSettled)(variant);
    });

    expandT.value = withSpring(variant === 'expanded' ? 1 : 0, spring);
    chargeT.value = withTiming(
      variant === 'charging' ? 1 : 0,
      contentTiming(motion, variant === 'charging')
    );

    previousVariant.current = variant;
  }, [
    variant,
    target.width,
    target.height,
    target.topRadius,
    target.bottomRadius,
    motion,
    width,
    height,
    topRadius,
    bottomRadius,
    expandT,
    chargeT,
  ]);

  const progress = useProgressValue({
    progress: activity?.progress,
    timeline: activity?.timeline,
    paused: activity?.status === 'paused',
    motion,
  });

  // ------------------------------------------------------------- interaction

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(400)
        .onEnd((_event, success) => {
          'worklet';
          if (success) runOnJS(handleTap)();
        }),
    []
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          'worklet';
          // Rubber band: the surface follows the finger a little, with sharply
          // diminishing returns, and the spring keeps running underneath.
          const resistance = 0.32;
          const limit = 26;
          const raw = event.translationY * resistance;
          dragY.value = Math.max(-limit, Math.min(limit, raw));
        })
        .onEnd((event) => {
          'worklet';
          const travelled = event.translationY;
          dragY.value = withSpring(0, { duration: 320, dampingRatio: 0.8 });
          if (travelled > 24) runOnJS(handlePullDown)();
          else if (travelled < -24) runOnJS(handlePullUp)();
        }),
    [dragY]
  );

  const gesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  // ------------------------------------------------------------------ styles

  const surfaceStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: height.value + Math.max(0, dragY.value),
    borderTopLeftRadius: topRadius.value,
    borderTopRightRadius: topRadius.value,
    borderBottomLeftRadius: bottomRadius.value,
    borderBottomRightRadius: bottomRadius.value,
    shadowOpacity: interpolate(expandT.value, [0, 1], [0, 0.45]),
    shadowRadius: interpolate(expandT.value, [0, 1], [0, 24]),
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandT.value, [0, 1], [0, 0.4]),
  }));

  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandT.value, [0, 0.32], [1, 0]) * (1 - chargeT.value),
    transform: [{ scale: interpolate(expandT.value, [0, 1], [1, 0.94]) }],
  }));

  const expandedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandT.value, [0.28, 0.85], [0, 1]),
    transform: [{ scale: interpolate(expandT.value, [0, 1], [0.96, 1]) }],
  }));

  const chargingStyle = useAnimatedStyle(() => ({
    opacity: chargeT.value * (1 - expandT.value),
  }));

  // Apple owns the cutout on Dynamic Island hardware: drawing our own surface
  // there would be a second, competing island. Those devices get ActivityKit.
  const shouldRender = geometry.presentationType === 'NOTCH' || previewMode;
  if (!shouldRender) return null;

  const expandedish = isExpandedish(visualState) || visualState === 'COLLAPSING';
  const interactive = visualState !== 'IDLE' && activity != null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      {expandedish ? (
        <Animated.View
          style={[styles.backdrop, backdropStyle]}
          pointerEvents={visualState === 'COLLAPSING' ? 'none' : 'auto'}
          onTouchEnd={() => dynamicNotchManager.collapse()}
        />
      ) : null}

      <View style={styles.anchor} pointerEvents="box-none">
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              styles.surface,
              { transform: [{ translateX: geometry.opticalCenterOffsetX }] },
              surfaceStyle,
            ]}
            pointerEvents={interactive ? 'auto' : 'none'}
            accessible={interactive}
            accessibilityRole="button"
            accessibilityLabel={describeForVoiceOver(activity)}
            accessibilityHint={
              interactive
                ? isExpandedish(visualState)
                  ? 'Double tap to collapse'
                  : 'Double tap to expand'
                : undefined
            }
            accessibilityState={{ expanded: isExpandedish(visualState) }}
          >
            {activity ? (
              <>
                <ContentLayer
                  geometry={geometry}
                  surface={geometry.compact}
                  style={compactStyle}
                >
                  <CompactActivity
                    activity={activity}
                    geometry={geometry}
                    progress={progress}
                    earWidth={geometry.ears.compact}
                  />
                </ContentLayer>

                <ContentLayer
                  geometry={geometry}
                  surface={geometry.charging}
                  style={chargingStyle}
                >
                  <ChargingActivity
                    activity={activity}
                    geometry={geometry}
                    progress={progress}
                    earWidth={geometry.ears.charging}
                    motion={motion}
                  />
                </ContentLayer>

                <ContentLayer
                  geometry={geometry}
                  surface={geometry.expanded}
                  style={expandedStyle}
                >
                  <ExpandedActivity
                    activity={activity}
                    geometry={geometry}
                    progress={progress}
                  />
                </ContentLayer>
              </>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </View>

      {showInspector ? <NotchDebugOverlay geometry={geometry} variant={variant} /> : null}
    </View>
  );
}

/**
 * A content layer is a fixed-size box pinned to the surface's centre line.
 *
 * Fixed dimensions matter: the container's width and height are animating
 * every frame, and if the content were `absoluteFill` it would re-lay-out on
 * each of those frames. Pinning to `left: 50%` with a static negative margin
 * keeps the layer centred through the whole morph at zero layout cost.
 */
function ContentLayer({
  surface,
  style,
  children,
}: {
  geometry: DeviceGeometry;
  surface: NotchSurfaceGeometry;
  style: ReturnType<typeof useAnimatedStyle>;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.layer,
        { width: surface.width, height: surface.height, marginLeft: -surface.width / 2 },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function motionKeyFor(from: NotchSurfaceVariant, to: NotchSurfaceVariant): MotionKey {
  if (to === 'charging') return 'chargingExpand';
  if (from === 'charging') return 'chargingCollapse';
  if (to === 'expanded' || from === 'expanded') return 'morph';
  return 'reveal';
}

function handleSettled(variant: NotchSurfaceVariant) {
  if (variant === 'expanded') dynamicNotchManager.confirmExpanded();
  else dynamicNotchManager.confirmCollapsed();
}

function handleTap() {
  dynamicNotchManager.toggle();
}

function handlePullDown() {
  dynamicNotchManager.expand();
}

function handlePullUp() {
  dynamicNotchManager.collapse();
}

function describeForVoiceOver(activity: Activity | null): string {
  if (!activity) return 'Dynamic Notch';
  const parts = [activity.title];
  if (activity.subtitle) parts.push(activity.subtitle);
  if (activity.status === 'paused') parts.push('paused');
  if (activity.progress != null) parts.push(Math.round(activity.progress * 100) + ' percent');
  return parts.join(', ');
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    // Above every screen, below nothing. The surface is the top-most chrome.
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  anchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  surface: {
    backgroundColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    ...Platform.select({ android: { elevation: 0 } }),
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: '50%',
  },
});

export type { SharedValue };
