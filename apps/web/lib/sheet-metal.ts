/** Sheet metal operations: bend, flange, flat pattern, K-factor. */

export interface SheetMetalParams {
  thickness: number;
  kFactor: number; // 0-1, typically 0.44 for steel
  bendRadius: number;
}

export interface BendParams {
  angle: number; // degrees
  radius: number;
  position: { x: number; z: number };
  direction: "up" | "down";
}

/**
 * Calculate bend allowance using the standard formula:
 * BA = θ × (R + K × T)
 * where θ = bend angle in radians, R = inside bend radius,
 * K = K-factor, T = material thickness
 */
export function calculateBendAllowance(
  angleDeg: number,
  radius: number,
  kFactor: number,
  thickness: number
): number {
  const angleRad = (angleDeg * Math.PI) / 180;
  return angleRad * (radius + kFactor * thickness);
}

/**
 * Calculate flat pattern length for a bent sheet.
 * Used to determine the unfolded size for laser cutting.
 */
export function calculateFlatLength(
  legA: number,
  legB: number,
  angleDeg: number,
  radius: number,
  kFactor: number,
  thickness: number
): number {
  const ba = calculateBendAllowance(angleDeg, radius, kFactor, thickness);
  return legA + legB + ba;
}

export const DEFAULT_SHEET_METAL: SheetMetalParams = {
  thickness: 1.0, // mm
  kFactor: 0.44,
  bendRadius: 1.5,
};
