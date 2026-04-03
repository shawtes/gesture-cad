/**
 * UV Unwrapping — Pure TypeScript Implementation
 *
 * Provides angle-based unwrapping, planar projection, and UV island packing
 * without external dependencies like xatlas.
 */

import { HalfEdgeMesh } from "../mesh/half-edge";

// ─── Types ─────────────────────────────────────────────────

export interface UVIsland {
  faceIds: number[];
  uvs: Map<number, [number, number]>;
  bounds: { minU: number; minV: number; maxU: number; maxV: number };
}

// ─── Helpers ───────────────────────────────────────────────

function vec3Sub(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vec3Cross(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function vec3Length(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vec3Normalize(v: [number, number, number]): [number, number, number] {
  const len = vec3Length(v) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Build a local 2D coordinate frame on a plane defined by a normal.
 * Returns two orthonormal tangent vectors (u-axis, v-axis).
 */
function buildTangentFrame(
  normal: [number, number, number]
): { uAxis: [number, number, number]; vAxis: [number, number, number] } {
  const n = vec3Normalize(normal);
  // Pick a reference vector that is not parallel to the normal
  const ref: [number, number, number] =
    Math.abs(n[1]) < 0.999 ? [0, 1, 0] : [1, 0, 0];
  const uAxis = vec3Normalize(vec3Cross(n, ref));
  const vAxis = vec3Cross(n, uAxis);
  return { uAxis, vAxis };
}

function computeIslandBounds(
  uvs: Map<number, [number, number]>
): { minU: number; minV: number; maxU: number; maxV: number } {
  let minU = Infinity;
  let minV = Infinity;
  let maxU = -Infinity;
  let maxV = -Infinity;
  for (const [, [u, v]] of uvs) {
    if (u < minU) minU = u;
    if (v < minV) minV = v;
    if (u > maxU) maxU = u;
    if (v > maxV) maxV = v;
  }
  return { minU, minV, maxU, maxV };
}

// ─── Angle-Based Unwrap ────────────────────────────────────

/**
 * For each face, project its vertices onto the face plane to obtain 2D UVs,
 * then normalize all UVs into the 0-1 range after packing.
 *
 * This is a simplified ABF approach: each face is independently projected
 * using its own normal, then islands are formed and packed.
 */
export function angleBasedUnwrap(
  mesh: HalfEdgeMesh
): Map<number, [number, number]> {
  const uvMap = new Map<number, [number, number]>();

  for (const [faceId, face] of mesh.faces) {
    const verts = mesh.faceVertices(faceId);
    if (verts.length < 3) continue;

    const { uAxis, vAxis } = buildTangentFrame(face.normal);
    const origin = verts[0].position;

    for (const v of verts) {
      if (uvMap.has(v.id)) continue;
      const delta = vec3Sub(v.position, origin);
      const u = vec3Dot(delta, uAxis);
      const vCoord = vec3Dot(delta, vAxis);
      uvMap.set(v.id, [u, vCoord]);
    }
  }

  // Normalize into 0-1 range
  const bounds = computeIslandBounds(uvMap);
  const rangeU = bounds.maxU - bounds.minU || 1;
  const rangeV = bounds.maxV - bounds.minV || 1;

  for (const [vid, [u, v]] of uvMap) {
    uvMap.set(vid, [
      (u - bounds.minU) / rangeU,
      (v - bounds.minV) / rangeV,
    ]);
  }

  return uvMap;
}

// ─── Planar Projection ────────────────────────────────────

/**
 * Project all mesh vertices onto a plane perpendicular to `viewDir`,
 * yielding 2D UV coordinates in 0-1 range.
 */
export function projectFromView(
  mesh: HalfEdgeMesh,
  viewDir: [number, number, number]
): Map<number, [number, number]> {
  const { uAxis, vAxis } = buildTangentFrame(viewDir);
  const uvMap = new Map<number, [number, number]>();

  for (const [vid, vert] of mesh.vertices) {
    const u = vec3Dot(vert.position, uAxis);
    const v = vec3Dot(vert.position, vAxis);
    uvMap.set(vid, [u, v]);
  }

  // Normalize into 0-1
  const bounds = computeIslandBounds(uvMap);
  const rangeU = bounds.maxU - bounds.minU || 1;
  const rangeV = bounds.maxV - bounds.minV || 1;

  for (const [vid, [u, v]] of uvMap) {
    uvMap.set(vid, [
      (u - bounds.minU) / rangeU,
      (v - bounds.minV) / rangeV,
    ]);
  }

  return uvMap;
}

// ─── UV Island Packing ────────────────────────────────────

/**
 * Simple shelf/bin-packing algorithm for UV islands.
 * Places islands left-to-right, top-to-bottom with optional padding.
 * All islands are normalized into 0-1 UV space after packing.
 */
export function packUVIslands(
  islands: UVIsland[],
  padding = 0.01
): UVIsland[] {
  if (islands.length === 0) return [];

  // Normalize each island so its local bounds start at (0,0)
  const normalized: UVIsland[] = islands.map((island) => {
    const newUvs = new Map<number, [number, number]>();
    const b = island.bounds;
    const w = b.maxU - b.minU || 1;
    const h = b.maxV - b.minV || 1;
    for (const [vid, [u, v]] of island.uvs) {
      newUvs.set(vid, [(u - b.minU) / w, (v - b.minV) / h]);
    }
    return {
      faceIds: island.faceIds,
      uvs: newUvs,
      bounds: { minU: 0, minV: 0, maxU: 1, maxV: 1 },
    };
  });

  // Compute aspect-preserving sizes
  const sizes = islands.map((island) => {
    const w = island.bounds.maxU - island.bounds.minU || 1;
    const h = island.bounds.maxV - island.bounds.minV || 1;
    return { w, h };
  });

  // Sort by height descending for better packing
  const indices = sizes.map((_, i) => i);
  indices.sort((a, b) => sizes[b].h - sizes[a].h);

  // Calculate total area to determine scale
  let totalArea = 0;
  for (const s of sizes) {
    totalArea += (s.w + padding) * (s.h + padding);
  }
  const scale = 1 / Math.sqrt(totalArea) * 0.9; // leave some margin

  // Shelf packing
  let cursorX = padding;
  let cursorY = padding;
  let rowHeight = 0;

  const placements: { x: number; y: number; scaleW: number; scaleH: number }[] =
    new Array(islands.length);

  for (const idx of indices) {
    const sw = sizes[idx].w * scale;
    const sh = sizes[idx].h * scale;

    if (cursorX + sw + padding > 1) {
      // New row
      cursorX = padding;
      cursorY += rowHeight + padding;
      if (cursorY + sh > 1) {
        // UV space exhausted — clamp to prevent overflow
        cursorY = Math.min(cursorY, 1 - sh - padding);
      }
      rowHeight = 0;
    }

    placements[idx] = { x: cursorX, y: cursorY, scaleW: sw, scaleH: sh };
    cursorX += sw + padding;
    if (sh > rowHeight) rowHeight = sh;
  }

  // Apply placements
  const result: UVIsland[] = normalized.map((island, idx) => {
    const p = placements[idx];
    const newUvs = new Map<number, [number, number]>();
    for (const [vid, [u, v]] of island.uvs) {
      newUvs.set(vid, [
        p.x + u * p.scaleW,
        p.y + v * p.scaleH,
      ]);
    }
    const bounds = computeIslandBounds(newUvs);
    return { faceIds: island.faceIds, uvs: newUvs, bounds };
  });

  return result;
}
