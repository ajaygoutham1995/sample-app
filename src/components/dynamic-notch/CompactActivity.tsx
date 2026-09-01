import { StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { DeviceGeometry } from '@/geometry/DeviceGeometry';
import type { Activity } from '@/models/activity';
import { ActivityGlyph } from './ActivityGlyph';
import { ActivityProgress } from './ActivityProgress';
import { AnimatedClockText } from './AnimatedClockText';

export interface CompactActivityProps {
  activity: Activity;
  geometry: DeviceGeometry;
  progress: SharedValue<number>;
  /** Ear width for the current variant - wider while charging. */
  earWidth: number;
}

/**
 * Compact presentation.
 *
 * The physical notch occupies the middle of this surface and cannot be drawn
 * into, so the layout is strictly two ears: a glyph on the left, a readout on
 * the right, and a hairline of progress along the bottom edge. Everything is
 * sized from the geometry service - there is not a single literal point value
 * in here.
 */
export function CompactActivity({
  activity,
  geometry,
  progress,
  earWidth,
}: CompactActivityProps) {
  const glyphSize = geometry.mm(3.4);
  const readoutSize = geometry.mm(2.4);
  const sidePadding = geometry.mm(1.2);
  const hairline = geometry.mm(0.55);

  // Content is centred on the notch band rather than the full surface height,
  // which is what lines the ears up with the status bar row beside them.
  const contentHeight = geometry.notch?.height ?? geometry.idle.height;

  const showsProgress =
    activity.progress != null ||
    (activity.timeline != null && !activity.timeline.countsUp);

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={[styles.row, { height: contentHeight, paddingHorizontal: sidePadding }]}>
        <View style={[styles.ear, { width: earWidth - sidePadding * 2 }]}>
          <ActivityGlyph symbol={activity.symbol} size={glyphSize} color={activity.tint} />
        </View>

        <View style={[styles.ear, { width: earWidth - sidePadding * 2 }]}>
          <CompactReadout activity={activity} size={readoutSize} />
        </View>
      </View>

      {showsProgress ? (
        <View
          style={[
            styles.progressRail,
            {
              bottom: hairline,
              left: geometry.compact.bottomRadius * 0.7,
              right: geometry.compact.bottomRadius * 0.7,
            },
          ]}
        >
          <ActivityProgress value={progress} tint={activity.tint} thickness={hairline} />
        </View>
      ) : null}
    </View>
  );
}

function CompactReadout({ activity, size }: { activity: Activity; size: number }) {
  const textStyle = [styles.readout, { fontSize: size }];

  if (activity.timeline) {
    return (
      <AnimatedClockText
        timeline={activity.timeline}
        paused={activity.status === 'paused'}
        withTenths={activity.type === 'stopwatch'}
        style={StyleSheet.flatten(textStyle)}
      />
    );
  }

  if (activity.type === 'download' && activity.progress != null) {
    return (
      <Text style={textStyle} allowFontScaling={false} numberOfLines={1}>
        {Math.round(activity.progress * 100)}%
      </Text>
    );
  }

  if (activity.subtitle) {
    return (
      <Text style={textStyle} allowFontScaling={false} numberOfLines={1}>
        {activity.subtitle}
      </Text>
    );
  }

  return (
    <ActivityGlyph
      symbol={activity.status === 'paused' ? 'pause.fill' : 'play.fill'}
      size={size}
      color="#FFFFFF"
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
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
    textAlign: 'center',
  },
  progressRail: {
    position: 'absolute',
  },
});
