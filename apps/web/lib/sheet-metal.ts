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

// Material K-factor presets
export const MATERIAL_KFACTORS: Record<string, number> = {
  "steel_mild": 0.44,
  "steel_stainless": 0.45,
  "aluminum": 0.33,
  "copper": 0.35,
  "brass": 0.38,
};

export interface FlangeParams {
  length: number;
  angle: number; // degrees (90 = right angle flange)
  edgeIndex: number;
}

/**
 * Calculate bend deduction — how much to subtract from flat for the bend.
 */
export function calculateBendDeduction(
  angleDeg: number,
  radius: number,
  kFactor: number,
  thickness: number
): number {
  const angleRad = (angleDeg * Math.PI) / 180;
  const ba = calculateBendAllowance(angleDeg, radius, kFactor, thickness);
  return 2 * (radius + thickness) * Math.tan(angleRad / 2) - ba;
}

/**
 * Generate flat pattern data — unfolded sheet with bend line positions.
 */
export function generateFlatPattern(
  width: number,
  legs: { length: number; angle: number }[],
  params: SheetMetalParams
): { totalLength: number; bendPositions: number[] } {
  let totalLength = 0;
  const bendPositions: number[] = [];

  for (let i = 0; i < legs.length; i++) {
    if (i > 0) {
      bendPositions.push(totalLength);
      const ba = calculateBendAllowance(legs[i].angle, params.bendRadius, params.kFactor, params.thickness);
      totalLength += ba;
    }
    totalLength += legs[i].length;
  }

  return { totalLength, bendPositions };
}

/**
 * Generate a 3D bent sheet mesh (client-side preview).
 * Creates an L-bend between two flat legs.
 */
export function generateBentSheetMesh(
  width: number,
  leg1: number,
  leg2: number,
  angleDeg: number,
  params: SheetMetalParams
): { vertices: number[]; normals: number[]; indices: number[] } {
  const t = params.thickness;
  const hw = width / 2;
  const angleRad = (angleDeg * Math.PI) / 180;
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Leg 1 — flat on ground (XZ plane, thickness in Y)
  // Top face
  vertices.push(0, t, -hw, leg1, t, -hw, leg1, t, hw, 0, t, hw);
  for (let i = 0; i < 4; i++) normals.push(0, 1, 0);
  // Bottom face
  vertices.push(0, 0, -hw, leg1, 0, -hw, leg1, 0, hw, 0, 0, hw);
  for (let i = 0; i < 4; i++) normals.push(0, -1, 0);
  indices.push(0,1,2, 0,2,3, 4,6,5, 4,7,6);

  // Leg 2 — bent upward from the end of leg 1
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const base = vertices.length / 3;

  // 4 corners of leg 2 top face, rotated around bend line at x=leg1
  const pts2 = [
    [0, t], [leg2, t], [leg2, t], [0, t],
    [0, 0], [leg2, 0], [leg2, 0], [0, 0],
  ];
  const zVals = [-hw, -hw, hw, hw, -hw, -hw, hw, hw];

  for (let i = 0; i < 8; i++) {
    const lx = pts2[i][0];
    const ly = pts2[i][1];
    const rx = leg1 + lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    vertices.push(rx, ry, zVals[i]);
  }

  // Normals for leg 2 (approximate: face normal of the bent surface)
  for (let i = 0; i < 4; i++) normals.push(-sin, cos, 0);
  for (let i = 0; i < 4; i++) normals.push(sin, -cos, 0);

  indices.push(
    base, base+1, base+2, base, base+2, base+3,
    base+4, base+6, base+5, base+4, base+7, base+6,
  );

  return { vertices, normals, indices };
}
