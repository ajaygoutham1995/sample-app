/**
 * Device physical database.
 *
 * Every number here is a PHYSICAL property of the hardware (panel size in
 * points, render scale, pixel density, notch size in millimetres). Nothing in
 * here is a layout value - layout is derived in `NotchGeometry.ts`.
 *
 * Notch generations
 * -----------------
 * WIDE     iPhone X .. iPhone 12 Pro Max   ~34.8mm x 5.6mm
 * REDUCED  iPhone 13 .. iPhone 14 Plus     ~27.0mm x 5.35mm   <- spec reference
 *
 * The millimetre figures are measured references accurate to roughly +/-3%.
 * They are design input, not a claim about Apple's CAD.
 */

export type PresentationType = 'NOTCH' | 'DYNAMIC_ISLAND' | 'OTHER';

export type NotchGeneration = 'WIDE' | 'REDUCED' | 'NONE';

export interface PhysicalNotchReference {
  generation: NotchGeneration;
  widthMm: number;
  heightMm: number;
}

export const NOTCH_WIDE: PhysicalNotchReference = {
  generation: 'WIDE',
  widthMm: 34.8,
  heightMm: 5.6,
};

/** The reference given by the product spec: 27mm x 5.35mm. */
export const NOTCH_REDUCED: PhysicalNotchReference = {
  generation: 'REDUCED',
  widthMm: 27.0,
  heightMm: 5.35,
};

export interface DeviceProfile {
  /** Apple internal model identifiers, e.g. `iPhone14,8`. */
  modelIds: readonly string[];
  marketingName: string;
  presentation: PresentationType;
  /** Portrait logical size in points. */
  pointWidth: number;
  pointHeight: number;
  /** Render scale (@2x / @3x). */
  scale: number;
  /** Physical pixel density of the panel. */
  ppi: number;
  /**
   * Portrait top safe-area inset in points. Used ONLY as a fallback - the
   * runtime inset from react-native-safe-area-context always wins.
   */
  fallbackTopInset: number;
  notch: PhysicalNotchReference | null;
}

