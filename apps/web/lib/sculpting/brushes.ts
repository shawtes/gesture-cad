/**
 * Sculpt Brush Implementations
 *
 * Six brush functions that each operate on affected vertices with
 * falloff weights. All brushes mutate vertex positions in place.
 */

import type { HalfEdgeMesh } from "../mesh/half-edge";
import type { BrushFunction, BrushStroke, AffectedVertex } from "./brush-engine";

export type { BrushFunction };

export type BrushType = "grab" | "smooth" | "inflate" | "pinch" | "crease" | "flatten";

// ─── Helpers ─────────────────────────────────────────────

function vec3Add(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vec3Sub(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Scale(
  v: [number, number, number],
  s: number
): [number, number, number] {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function vec3Normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function vec3Dot(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// ─── Grab Brush ──────────────────────────────────────────

/**
 * Translates vertices with falloff, like grabbing and dragging clay.
 * The stroke center acts as the grab offset direction.
 * In practice the caller sets stroke.center to the delta from the
 * initial grab position; strength modulates displacement.
 */
export const grabBrush: BrushFunction = (
  mesh: HalfEdgeMesh,
  stroke: BrushStroke,
  affected: AffectedVertex[]
): void => {
  // Use stroke center as the displacement direction
  const delta: [number, number, number] = [
    stroke.center[0] * stroke.strength,
    stroke.center[1] * stroke.strength,
    stroke.center[2] * stroke.strength,
  ];

  for (const { vertexId, weight } of affected) {
    const v = mesh.vertices.get(vertexId);
    if (!v) continue;
    v.position[0] += delta[0] * weight;
    v.position[1] += delta[1] * weight;
    v.position[2] += delta[2] * weight;
  }
};

// ─── Smooth Brush ────────────────────────────────────────

/**
 * Laplacian smoothing: moves each vertex toward the average
 * position of its topological neighbors.
 */
export const smoothBrush: BrushFunction = (
  mesh: HalfEdgeMesh,
  _stroke: BrushStroke,
  affected: AffectedVertex[]
): void => {
  // Pre-compute target positions before applying (avoids order dependency)
  const targets = new Map<number, [number, number, number]>();

  for (const { vertexId } of affected) {
    const neighborIds = mesh.vertexNeighbors(vertexId);
    if (neighborIds.length === 0) continue;

    let avgX = 0;
    let avgY = 0;
    let avgZ = 0;
    let count = 0;

    for (const nid of neighborIds) {
      const nv = mesh.vertices.get(nid);
      if (!nv) continue;
      avgX += nv.position[0];
      avgY += nv.position[1];
      avgZ += nv.position[2];
      count++;
    }

    if (count > 0) {
      targets.set(vertexId, [avgX / count, avgY / count, avgZ / count]);
    }
  }

  // Apply smoothing with weight
  for (const { vertexId, weight } of affected) {
    const v = mesh.vertices.get(vertexId);
    const target = targets.get(vertexId);
    if (!v || !target) continue;

    v.position[0] += (target[0] - v.position[0]) * weight;
    v.position[1] += (target[1] - v.position[1]) * weight;
    v.position[2] += (target[2] - v.position[2]) * weight;
  }
};

// ─── Inflate Brush ───────────────────────────────────────

/**
 * Displaces vertices along their normals, inflating the surface
 * outward (positive strength) or inward (negative strength).
 */
export const inflateBrush: BrushFunction = (
  mesh: HalfEdgeMesh,
  stroke: BrushStroke,
  affected: AffectedVertex[]
): void => {
  for (const { vertexId, weight } of affected) {
    const v = mesh.vertices.get(vertexId);
    if (!v) continue;

    const n = v.normal;
    const displacement = stroke.radius * 0.1 * weight;
    v.position[0] += n[0] * displacement;
    v.position[1] += n[1] * displacement;
    v.position[2] += n[2] * displacement;
  }
};

// ─── Pinch Brush ─────────────────────────────────────────

/**
 * Moves vertices toward the stroke center, pinching the surface
 * inward. Useful for creating sharp ridges and edges.
 */
export const pinchBrush: BrushFunction = (
  mesh: HalfEdgeMesh,
  stroke: BrushStroke,
  affected: AffectedVertex[]
): void => {
  for (const { vertexId, weight } of affected) {
    const v = mesh.vertices.get(vertexId);
    if (!v) continue;

    const toCenter = vec3Sub(stroke.center, v.position as [number, number, number]);
    const dir = vec3Normalize(toCenter);
    const dist = Math.sqrt(
      toCenter[0] * toCenter[0] +
      toCenter[1] * toCenter[1] +
      toCenter[2] * toCenter[2]
    );

    const displacement = dist * weight * 0.5;
    v.position[0] += dir[0] * displacement;
    v.position[1] += dir[1] * displacement;
    v.position[2] += dir[2] * displacement;
  }
};

// ─── Crease Brush ────────────────────────────────────────

/**
 * Combination of normal displacement + pinch toward the stroke
 * center line. Creates sharp creases and folds.
 */
export const creaseBrush: BrushFunction = (
  mesh: HalfEdgeMesh,
  stroke: BrushStroke,
  affected: AffectedVertex[]
): void => {
  for (const { vertexId, weight } of affected) {
    const v = mesh.vertices.get(vertexId);
    if (!v) continue;

    const pos = v.position as [number, number, number];
    const n = v.normal;

    // Normal displacement component
    const normalDisp = stroke.radius * 0.05 * weight;

    // Pinch component toward center
    const toCenter = vec3Sub(stroke.center, pos);
    const pinchDir = vec3Normalize(toCenter);
    const dist = Math.sqrt(
      toCenter[0] * toCenter[0] +
      toCenter[1] * toCenter[1] +
      toCenter[2] * toCenter[2]
    );
    const pinchDisp = dist * weight * 0.25;

    v.position[0] += n[0] * normalDisp + pinchDir[0] * pinchDisp;
    v.position[1] += n[1] * normalDisp + pinchDir[1] * pinchDisp;
    v.position[2] += n[2] * normalDisp + pinchDir[2] * pinchDisp;
  }
};

// ─── Flatten Brush ───────────────────────────────────────

/**
 * Projects vertices onto the average plane defined by the affected
 * region. Useful for creating flat surfaces on organic shapes.
 */
export const flattenBrush: BrushFunction = (
  mesh: HalfEdgeMesh,
  _stroke: BrushStroke,
  affected: AffectedVertex[]
): void => {
  if (affected.length === 0) return;

  // Compute average position and normal of affected vertices
  let avgPos: [number, number, number] = [0, 0, 0];
  let avgNormal: [number, number, number] = [0, 0, 0];
  let totalWeight = 0;

  for (const { vertexId, weight } of affected) {
    const v = mesh.vertices.get(vertexId);
    if (!v) continue;

    avgPos[0] += v.position[0] * weight;
    avgPos[1] += v.position[1] * weight;
    avgPos[2] += v.position[2] * weight;
    avgNormal[0] += v.normal[0] * weight;
    avgNormal[1] += v.normal[1] * weight;
    avgNormal[2] += v.normal[2] * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return;

  avgPos = vec3Scale(avgPos, 1 / totalWeight);
  avgNormal = vec3Normalize(avgNormal);

  // Project each vertex onto the plane defined by (avgPos, avgNormal)
  for (const { vertexId, weight } of affected) {
    const v = mesh.vertices.get(vertexId);
    if (!v) continue;

    const toVertex = vec3Sub(v.position as [number, number, number], avgPos);
    const signedDist = vec3Dot(toVertex, avgNormal);

    // Move vertex toward the plane by weight
    v.position[0] -= avgNormal[0] * signedDist * weight;
    v.position[1] -= avgNormal[1] * signedDist * weight;
    v.position[2] -= avgNormal[2] * signedDist * weight;
  }
};

// ─── Brush Registry ──────────────────────────────────────

export const BRUSH_REGISTRY: Record<BrushType, BrushFunction> = {
  grab: grabBrush,
  smooth: smoothBrush,
  inflate: inflateBrush,
  pinch: pinchBrush,
  crease: creaseBrush,
  flatten: flattenBrush,
};

/**
 * Get a brush function by type name.
 */
export function getBrush(type: BrushType): BrushFunction {
  return BRUSH_REGISTRY[type];
}
