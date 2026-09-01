import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

export interface ActivityProgressProps {
  value: SharedValue<number>;
  tint: string;
  /** Track thickness in points. Supplied by geometry, never hardcoded. */
  thickness: number;
  /** Determinate bar, or an indeterminate track when nothing is measurable. */
  indeterminate?: boolean;
}

/**
 * A determinate capsule track.
 *
 * The fill is driven by a shared value and animated with `scaleX` rather than
 * `width`, so it never triggers layout - it stays a compositor-thread
 * transform for the entire life of the activity.
 */
export function ActivityProgress({
  value,
  tint,
  thickness,
  indeterminate = false,
}: ActivityProgressProps) {
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.0001, Math.min(1, value.value)) }],
  }));

  return (
    <View
      style={[styles.track, { height: thickness, borderRadius: thickness / 2 }]}
      accessible={false}
    >
      {indeterminate ? (
        <View
          style={[
            styles.indeterminate,
            { backgroundColor: tint, borderRadius: thickness / 2 },
          ]}
        />
      ) : (
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: tint, borderRadius: thickness / 2 },
            fillStyle,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    // Anchor the scale to the left edge so the bar grows rightward.
    transformOrigin: 'left center',
  },
  indeterminate: {
    ...StyleSheet.absoluteFill,
    opacity: 0.4,
  },
});
