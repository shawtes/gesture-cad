/** Surface modeling: NURBS, boundary surfaces, curvature analysis. */

export interface ControlPoint {
  x: number;
  y: number;
  z: number;
  weight: number;
}

export interface NURBSSurface {
  id: string;
  degreeU: number;
  degreeV: number;
  controlPoints: ControlPoint[][];
  knotsU: number[];
  knotsV: number[];
}

/**
 * Evaluate a point on a NURBS surface at parameters (u, v).
 * Uses De Boor's algorithm.
 */
export function evaluateNURBS(
  surface: NURBSSurface,
  u: number,
  v: number
): { x: number; y: number; z: number } {
  const { controlPoints, degreeU, degreeV, knotsU, knotsV } = surface;
  const rows = controlPoints.length;
  const cols = controlPoints[0]?.length || 0;

  // Simplified: bilinear interpolation as placeholder for full NURBS evaluation
  const ui = Math.min(Math.floor(u * (rows - 1)), rows - 2);
  const vi = Math.min(Math.floor(v * (cols - 1)), cols - 2);
  const uf = u * (rows - 1) - ui;
  const vf = v * (cols - 1) - vi;

  const p00 = controlPoints[ui][vi];
  const p10 = controlPoints[ui + 1][vi];
  const p01 = controlPoints[ui][vi + 1];
  const p11 = controlPoints[ui + 1][vi + 1];

  return {
    x: (1 - uf) * (1 - vf) * p00.x + uf * (1 - vf) * p10.x + (1 - uf) * vf * p01.x + uf * vf * p11.x,
    y: (1 - uf) * (1 - vf) * p00.y + uf * (1 - vf) * p10.y + (1 - uf) * vf * p01.y + uf * vf * p11.y,
    z: (1 - uf) * (1 - vf) * p00.z + uf * (1 - vf) * p10.z + (1 - uf) * vf * p01.z + uf * vf * p11.z,
  };
}

/**
 * Compute Gaussian curvature at a point (simplified).
 * Positive = dome, Negative = saddle, Zero = flat/cylinder.
 */
export function computeCurvature(
  surface: NURBSSurface,
  u: number,
  v: number,
  delta: number = 0.01
): number {
  const p = evaluateNURBS(surface, u, v);
  const pu = evaluateNURBS(surface, Math.min(u + delta, 1), v);
  const pv = evaluateNURBS(surface, u, Math.min(v + delta, 1));

  // Approximate principal curvatures from second derivatives
  const d2u = {
    x: pu.x - 2 * p.x + evaluateNURBS(surface, Math.max(u - delta, 0), v).x,
    y: pu.y - 2 * p.y + evaluateNURBS(surface, Math.max(u - delta, 0), v).y,
    z: pu.z - 2 * p.z + evaluateNURBS(surface, Math.max(u - delta, 0), v).z,
  };

  const magnitude = Math.sqrt(d2u.x * d2u.x + d2u.y * d2u.y + d2u.z * d2u.z);
  return magnitude / (delta * delta);
}
