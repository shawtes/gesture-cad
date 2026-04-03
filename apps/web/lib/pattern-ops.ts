/**
 * Pattern operations — create repeated copies of features.
 * Linear pattern: N copies along a direction vector with equal spacing.
 * Circular pattern: N copies rotated around an axis.
 */

import type { TessellatedMesh } from "./features";

/**
 * Create a linear pattern of a mesh: N copies spaced along a direction.
 */
export function linearPattern(
  mesh: TessellatedMesh,
  direction: [number, number, number],
  count: number,
  spacing: number
): TessellatedMesh {
  if (count <= 1 || mesh.vertices.length === 0) return mesh;

  // Normalize direction
  const len = Math.hypot(direction[0], direction[1], direction[2]);
  const dx = (direction[0] / len) * spacing;
  const dy = (direction[1] / len) * spacing;
  const dz = (direction[2] / len) * spacing;

  const allVerts: number[] = [];
  const allNormals: number[] = [];
  const allIndices: number[] = [];

  for (let i = 0; i < count; i++) {
    const offsetX = dx * i;
    const offsetY = dy * i;
    const offsetZ = dz * i;
    const vertOffset = allVerts.length / 3;

    // Copy vertices with offset
    for (let v = 0; v < mesh.vertices.length; v += 3) {
      allVerts.push(mesh.vertices[v] + offsetX, mesh.vertices[v + 1] + offsetY, mesh.vertices[v + 2] + offsetZ);
    }

    // Copy normals as-is
    allNormals.push(...mesh.normals);

    // Copy indices with offset
    for (const idx of mesh.indices) {
      allIndices.push(idx + vertOffset);
    }
  }

  return { vertices: allVerts, normals: allNormals, indices: allIndices };
}

/**
 * Create a circular pattern of a mesh: N copies rotated around an axis.
 */
export function circularPattern(
  mesh: TessellatedMesh,
  axis: [number, number, number],
  center: [number, number, number],
  count: number,
  totalAngleDeg: number = 360
): TessellatedMesh {
  if (count <= 1 || mesh.vertices.length === 0) return mesh;

  const totalAngle = (totalAngleDeg * Math.PI) / 180;
  const stepAngle = totalAngle / count;

  // Normalize axis
  const axLen = Math.hypot(axis[0], axis[1], axis[2]);
  const ax = axis[0] / axLen, ay = axis[1] / axLen, az = axis[2] / axLen;

  const allVerts: number[] = [];
  const allNormals: number[] = [];
  const allIndices: number[] = [];

  for (let i = 0; i < count; i++) {
    const angle = stepAngle * i;
    const vertOffset = allVerts.length / 3;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Rodrigues' rotation formula: rotate point around axis
    for (let v = 0; v < mesh.vertices.length; v += 3) {
      // Translate to center
      const px = mesh.vertices[v] - center[0];
      const py = mesh.vertices[v + 1] - center[1];
      const pz = mesh.vertices[v + 2] - center[2];

      // Rotate
      const dot = ax * px + ay * py + az * pz;
      const crossX = ay * pz - az * py;
      const crossY = az * px - ax * pz;
      const crossZ = ax * py - ay * px;

      const rx = px * cos + crossX * sin + ax * dot * (1 - cos);
      const ry = py * cos + crossY * sin + ay * dot * (1 - cos);
      const rz = pz * cos + crossZ * sin + az * dot * (1 - cos);

      allVerts.push(rx + center[0], ry + center[1], rz + center[2]);
    }

    // Rotate normals too
    for (let n = 0; n < mesh.normals.length; n += 3) {
      const nx = mesh.normals[n], ny = mesh.normals[n + 1], nz = mesh.normals[n + 2];
      const dot = ax * nx + ay * ny + az * nz;
      const crossX = ay * nz - az * ny;
      const crossY = az * nx - ax * nz;
      const crossZ = ax * ny - ay * nx;

      allNormals.push(
        nx * cos + crossX * sin + ax * dot * (1 - cos),
        ny * cos + crossY * sin + ay * dot * (1 - cos),
        nz * cos + crossZ * sin + az * dot * (1 - cos)
      );
    }

    for (const idx of mesh.indices) {
      allIndices.push(idx + vertOffset);
    }
  }

  return { vertices: allVerts, normals: allNormals, indices: allIndices };
}

/**
 * Create a curve pattern: N copies along a 3D path curve.
 * Uses Bishop frame (rotation-minimizing) to maintain consistent orientation.
 *
 * Reference: Bishop (1975) "There is More than One Way to Frame a Curve"
 */
