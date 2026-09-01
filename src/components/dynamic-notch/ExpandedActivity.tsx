import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { DeviceGeometry } from '@/geometry/DeviceGeometry';
import type { Activity, ActivityAction } from '@/models/activity';
import { dynamicNotchManager } from '@/services/DynamicNotchManager';
import { playHaptic } from '@/services/HapticsService';
import { ActivityGlyph } from './ActivityGlyph';
import { ActivityProgress } from './ActivityProgress';
import { AnimatedClockText } from './AnimatedClockText';

export interface ExpandedActivityProps {
  activity: Activity;
  geometry: DeviceGeometry;
  progress: SharedValue<number>;
}

/**
 * Expanded presentation.
 *
 * The physical notch is still there when the surface is expanded, sitting over
 * the top-centre of this card. So the first row is deliberately a header laid
 * into the same two ears the compact state uses, and the real content starts
 * below the notch band. Ignoring that is what makes an expanded card look like
 * a floating sheet that happens to be near the top of the screen.
 */
export function ExpandedActivity({ activity, geometry, progress }: ExpandedActivityProps) {
  const notchHeight = geometry.notch?.height ?? geometry.idle.height;
  const notchWidth = geometry.notch?.width ?? geometry.idle.width;
  const earWidth = Math.max(geometry.mm(6), (geometry.expanded.width - notchWidth) / 2);

  const gutter = geometry.mm(4.5);
  const showsClock = activity.timeline != null;
  const measurable =
    activity.progress != null || (activity.timeline != null && !activity.timeline.countsUp);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { height: notchHeight }]}>
        <View style={[styles.ear, { width: earWidth, paddingLeft: geometry.mm(3) }]}>
          <ActivityGlyph
            symbol={activity.symbol}
            size={geometry.mm(3.6)}
            color={activity.tint}
          />
        </View>
        <View
          style={[
            styles.ear,
            styles.earTrailing,
            { width: earWidth, paddingRight: geometry.mm(3) },
          ]}
        >
          <Text
            style={[styles.status, { fontSize: geometry.mm(1.9), color: activity.tint }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {statusLabel(activity)}
          </Text>
        </View>
      </View>

      <View style={[styles.body, { paddingHorizontal: gutter, gap: geometry.mm(1.6) }]}>
        <Text
          style={[styles.title, { fontSize: geometry.mm(3.2) }]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {activity.title}
        </Text>

        {showsClock ? (
          <AnimatedClockText
            timeline={activity.timeline!}
            paused={activity.status === 'paused'}
            withTenths={activity.type === 'stopwatch'}
            style={{
              fontSize: geometry.mm(8),
              fontWeight: '300',
              color: '#FFFFFF',
              letterSpacing: -geometry.mm(0.2),
            }}
          />
        ) : activity.subtitle ? (
          <Text
            style={[styles.subtitle, { fontSize: geometry.mm(2.6) }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {activity.subtitle}
          </Text>
        ) : null}

        {measurable ? (
          <ActivityProgress
            value={progress}
            tint={activity.tint}
            thickness={geometry.mm(0.9)}
          />
        ) : null}

        {activity.actions.length > 0 ? (
          <View style={[styles.actions, { gap: geometry.mm(2.2), marginTop: geometry.mm(0.8) }]}>
            {activity.actions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                activity={activity}
                geometry={geometry}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function statusLabel(activity: Activity): string {
  switch (activity.status) {
    case 'paused':
      return 'PAUSED';
    case 'completed':
      return 'DONE';
    case 'cancelled':
      return 'STOPPED';
    case 'expired':
      return 'TIME UP';
    case 'error':
      return 'ERROR';
    default:
      return activity.subtitle?.toUpperCase() ?? 'LIVE';
  }
}

function ActionButton({
  action,
  activity,
  geometry,
}: {
  action: ActivityAction;
  activity: Activity;
  geometry: DeviceGeometry;
}) {
  // 44pt is Apple's minimum comfortable target; the pill is drawn smaller but
  // its hit area is never allowed below that.
  const diameter = geometry.mm(7.6);
  const hitSlop = Math.max(0, (44 - diameter) / 2);

  const destructive = action.kind === 'destructive';
  const primary = action.kind === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityHint={'Controls the ' + activity.title + ' activity'}
      accessibilityState={{ disabled: action.disabled }}
      disabled={action.disabled}
      hitSlop={hitSlop}
      onPress={() => {
        playHaptic('selection');
        dynamicNotchManager.noteInteraction();
        dynamicNotchManager.dispatchAction(activity.id, action.id);
      }}
      style={({ pressed }) => [
        styles.action,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: destructive
            ? 'rgba(255,69,58,0.22)'
            : primary
              ? 'rgba(255,255,255,0.20)'
              : 'rgba(255,255,255,0.11)',
          opacity: action.disabled ? 0.35 : pressed ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <ActivityGlyph
        symbol={action.symbol}
        size={diameter * 0.44}
        color={destructive ? '#FF6961' : '#FFFFFF'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ear: {
    justifyContent: 'center',
  },
  earTrailing: {
    alignItems: 'flex-end',
  },
  status: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
