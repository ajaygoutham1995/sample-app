import { StyleSheet, Text, View } from 'react-native';

import type { DeviceGeometry } from '@/geometry/DeviceGeometry';
import type { NotchSurfaceVariant } from '@/models/visualState';

export interface NotchDebugOverlayProps {
  geometry: DeviceGeometry;
  variant: NotchSurfaceVariant;
}

/**
 * Development-only geometry inspector.
 *
 * Draws the physical notch reference, the screen centre line and the current
 * surface bounds over the live UI, alongside the numbers they were derived
 * from. This is the tool for confirming that a device is aligned - looking at
 * a screenshot and nudging a pixel value is how misalignment gets baked in.
 *
 * Returns null outside development so it can never ship.
 */
export function NotchDebugOverlay({ geometry, variant }: NotchDebugOverlayProps) {
  if (!__DEV__) return null;

  const surface = geometry[variant];
  const notch = geometry.notch;
  const centerX = geometry.screenWidth / 2 + geometry.opticalCenterOffsetX;

  const rows: [string, string][] = [
    ['Device', geometry.deviceName + (geometry.isSimulated ? '  (simulated)' : '')],
    ['Model id', geometry.modelId ?? 'unknown'],
    ['Presentation', geometry.presentationType],
    ['Recognised', geometry.isRecognized ? 'yes' : 'no - inferred'],
    [
      'Screen',
      Math.round(geometry.screenWidth) +
        ' x ' +
        Math.round(geometry.screenHeight) +
        ' pt  @' +
        geometry.scale +
        'x',
    ],
    ['Density', geometry.ppi + ' ppi   ' + geometry.pointsPerMm.toFixed(3) + ' pt/mm'],
    ['Top safe area', geometry.topSafeArea.toFixed(1) + ' pt'],
    [
      'Physical notch',
      notch
        ? notch.widthMm + ' x ' + notch.heightMm + ' mm  ->  ' +
          notch.width.toFixed(1) + ' x ' + notch.height.toFixed(1) + ' pt'
        : 'none',
    ],
    ['Notch centre', centerX.toFixed(1) + ' pt'],
    ['Ear (compact)', geometry.ears.compact.toFixed(1) + ' pt'],
    [
      'Compact',
      geometry.compact.width.toFixed(1) + ' x ' + geometry.compact.height.toFixed(1) + ' pt',
    ],
    [
      'Charging',
      geometry.charging.width.toFixed(1) +
        ' x ' +
        geometry.charging.height.toFixed(1) +
        ' pt  (+' +
        ((geometry.charging.width - geometry.compact.width) / 2 / geometry.pointsPerMm).toFixed(
          2
        ) +
        ' mm/side)',
    ],
    [
      'Expanded',
      geometry.expanded.width.toFixed(1) + ' x ' + geometry.expanded.height.toFixed(1) + ' pt',
    ],
    ['Variant', variant + '  ' + surface.width.toFixed(0) + ' x ' + surface.height.toFixed(0)],
  ];

  return (
    <View style={styles.root} pointerEvents="none">
      {/* Screen centre line - the surface must be symmetric about this. */}
      <View style={[styles.centerLine, { left: centerX }]} />

      {/* Physical notch bounds. */}
      {notch ? (
        <View
          style={[
            styles.notchOutline,
            {
              width: notch.width,
              height: notch.height,
              left: centerX - notch.width / 2,
            },
          ]}
        />
      ) : null}

      {/* Current surface bounds. */}
      <View
        style={[
          styles.surfaceOutline,
          {
            width: surface.width,
            height: surface.height,
            left: centerX - surface.width / 2,
          },
        ]}
      />

      {/* Top safe-area boundary. */}
      <View style={[styles.insetLine, { top: geometry.topSafeArea }]} />

      <View style={[styles.panel, { top: geometry.topSafeArea + geometry.mm(34) }]}>
        <Text style={styles.heading}>GEOMETRY INSPECTOR</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1001,
  },
  centerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,45,85,0.7)',
  },
  notchOutline: {
    position: 'absolute',
    top: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.9)',
  },
  surfaceOutline: {
    position: 'absolute',
    top: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48,209,88,0.9)',
  },
  insetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(10,132,255,0.8)',
  },
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.82)',
    gap: 3,
  },
  heading: {
    color: '#FFD60A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
});
