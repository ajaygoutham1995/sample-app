import type { PhysicalNotchReference, PresentationType } from './devicePhysicalProfiles';

/**
 * A single resolved geometry for the Dynamic Notch surface, in logical points.
 *
 * `topRadius` and `bottomRadius` are separate on purpose. The physical notch
 * meets the top edge of the panel with square corners and curves only at the
 * bottom. A surface that copies that asymmetry reads as the notch itself
 * growing; a uniformly rounded capsule reads as a floating pill.
 */
export interface NotchSurfaceGeometry {
  width: number;
  height: number;
  topRadius: number;
  bottomRadius: number;
}

/**
 * Everything layout and animation code is allowed to know about the device.
 *
 * Produced once by `DeviceGeometryService`. No component may derive a device
 * dimension by any other route, and no component may hardcode a point value
 * that depends on the device.
 */
export interface DeviceGeometry {
  presentationType: PresentationType;

  /** Human label, e.g. `iPhone 14 Plus`. */
  deviceName: string;
  modelId: string | null;
  /** True when the profile came from a match, false when it is a guess. */
  isRecognized: boolean;
  /** True when geometry was forced by the debug inspector / preview mode. */
  isSimulated: boolean;

  screenWidth: number;
  screenHeight: number;
  scale: number;
  ppi: number;
  /** Logical points per physical millimetre on this panel. */
  pointsPerMm: number;

  topSafeArea: number;

  /** Physical notch reference plus its projection into logical points. */
  notch: {
    reference: PhysicalNotchReference;
    widthMm: number;
    heightMm: number;
    /** The physical notch projected into logical points. */
    width: number;
    height: number;
    /** Horizontal centre of the physical notch in screen coordinates. */
    centerX: number;
  } | null;

  /** Surface exactly matching the physical notch - invisible when at rest. */
  idle: NotchSurfaceGeometry;
  compact: NotchSurfaceGeometry;
  /** Compact grown by the spec-mandated ~2mm on each side. */
  charging: NotchSurfaceGeometry;
  expanded: NotchSurfaceGeometry;

  /**
   * Usable width either side of the physical notch, per surface variant.
   *
   * Nothing can be drawn inside the cutout, so compact content is laid out
   * into these two ears rather than across the surface. Derived here so no
   * component recomputes it.
   */
  ears: {
    compact: number;
    charging: number;
  };

  /**
   * Optical correction applied to the surface centre, in points. Centralised
   * and device-aware; components must never add their own offset.
   */
  opticalCenterOffsetX: number;

  /** Convert a design millimetre value into points for this panel. */
  mm: (millimetres: number) => number;
}
