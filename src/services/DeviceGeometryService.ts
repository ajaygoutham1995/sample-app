import { useMemo } from 'react';
import { PixelRatio, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeviceGeometry } from '@/geometry/DeviceGeometry';
import { findProfileByModelId } from '@/geometry/devicePhysicalProfiles';
import { computeDeviceGeometry } from '@/geometry/NotchGeometry';
import { useSetting } from '@/state/settingsStore';
import { resolveDevice } from './DeviceCapabilityService';

/**
 * Per-device optical correction, in points.
 *
 * The physical notch is not always perfectly centred on the panel's logical
 * midpoint (panel bonding tolerance, and the status-bar clock is itself
 * optically offset). Any correction we need lives here, keyed by model id, so
 * it is reviewable in one place. Empty by default: no device has been measured
 * on real hardware yet, and inventing offsets would be worse than none.
 */
const OPTICAL_CENTER_OFFSET_X: Record<string, number> = {};

/**
 * Last resolved geometry, for the few non-React callers (the notch manager
 * converts the spec's millimetre figures when it builds charging events).
 * Always prefer the hook inside components.
 */
let cachedGeometry: DeviceGeometry | null = null;

export function getDeviceGeometrySnapshot(): DeviceGeometry | null {
  return cachedGeometry;
}

/**
 * The single source of device geometry for the whole app.
 *
 * Resolution order:
 *   1. a model id forced by the geometry inspector (development only)
 *   2. the real device, matched by Apple model id
 *   3. the real device, matched by logical screen metrics
 *   4. a synthesised profile inferred from the safe-area inset
 */
export function useDeviceGeometry(): DeviceGeometry {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const simulatedModelId = useSetting('simulatedModelId');

  return useMemo(() => {
    const scale = PixelRatio.get();
    const simulatedProfile = simulatedModelId ? findProfileByModelId(simulatedModelId) : null;

    if (simulatedProfile) {
      // Forced geometry uses the simulated panel's own dimensions so the
      // millimetre projection stays truthful to the device being previewed.
      const geometry = computeDeviceGeometry({
        profile: simulatedProfile,
        screenWidth: simulatedProfile.pointWidth,
        screenHeight: simulatedProfile.pointHeight,
        topSafeArea: simulatedProfile.fallbackTopInset,
        modelId: simulatedProfile.modelIds[0] ?? null,
        isRecognized: true,
        isSimulated: true,
        opticalCenterOffsetX:
          OPTICAL_CENTER_OFFSET_X[simulatedProfile.modelIds[0] ?? ''] ?? 0,
      });
      cachedGeometry = geometry;
      return geometry;
    }

    const resolution = resolveDevice({
      screenWidth: width,
      screenHeight: height,
      scale,
      topInset: insets.top,
    });

    const geometry = computeDeviceGeometry({
      profile: resolution.profile,
      screenWidth: width,
      screenHeight: height,
      topSafeArea: insets.top,
      modelId: resolution.modelId,
      isRecognized: resolution.isRecognized,
      isSimulated: false,
      opticalCenterOffsetX: OPTICAL_CENTER_OFFSET_X[resolution.modelId ?? ''] ?? 0,
    });
    cachedGeometry = geometry;
    return geometry;
  }, [width, height, insets.top, simulatedModelId]);
}
