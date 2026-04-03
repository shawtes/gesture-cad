/**
 * 3D Curve Feature Tools
 *
 * Implements the 10 Onshape curve tools that operate on 3D geometry.
 */

import type { TessellatedMesh } from "./features";

/** Projected Curve — project a sketch curve onto a face */
export function projectCurve(
  curvePoints: [number, number, number][],
  surfaceNormal: [number, number, number],
  surfaceOffset: number
): [number, number, number][] {
  const [nx, ny, nz] = surfaceNormal;
  return curvePoints.map(([x, y, z]) => {
    const dist = x * nx + y * ny + z * nz - surfaceOffset;
    return [x - dist * nx, y - dist * ny, z - dist * nz] as [number, number, number];
  });
}

/** Bridging Curve — connect two 3D points with a smooth curve */
export function bridgingCurve(
  start: [number, number, number],
  end: [number, number, number],
  segments: number = 20
): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Smooth Hermite interpolation
    const h = 3 * t * t - 2 * t * t * t;
    points.push([
      start[0] + (end[0] - start[0]) * h,
      start[1] + (end[1] - start[1]) * h,
      start[2] + (end[2] - start[2]) * h,
    ]);
  }
  return points;
}

/** Composite Curve — join multiple edge chains into one curve */
export function compositeCurve(
  edgeChains: [number, number, number][][]
): [number, number, number][] {
  const result: [number, number, number][] = [];
  for (const chain of edgeChains) {
    for (const pt of chain) {
      if (result.length === 0 || Math.hypot(
        pt[0] - result[result.length - 1][0],
        pt[1] - result[result.length - 1][1],
        pt[2] - result[result.length - 1][2]
      ) > 0.001) {
        result.push(pt);
      }
    }
  }
  return result;
}

/** Intersection Curve — find where two surfaces intersect */
export function intersectionCurve(
  meshA: TessellatedMesh,
  meshB: TessellatedMesh
): [number, number, number][] {
  // Simplified: find edges where triangle planes intersect
  const points: [number, number, number][] = [];
  const vertsA = meshA.vertices, vertsB = meshB.vertices;
  const idxA = meshA.indices, idxB = meshB.indices;

  // Sample centroids of A triangles and check proximity to B triangles
  for (let i = 0; i < idxA.length; i += 3) {
    const ax = (vertsA[idxA[i]*3] + vertsA[idxA[i+1]*3] + vertsA[idxA[i+2]*3]) / 3;
    const ay = (vertsA[idxA[i]*3+1] + vertsA[idxA[i+1]*3+1] + vertsA[idxA[i+2]*3+1]) / 3;
    const az = (vertsA[idxA[i]*3+2] + vertsA[idxA[i+1]*3+2] + vertsA[idxA[i+2]*3+2]) / 3;

    for (let j = 0; j < idxB.length; j += 3) {
      const bx = (vertsB[idxB[j]*3] + vertsB[idxB[j+1]*3] + vertsB[idxB[j+2]*3]) / 3;
      const by = (vertsB[idxB[j]*3+1] + vertsB[idxB[j+1]*3+1] + vertsB[idxB[j+2]*3+1]) / 3;
      const bz = (vertsB[idxB[j]*3+2] + vertsB[idxB[j+1]*3+2] + vertsB[idxB[j+2]*3+2]) / 3;

      if (Math.hypot(ax - bx, ay - by, az - bz) < 0.1) {
        points.push([(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2]);
      }
    }
  }
  return points;
}

/** Trim Curve 3D — trim/extend a curve to a bounding entity */
export function trimCurve3D(
  curvePoints: [number, number, number][],
  trimStart: number, // 0-1 parameter
  trimEnd: number    // 0-1 parameter
): [number, number, number][] {
  const n = curvePoints.length;
  const startIdx = Math.floor(trimStart * (n - 1));
  const endIdx = Math.ceil(trimEnd * (n - 1));
  return curvePoints.slice(startIdx, endIdx + 1);
}

/** Isocline — curve on a face at a specific slope angle */
export function isoclineCurve(
  mesh: TessellatedMesh,
  angle: number, // degrees from vertical
  direction: [number, number, number] = [0, 1, 0]
): [number, number, number][] {
  const points: [number, number, number][] = [];
  const angleRad = (angle * Math.PI) / 180;
  const cosAngle = Math.cos(angleRad);
  const verts = mesh.vertices, norms = mesh.normals;

  for (let i = 0; i < verts.length; i += 3) {
    if (norms.length <= i + 2) continue;
    const dot = norms[i] * direction[0] + norms[i+1] * direction[1] + norms[i+2] * direction[2];
    if (Math.abs(dot - cosAngle) < 0.05) {
      points.push([verts[i], verts[i+1], verts[i+2]]);
    }
  }
  return points;
}

/** Offset Curve 3D — offset a curve by distance along its normal */
export function offsetCurve3D(
  curvePoints: [number, number, number][],
  distance: number
): [number, number, number][] {
  if (curvePoints.length < 2) return [...curvePoints];

  return curvePoints.map((pt, i) => {
    const prev = curvePoints[Math.max(0, i - 1)];
    const next = curvePoints[Math.min(curvePoints.length - 1, i + 1)];
    // Tangent direction
    const tx = next[0] - prev[0], ty = next[1] - prev[1], tz = next[2] - prev[2];
    const tLen = Math.hypot(tx, ty, tz) || 1;
    // Normal = tangent × up, fallback to tangent × right
    let nx = -tz / tLen, ny = 0, nz = tx / tLen;
    const nLen = Math.hypot(nx, ny, nz);
    if (nLen < 0.01) { nx = 0; ny = 1; nz = 0; }
    else { nx /= nLen; ny /= nLen; nz /= nLen; }

    return [pt[0] + nx * distance, pt[1] + ny * distance, pt[2] + nz * distance] as [number, number, number];
  });
}

/** Isoparametric Curve — curve along U or V direction on a surface */
export function isoparametricCurve(
  mesh: TessellatedMesh,
  direction: "u" | "v",
  parameter: number, // 0-1
  segments: number = 20
): [number, number, number][] {
  // Simplified: sample along one axis at the given parameter depth
  const points: [number, number, number][] = [];
  const verts = mesh.vertices;
  if (verts.length < 9) return points;

  // Find bounding box
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < verts.length; i += 3) {
    minX = Math.min(minX, verts[i]); maxX = Math.max(maxX, verts[i]);
    minZ = Math.min(minZ, verts[i+2]); maxZ = Math.max(maxZ, verts[i+2]);
  }

  if (direction === "u") {
    const z = minZ + parameter * (maxZ - minZ);
    for (let i = 0; i <= segments; i++) {
      const x = minX + (i / segments) * (maxX - minX);
      points.push([x, 0, z]);
    }
  } else {
    const x = minX + parameter * (maxX - minX);
    for (let i = 0; i <= segments; i++) {
      const z = minZ + (i / segments) * (maxZ - minZ);
      points.push([x, 0, z]);
    }
  }
  return points;
}