export const DEVICE_PROFILES: readonly DeviceProfile[] = [
  // ---- Wide notch -------------------------------------------------------
  {
    modelIds: ['iPhone10,3', 'iPhone10,6', 'iPhone11,2'],
    marketingName: 'iPhone X / XS',
    presentation: 'NOTCH',
    pointWidth: 375,
    pointHeight: 812,
    scale: 3,
    ppi: 458,
    fallbackTopInset: 44,
    notch: NOTCH_WIDE,
  },
  {
    modelIds: ['iPhone11,4', 'iPhone11,6'],
    marketingName: 'iPhone XS Max',
    presentation: 'NOTCH',
    pointWidth: 414,
    pointHeight: 896,
    scale: 3,
    ppi: 458,
    fallbackTopInset: 44,
    notch: NOTCH_WIDE,
  },
  {
    modelIds: ['iPhone11,8'],
    marketingName: 'iPhone XR',
    presentation: 'NOTCH',
    pointWidth: 414,
    pointHeight: 896,
    scale: 2,
    ppi: 326,
    fallbackTopInset: 48,
    notch: NOTCH_WIDE,
  },
  {
    modelIds: ['iPhone12,1'],
    marketingName: 'iPhone 11',
    presentation: 'NOTCH',
    pointWidth: 414,
    pointHeight: 896,
    scale: 2,
    ppi: 326,
    fallbackTopInset: 48,
    notch: NOTCH_WIDE,
  },
  {
    modelIds: ['iPhone12,3'],
    marketingName: 'iPhone 11 Pro',
    presentation: 'NOTCH',
    pointWidth: 375,
    pointHeight: 812,
    scale: 3,
    ppi: 458,
    fallbackTopInset: 44,
    notch: NOTCH_WIDE,
  },
  {
    modelIds: ['iPhone12,5'],
    marketingName: 'iPhone 11 Pro Max',
    presentation: 'NOTCH',
    pointWidth: 414,
    pointHeight: 896,
    scale: 3,
    ppi: 458,
    fallbackTopInset: 44,
    notch: NOTCH_WIDE,
  },
  {
    modelIds: ['iPhone13,1'],
    marketingName: 'iPhone 12 mini',
    presentation: 'NOTCH',
    pointWidth: 375,
    pointHeight: 812,
    scale: 3,
    ppi: 476,
    fallbackTopInset: 50,
    notch: NOTCH_WIDE,
  },
  {
    modelIds: ['iPhone13,2', 'iPhone13,3'],
    marketingName: 'iPhone 12 / 12 Pro',
    presentation: 'NOTCH',
    pointWidth: 390,
    pointHeight: 844,
    scale: 3,
    ppi: 460,
    fallbackTopInset: 47,
    notch: NOTCH_WIDE,
  },
  {
    modelIds: ['iPhone13,4'],
    marketingName: 'iPhone 12 Pro Max',
    presentation: 'NOTCH',
    pointWidth: 428,
    pointHeight: 926,
    scale: 3,
    ppi: 458,
    fallbackTopInset: 47,
    notch: NOTCH_WIDE,
  },

  // ---- Reduced notch ----------------------------------------------------
  {
    modelIds: ['iPhone14,4'],
    marketingName: 'iPhone 13 mini',
    presentation: 'NOTCH',
    pointWidth: 375,
    pointHeight: 812,
    scale: 3,
    ppi: 476,
    fallbackTopInset: 50,
    notch: NOTCH_REDUCED,
  },
  {
    modelIds: ['iPhone14,5', 'iPhone14,2'],
    marketingName: 'iPhone 13 / 13 Pro',
    presentation: 'NOTCH',
    pointWidth: 390,
    pointHeight: 844,
    scale: 3,
    ppi: 460,
    fallbackTopInset: 47,
    notch: NOTCH_REDUCED,
  },
  {
    modelIds: ['iPhone14,3'],
    marketingName: 'iPhone 13 Pro Max',
    presentation: 'NOTCH',
    pointWidth: 428,
    pointHeight: 926,
    scale: 3,
    ppi: 458,
    fallbackTopInset: 47,
    notch: NOTCH_REDUCED,
  },
  {
    modelIds: ['iPhone14,7'],
    marketingName: 'iPhone 14',
    presentation: 'NOTCH',
    pointWidth: 390,
    pointHeight: 844,
    scale: 3,
    ppi: 460,
    fallbackTopInset: 47,
    notch: NOTCH_REDUCED,
  },
  {
    // Mandatory validation device. 428 x 926 pt, physical notch, NOT an island.
    modelIds: ['iPhone14,8'],
    marketingName: 'iPhone 14 Plus',
    presentation: 'NOTCH',
    pointWidth: 428,
    pointHeight: 926,
    scale: 3,
    ppi: 458,
    fallbackTopInset: 47,
    notch: NOTCH_REDUCED,
  },

  // ---- Dynamic Island (system-owned; we must NOT draw over these) --------
  {
    modelIds: ['iPhone15,2', 'iPhone15,4', 'iPhone16,1', 'iPhone17,3'],
    marketingName: 'iPhone 14 Pro / 15 / 15 Pro / 16',
    presentation: 'DYNAMIC_ISLAND',
    pointWidth: 393,
    pointHeight: 852,
    scale: 3,
    ppi: 460,
    fallbackTopInset: 59,
    notch: null,
  },
  {
    modelIds: ['iPhone15,3', 'iPhone15,5', 'iPhone16,2', 'iPhone17,4'],
    marketingName: 'iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus',
    presentation: 'DYNAMIC_ISLAND',
    pointWidth: 430,
    pointHeight: 932,
    scale: 3,
    ppi: 460,
    fallbackTopInset: 59,
    notch: null,
  },
  {
    modelIds: ['iPhone17,1'],
    marketingName: 'iPhone 16 Pro',
    presentation: 'DYNAMIC_ISLAND',
    pointWidth: 402,
    pointHeight: 874,
    scale: 3,
    ppi: 460,
    fallbackTopInset: 62,
    notch: null,
  },
  {
    modelIds: ['iPhone17,2'],
    marketingName: 'iPhone 16 Pro Max',
    presentation: 'DYNAMIC_ISLAND',
    pointWidth: 440,
    pointHeight: 956,
    scale: 3,
    ppi: 460,
    fallbackTopInset: 62,
    notch: null,
  },
];

/** The device the spec names as the mandatory validation target. */
export const IPHONE_14_PLUS: DeviceProfile = DEVICE_PROFILES.find((p) =>
  p.modelIds.includes('iPhone14,8')
)!;

export function findProfileByModelId(modelId: string | null): DeviceProfile | null {
  if (!modelId) return null;
  return DEVICE_PROFILES.find((p) => p.modelIds.includes(modelId)) ?? null;
}

/**
 * Last-resort match for a model id we do not know yet (a newer iPhone, or a
 * simulator reporting an unexpected id). Matching on the logical panel size
 * plus scale is unambiguous for every shipped iPhone.
 */
export function findProfileByMetrics(
  pointWidth: number,
  pointHeight: number,
  scale: number
): DeviceProfile | null {
  return (
    DEVICE_PROFILES.find(
      (p) =>
        p.scale === scale &&
        p.pointWidth === Math.round(pointWidth) &&
        p.pointHeight === Math.round(pointHeight)
    ) ?? null
  );
}
