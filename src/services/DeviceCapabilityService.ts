import * as Device from 'expo-device';
import { Platform } from 'react-native';

import {
  DEVICE_PROFILES,
  findProfileByMetrics,
  findProfileByModelId,
  NOTCH_REDUCED,
  type DeviceProfile,
  type PresentationType,
} from '@/geometry/devicePhysicalProfiles';

export interface DeviceResolution {
  profile: DeviceProfile;
  modelId: string | null;
  /** False when we had to synthesise a profile rather than match one. */
  isRecognized: boolean;
}

/**
 * A safe-area inset at or above this many points has only ever meant a
 * Dynamic Island cutout (islands sit at 59-62pt; notches at 44-50pt).
 * Used only when the model id is unknown to us - a future iPhone, say.
 */
const ISLAND_INSET_THRESHOLD = 54;
const NOTCH_INSET_THRESHOLD = 40;

function synthesiseProfile(
  presentation: PresentationType,
  screenWidth: number,
  screenHeight: number,
  scale: number,
  topInset: number
): DeviceProfile {
  return {
    modelIds: [],
    marketingName: presentation === 'OTHER' ? 'Unrecognised device' : 'Unrecognised iPhone',
    presentation,
    pointWidth: Math.round(screenWidth),
    pointHeight: Math.round(screenHeight),
    scale,
    // 460ppi is the modern iPhone OLED density and the safest guess; the
    // resulting millimetre projection is within a few percent for any of them.
    ppi: 460,
    fallbackTopInset: topInset,
    notch: presentation === 'NOTCH' ? NOTCH_REDUCED : null,
  };
}

/**
 * Decide which presentation architecture this device gets.
 *
 * NOTCH           -> our custom in-app Dynamic Notch surface.
 * DYNAMIC_ISLAND  -> Apple owns the cutout; we use ActivityKit only.
 * OTHER           -> no cutout presentation; preview mode may simulate one.
 */
export function resolveDevice(params: {
  screenWidth: number;
  screenHeight: number;
  scale: number;
  topInset: number | null;
}): DeviceResolution {
  const { screenWidth, screenHeight, scale, topInset } = params;

  if (Platform.OS !== 'ios') {
    return {
      profile: synthesiseProfile('OTHER', screenWidth, screenHeight, scale, topInset ?? 0),
      modelId: null,
      isRecognized: false,
    };
  }

  const modelId = Device.modelId ?? null;

  const byModel = findProfileByModelId(modelId);
  if (byModel) {
    return { profile: byModel, modelId, isRecognized: true };
  }

  const byMetrics = findProfileByMetrics(screenWidth, screenHeight, scale);
  if (byMetrics) {
    return { profile: byMetrics, modelId, isRecognized: true };
  }

  // Unknown iPhone: infer the cutout class from the safe-area inset alone.
  const inset = topInset ?? 0;
  const presentation: PresentationType =
    inset >= ISLAND_INSET_THRESHOLD
      ? 'DYNAMIC_ISLAND'
      : inset >= NOTCH_INSET_THRESHOLD
        ? 'NOTCH'
        : 'OTHER';

  return {
    profile: synthesiseProfile(presentation, screenWidth, screenHeight, scale, inset),
    modelId,
    isRecognized: false,
  };
}

/** Every profile, for the debug inspector's device picker. */
export function allProfiles(): readonly DeviceProfile[] {
  return DEVICE_PROFILES;
}