/** Routing Curve — multi-point 3D path across planes */
export function routingCurve(
  waypoints: [number, number, number][],
  bendRadius: number = 0.5
): [number, number, number][] {
  if (waypoints.length < 2) return [...waypoints];

  const result: [number, number, number][] = [waypoints[0]];

  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    // Add fillet arc at corner
    const d1 = Math.hypot(curr[0]-prev[0], curr[1]-prev[1], curr[2]-prev[2]);
    const d2 = Math.hypot(next[0]-curr[0], next[1]-curr[1], next[2]-curr[2]);
    const r = Math.min(bendRadius, d1 * 0.3, d2 * 0.3);

    // Approach point
    const t1 = r / d1;
    result.push([
      curr[0] + (prev[0] - curr[0]) * t1,
      curr[1] + (prev[1] - curr[1]) * t1,
      curr[2] + (prev[2] - curr[2]) * t1,
    ]);

    // Departure point
    const t2 = r / d2;
    result.push([
      curr[0] + (next[0] - curr[0]) * t2,
      curr[1] + (next[1] - curr[1]) * t2,
      curr[2] + (next[2] - curr[2]) * t2,
    ]);
  }

  result.push(waypoints[waypoints.length - 1]);
  return result;
}

/** Convert 3D curve points to a tube mesh for rendering */
export function curveToTubeMesh(
  points: [number, number, number][],
  radius: number = 0.02,
  segments: number = 8
): TessellatedMesh {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  if (points.length < 2) return { vertices: [], normals: [], indices: [] };

  const ringSize = segments + 1;

  for (let i = 0; i < points.length; i++) {
    const [px, py, pz] = points[i];
    const next = points[Math.min(i + 1, points.length - 1)];
    const tx = next[0] - px, ty = next[1] - py, tz = next[2] - pz;
    const tLen = Math.hypot(tx, ty, tz) || 1;

    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      // Approximate normal perpendicular to tangent
      const nx = Math.cos(angle), ny = Math.sin(angle);
      vertices.push(px + nx * radius, py + ny * radius, pz);
      normals.push(nx, ny, 0);
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * ringSize + j;
      const b = a + ringSize;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return { vertices, normals, indices };
}
