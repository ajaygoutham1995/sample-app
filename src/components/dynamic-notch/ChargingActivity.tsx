import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { MotionSettings } from '@/animations/DynamicNotchAnimations';
import { springFor } from '@/animations/DynamicNotchAnimations';
import type { DeviceGeometry } from '@/geometry/DeviceGeometry';
import type { Activity } from '@/models/activity';
import { ActivityGlyph } from './ActivityGlyph';
import { ActivityProgress } from './ActivityProgress';

export interface ChargingActivityProps {
  activity: Activity;
  geometry: DeviceGeometry;
  progress: SharedValue<number>;
  earWidth: number;
  motion: MotionSettings;
}

/**
 * The charging reaction.
 *
 * The container's +2mm-per-side expansion is owned by `DynamicNotch`; this
 * component only supplies what appears inside it. The bolt arrives with a
 * small overshoot a beat after the surface starts moving, so the surface reads
 * as reacting to the charger and the content as following the surface -
 * rather than a banner sliding in with a bolt already drawn on it.
 */
export function ChargingActivity({
  activity,
  geometry,
  progress,
  earWidth,
  motion,
}: ChargingActivityProps) {
  const boltScale = useSharedValue(0.4);
  const boltGlow = useSharedValue(0);

  useEffect(() => {
    const spring = springFor('chargingExpand', motion);
    boltScale.value = withDelay(60, withSpring(1, spring));

    if (!motion.reduceMotion) {
      boltGlow.value = withSequence(
        withTiming(1, { duration: 260 }),
        withTiming(0.45, { duration: 520 })
      );
    } else {
      boltGlow.value = 0.45;
    }
  }, [boltScale, boltGlow, motion]);

  const boltStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boltScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: boltGlow.value * 0.5,
  }));

  const glyphSize = geometry.mm(3.6);
  const readoutSize = geometry.mm(2.4);
  const sidePadding = geometry.mm(1.2);
  const hairline = geometry.mm(0.55);

  const contentHeight = geometry.notch?.height ?? geometry.idle.height;
  const percent =
    typeof activity.metadata?.batteryLevel === 'number'
      ? Math.round((activity.metadata.batteryLevel as number) * 100)
      : null;

  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View
        style={[styles.glow, { backgroundColor: activity.tint }, glowStyle]}
      />

      <View style={[styles.row, { height: contentHeight, paddingHorizontal: sidePadding }]}>
        <View style={[styles.ear, { width: earWidth - sidePadding * 2 }]}>
          <Animated.View style={boltStyle}>
            <ActivityGlyph symbol="bolt.fill" size={glyphSize} color={activity.tint} />
          </Animated.View>
        </View>

        <View style={[styles.ear, { width: earWidth - sidePadding * 2 }]}>
          {percent == null ? null : (
            <Text
              style={[styles.readout, { fontSize: readoutSize }]}
              allowFontScaling={false}
              numberOfLines={1}
            >
              {percent}%
            </Text>
          )}
        </View>
      </View>

      <View
        style={[
          styles.rail,
          {
            bottom: hairline,
            left: geometry.charging.bottomRadius * 0.7,
            right: geometry.charging.bottomRadius * 0.7,
          },
        ]}
      >
        <ActivityProgress value={progress} tint={activity.tint} thickness={hairline} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
  },
  glow: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ear: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rail: {
    position: 'absolute',
  },
});
