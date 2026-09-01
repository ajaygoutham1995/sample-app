import type { DeviceGeometry, NotchSurfaceGeometry } from './DeviceGeometry';
import type { DeviceProfile } from './devicePhysicalProfiles';
import { mmToPoints, pointsPerMm, snapToPixel } from './units';

/**
 * The design language, expressed in millimetres.
 *
 * These are the ONLY hand-tuned numbers in the layout system. They are stated
 * in physical units so the surface keeps the same apparent size on a 326ppi
 * iPhone XR and a 458ppi iPhone 14 Plus, and so the relationship to the
 * physical notch (27mm x 5.35mm on the reduced-notch generation) stays legible.
 *
 * Adding a point value anywhere else in the app is a bug.
 */
export const DESIGN_MM = {
  /**
   * Compact surface grows this far beyond the physical notch, per side.
   *
   * This is not a free aesthetic choice. The physical notch occupies the
   * middle ~162pt of the panel and nothing can be drawn inside it, so the
   * compact presentation lives entirely in the two "ears" this value creates.
   * 7mm gives roughly a 42pt ear on every supported device: enough for a
   * glyph on the left and a `12:34` readout on the right, which is the
   * smallest surface that can still carry an activity.
   */
  compactSideGrowth: 7.0,
  /** Compact surface hangs this far below the bottom edge of the notch. */
  compactDrop: 1.8,
  /** Spec-mandated charging expansion: ~2mm left + ~2mm right. */
  chargingSideGrowth: 2.0,
  /** Screen margin left and right of the expanded card. */
  expandedSideMargin: 5.0,
  /** Expanded card height. */
  expandedHeight: 30.0,
  /** Expanded card corner radii. */
  expandedTopRadius: 2.2,
  expandedBottomRadius: 6.5,
  /** Upper bound so the card stays a card on very wide panels. */
  expandedMaxWidth: 96.0,
} as const;

/**
 * The physical notch's bottom corners are radiused to roughly 62% of its
 * height (~20pt of a ~32pt notch on the reduced-notch generation). Matching
 * that ratio is what makes the idle surface disappear into the hardware.
 */
const NOTCH_BOTTOM_RADIUS_RATIO = 0.62;

export interface GeometryInput {
  profile: DeviceProfile;
  /** Runtime screen size in points. Wins over the profile when they disagree. */
  screenWidth: number;
  screenHeight: number;
  /** Runtime top safe-area inset. Wins over the profile fallback. */
  topSafeArea: number | null;
  modelId: string | null;
  isRecognized: boolean;
  isSimulated: boolean;
  /** Documented, device-aware optical nudge. Defaults to 0. */
  opticalCenterOffsetX?: number;
}

/**
 * Project the physical notch reference and the design language onto one
 * device. This is the single place where millimetres become points.
 */
export function computeDeviceGeometry(input: GeometryInput): DeviceGeometry {
  const { profile } = input;
  const scale = profile.scale;
  const ppi = profile.ppi;
  const ptPerMm = pointsPerMm(ppi, scale);

  const screenWidth = input.screenWidth || profile.pointWidth;
  const screenHeight = input.screenHeight || profile.pointHeight;
  const topSafeArea = input.topSafeArea ?? profile.fallbackTopInset;
  const opticalCenterOffsetX = input.opticalCenterOffsetX ?? 0;

  const mm = (value: number) => snapToPixel(mmToPoints(value, ppi, scale), scale);

  const reference = profile.notch;

  // ---- Physical notch projected into logical points ----------------------
  const notch = reference
    ? {
        reference,
        widthMm: reference.widthMm,
        heightMm: reference.heightMm,
        width: mm(reference.widthMm),
        height: mm(reference.heightMm),
        centerX: screenWidth / 2 + opticalCenterOffsetX,
      }
    : null;

  // On a device with no notch (Dynamic Island, Android, web) the compact
  // surface still needs a believable origin, so we fall back to a synthetic
  // reference the same physical size as the reduced notch.
  const baseWidth = notch ? notch.width : mm(27);
  const baseHeight = notch ? notch.height : mm(5.35);

  const idle: NotchSurfaceGeometry = {
    width: baseWidth,
    height: baseHeight,
    topRadius: 0,
    bottomRadius: snapToPixel(baseHeight * NOTCH_BOTTOM_RADIUS_RATIO, scale),
  };

  const compactWidth = baseWidth + 2 * mm(DESIGN_MM.compactSideGrowth);
  const compactHeight = baseHeight + mm(DESIGN_MM.compactDrop);
  const compact: NotchSurfaceGeometry = {
    width: compactWidth,
    height: compactHeight,
    topRadius: 0,
    // A capsule bottom: the surface reads as the notch, drawn a little fuller.
    bottomRadius: snapToPixel(compactHeight / 2, scale),
  };

  // Charging is a purely horizontal reaction: same height, +2mm per side.
  const charging: NotchSurfaceGeometry = {
    width: compactWidth + 2 * mm(DESIGN_MM.chargingSideGrowth),
    height: compactHeight,
    topRadius: 0,
    bottomRadius: compact.bottomRadius,
  };

  const expandedWidth = Math.min(
    screenWidth - 2 * mm(DESIGN_MM.expandedSideMargin),
    mm(DESIGN_MM.expandedMaxWidth)
  );
  const expanded: NotchSurfaceGeometry = {
    width: snapToPixel(expandedWidth, scale),
    height: mm(DESIGN_MM.expandedHeight),
    topRadius: mm(DESIGN_MM.expandedTopRadius),
    bottomRadius: mm(DESIGN_MM.expandedBottomRadius),
  };

  return {
    presentationType: profile.presentation,
    deviceName: profile.marketingName,
    modelId: input.modelId,
    isRecognized: input.isRecognized,
    isSimulated: input.isSimulated,
    screenWidth,
    screenHeight,
    scale,
    ppi,
    pointsPerMm: ptPerMm,
    topSafeArea,
    notch,
    idle,
    compact,
    charging,
    expanded,
    ears: {
      compact: snapToPixel((compact.width - baseWidth) / 2, scale),
      charging: snapToPixel((charging.width - baseWidth) / 2, scale),
    },
    opticalCenterOffsetX,
    mm,
  };
}