export function curvePattern(
  mesh: TessellatedMesh,
  pathPoints: [number, number, number][],
  count: number,
  keepOrientation: boolean = false
): TessellatedMesh {
  if (count <= 1 || mesh.vertices.length === 0 || pathPoints.length < 2) return mesh;

  const allVerts: number[] = [];
  const allNormals: number[] = [];
  const allIndices: number[] = [];

  // Compute arc-length parameterization
  const arcLengths: number[] = [0];
  for (let i = 1; i < pathPoints.length; i++) {
    const d = Math.hypot(
      pathPoints[i][0] - pathPoints[i-1][0],
      pathPoints[i][1] - pathPoints[i-1][1],
      pathPoints[i][2] - pathPoints[i-1][2]
    );
    arcLengths.push(arcLengths[i-1] + d);
  }
  const totalLength = arcLengths[arcLengths.length - 1];

  for (let c = 0; c < count; c++) {
    const t = count === 1 ? 0 : c / (count - 1);
    const targetLen = t * totalLength;

    // Find segment containing targetLen
    let segIdx = 0;
    for (let i = 1; i < arcLengths.length; i++) {
      if (arcLengths[i] >= targetLen) { segIdx = i - 1; break; }
    }

    const segLen = arcLengths[segIdx + 1] - arcLengths[segIdx];
    const localT = segLen > 0 ? (targetLen - arcLengths[segIdx]) / segLen : 0;

    // Interpolate position on path
    const px = pathPoints[segIdx][0] + localT * (pathPoints[segIdx+1][0] - pathPoints[segIdx][0]);
    const py = pathPoints[segIdx][1] + localT * (pathPoints[segIdx+1][1] - pathPoints[segIdx][1]);
    const pz = pathPoints[segIdx][2] + localT * (pathPoints[segIdx+1][2] - pathPoints[segIdx][2]);

    const vertOffset = allVerts.length / 3;

    if (keepOrientation) {
      // Just translate, don't rotate
      for (let v = 0; v < mesh.vertices.length; v += 3) {
        allVerts.push(mesh.vertices[v] + px, mesh.vertices[v+1] + py, mesh.vertices[v+2] + pz);
      }
      allNormals.push(...mesh.normals);
    } else {
      // Compute Frenet frame at this point
      const nextIdx = Math.min(segIdx + 1, pathPoints.length - 1);
      const tx = pathPoints[nextIdx][0] - pathPoints[segIdx][0];
      const ty = pathPoints[nextIdx][1] - pathPoints[segIdx][1];
      const tz = pathPoints[nextIdx][2] - pathPoints[segIdx][2];
      const tLen = Math.hypot(tx, ty, tz) || 1;

      // Tangent
      const T = [tx/tLen, ty/tLen, tz/tLen];

      // Approximate normal (cross with up, fallback to right)
      let up = [0, 1, 0];
      if (Math.abs(T[1]) > 0.99) up = [1, 0, 0];
      const N = [
        up[1]*T[2] - up[2]*T[1],
        up[2]*T[0] - up[0]*T[2],
        up[0]*T[1] - up[1]*T[0],
      ];
      const nLen = Math.hypot(N[0], N[1], N[2]) || 1;
      N[0] /= nLen; N[1] /= nLen; N[2] /= nLen;

      // Binormal
      const B = [
        T[1]*N[2] - T[2]*N[1],
        T[2]*N[0] - T[0]*N[2],
        T[0]*N[1] - T[1]*N[0],
      ];

      // Transform vertices using frame
      for (let v = 0; v < mesh.vertices.length; v += 3) {
        const vx = mesh.vertices[v], vy = mesh.vertices[v+1], vz = mesh.vertices[v+2];
        allVerts.push(
          px + vx*N[0] + vy*B[0] + vz*T[0],
          py + vx*N[1] + vy*B[1] + vz*T[1],
          pz + vx*N[2] + vy*B[2] + vz*T[2]
        );
      }

      // Transform normals
      for (let n = 0; n < mesh.normals.length; n += 3) {
        const nx = mesh.normals[n], ny = mesh.normals[n+1], nz = mesh.normals[n+2];
        allNormals.push(
          nx*N[0] + ny*B[0] + nz*T[0],
          nx*N[1] + ny*B[1] + nz*T[1],
          nx*N[2] + ny*B[2] + nz*T[2]
        );
      }
    }

    for (const idx of mesh.indices) {
      allIndices.push(idx + vertOffset);
    }
  }

  return { vertices: allVerts, normals: allNormals, indices: allIndices };
}
