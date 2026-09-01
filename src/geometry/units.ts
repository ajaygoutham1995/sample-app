/**
 * Physical-unit conversion.
 *
 * A millimetre is a PHYSICAL quantity. A React Native "point" is a LOGICAL
 * quantity. They are only relatable through two device facts:
 *
 *   pixels per millimetre  = ppi / 25.4
 *   points  per millimetre = (ppi / 25.4) / scale
 *
 * This is why the common `mm * 3.78` shortcut is wrong here: 3.78 is the CSS
 * 96-dpi constant and has nothing to do with a 458ppi @3x iPhone panel.
 *
 * On an iPhone 14 Plus (458ppi, @3x):
 *   1 mm  = 458 / 25.4 / 3       = 6.0105 pt
 *   27 mm = 27 * 6.0105          = 162.3 pt   <- physical notch width
 *
 * Nothing outside `src/geometry` is allowed to convert millimetres.
 */

export const MM_PER_INCH = 25.4;

/** Logical points that represent one physical millimetre on this panel. */
export function pointsPerMm(ppi: number, scale: number): number {
  return ppi / MM_PER_INCH / scale;
}

export function mmToPoints(mm: number, ppi: number, scale: number): number {
  return mm * pointsPerMm(ppi, scale);
}

export function pointsToMm(points: number, ppi: number, scale: number): number {
  return points / pointsPerMm(ppi, scale);
}

/** Round to the nearest physical pixel so edges stay crisp. */
export function snapToPixel(points: number, scale: number): number {
  return Math.round(points * scale) / scale;
}
