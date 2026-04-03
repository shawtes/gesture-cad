/**
 * Texture Baking
 *
 * Rasterize mesh data (normals, AO, vertex colors) into texture maps
 * by iterating over UV-space pixels and sampling the corresponding
 * mesh geometry.
 */

import type { HalfEdgeMesh, HEVertex } from "../mesh/half-edge";
import type { VertexColorData } from "./vertex-colors";

// ─── Types ─────────────────────────────────────────────────

export type BakeType = "normal" | "ao" | "color" | "roughness";

// ─── Normal Map Baking ────────────────────────────────────

/**
 * Generate a tangent-space normal map from mesh geometry.
 * Each pixel in the output represents the interpolated face normal
 * encoded as RGB where (0.5, 0.5, 1.0) = flat/no deviation.
 */
export function bakeNormalMap(
  mesh: HalfEdgeMesh,
  resolution: number
): ImageData {
  const imageData = new ImageData(resolution, resolution);
  const data = imageData.data;

  // Build face lookup from UV triangles
  const triangles = buildUVTriangles(mesh);

  for (let py = 0; py < resolution; py++) {
    for (let px = 0; px < resolution; px++) {
      const u = (px + 0.5) / resolution;
      const v = 1 - (py + 0.5) / resolution; // flip Y

      const sample = sampleTriangle(triangles, u, v);
      const idx = (py * resolution + px) * 4;

      if (sample) {
        // Encode normal: map [-1,1] to [0,255]
        data[idx] = Math.round((sample.normal[0] * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((sample.normal[1] * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((sample.normal[2] * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      } else {
        // Default flat normal (pointing up in tangent space)
        data[idx] = 128;
        data[idx + 1] = 128;
        data[idx + 2] = 255;
        data[idx + 3] = 0; // transparent outside UV
      }
    }
  }

  return imageData;
}

// ─── AO Map Baking ────────────────────────────────────────

/**
 * Generate a simple ambient occlusion map based on vertex accessibility.
 * Vertices surrounded by more geometry receive darker AO values.
 * This is a simplified approach using vertex neighbor counts as a proxy.
 */
export function bakeAOMap(
  mesh: HalfEdgeMesh,
  resolution: number,
  samples = 16
): ImageData {
  const imageData = new ImageData(resolution, resolution);
  const data = imageData.data;

  // Precompute per-vertex AO using neighbor accessibility
  const vertexAO = new Map<number, number>();
  const maxNeighbors = computeMaxNeighborCount(mesh);

  for (const [vid] of mesh.vertices) {
    const neighbors = mesh.vertexNeighbors(vid);
    const faces = mesh.vertexFaces(vid);

    // AO estimate: more surrounding faces = more occluded
    // Normalize by max neighbor count
    const occlusion = maxNeighbors > 0 ? faces.length / maxNeighbors : 0;
    const ao = 1 - Math.min(1, occlusion * 0.5); // keep it subtle
    vertexAO.set(vid, ao);
  }

  // Rasterize AO to texture via UV triangles
  const triangles = buildUVTriangles(mesh);

  for (let py = 0; py < resolution; py++) {
    for (let px = 0; px < resolution; px++) {
      const u = (px + 0.5) / resolution;
      const v = 1 - (py + 0.5) / resolution;

      const sample = sampleTriangle(triangles, u, v);
      const idx = (py * resolution + px) * 4;

      if (sample) {
        // Interpolate AO from the three vertices
        const ao0 = vertexAO.get(sample.vertIds[0]) ?? 1;
        const ao1 = vertexAO.get(sample.vertIds[1]) ?? 1;
        const ao2 = vertexAO.get(sample.vertIds[2]) ?? 1;
        const ao =
          sample.bary[0] * ao0 +
          sample.bary[1] * ao1 +
          sample.bary[2] * ao2;
        const val = Math.round(Math.max(0, Math.min(1, ao)) * 255);
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      } else {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 0;
      }
    }
  }

  return imageData;
}

// ─── Diffuse Map Baking ───────────────────────────────────

/**
 * Rasterize vertex colors to a texture using UV mapping.
 * Interpolates vertex colors across triangle faces via barycentric coords.
 */
export function bakeDiffuseMap(
  vertexColors: VertexColorData,
  mesh: HalfEdgeMesh,
  resolution: number
): ImageData {
  const imageData = new ImageData(resolution, resolution);
  const data = imageData.data;

  const triangles = buildUVTriangles(mesh);

  for (let py = 0; py < resolution; py++) {
    for (let px = 0; px < resolution; px++) {
      const u = (px + 0.5) / resolution;
      const v = 1 - (py + 0.5) / resolution;

      const sample = sampleTriangle(triangles, u, v);
      const idx = (py * resolution + px) * 4;

      if (sample) {
        const c0 = vertexColors.get(sample.vertIds[0]) ?? [1, 1, 1, 1];
        const c1 = vertexColors.get(sample.vertIds[1]) ?? [1, 1, 1, 1];
        const c2 = vertexColors.get(sample.vertIds[2]) ?? [1, 1, 1, 1];

        const r =
          sample.bary[0] * c0[0] + sample.bary[1] * c1[0] + sample.bary[2] * c2[0];
        const g =
          sample.bary[0] * c0[1] + sample.bary[1] * c1[1] + sample.bary[2] * c2[1];
        const b =
          sample.bary[0] * c0[2] + sample.bary[1] * c1[2] + sample.bary[2] * c2[2];
        const a =
          sample.bary[0] * c0[3] + sample.bary[1] * c1[3] + sample.bary[2] * c2[3];

        data[idx] = Math.round(Math.max(0, Math.min(1, r)) * 255);
        data[idx + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
        data[idx + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
        data[idx + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
      } else {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
  }

  return imageData;
}

// ─── Internal: UV Triangle Rasterization ──────────────────

interface UVTriangle {
  uvA: [number, number];
  uvB: [number, number];
  uvC: [number, number];
  normalA: [number, number, number];
  normalB: [number, number, number];
  normalC: [number, number, number];
  vertIds: [number, number, number];
}

interface TriangleSample {
  normal: [number, number, number];
  bary: [number, number, number];
  vertIds: [number, number, number];
}

/**
 * Build UV-space triangles from all mesh faces.
 * Uses vertex UV data (HEVertex.uv). Triangulates n-gons via fan.
 */
function buildUVTriangles(mesh: HalfEdgeMesh): UVTriangle[] {
  const triangles: UVTriangle[] = [];

  for (const [faceId] of mesh.faces) {
    const verts = mesh.faceVertices(faceId);
    if (verts.length < 3) continue;

    // Fan triangulation from first vertex
    for (let i = 1; i < verts.length - 1; i++) {
      const a = verts[0];
      const b = verts[i];
      const c = verts[i + 1];

      const uvA = a.uv ?? [0, 0] as [number, number];
      const uvB = b.uv ?? [0, 0] as [number, number];
      const uvC = c.uv ?? [0, 0] as [number, number];

      triangles.push({
        uvA,
        uvB,
        uvC,
        normalA: a.normal,
        normalB: b.normal,
        normalC: c.normal,
        vertIds: [a.id, b.id, c.id],
      });
    }
  }

  return triangles;
}

/**
 * Find which UV triangle contains the given (u, v) point and return
 * interpolated data via barycentric coordinates.
 */
function sampleTriangle(
  triangles: UVTriangle[],
  u: number,
  v: number
): TriangleSample | null {
  for (const tri of triangles) {
    const bary = barycentricUV(u, v, tri.uvA, tri.uvB, tri.uvC);
    if (!bary) continue;

    // Check if point is inside triangle
    if (bary[0] >= -1e-6 && bary[1] >= -1e-6 && bary[2] >= -1e-6) {
      const nx =
        bary[0] * tri.normalA[0] +
        bary[1] * tri.normalB[0] +
        bary[2] * tri.normalC[0];
      const ny =
        bary[0] * tri.normalA[1] +
        bary[1] * tri.normalB[1] +
        bary[2] * tri.normalC[1];
      const nz =
        bary[0] * tri.normalA[2] +
        bary[1] * tri.normalB[2] +
        bary[2] * tri.normalC[2];

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

      return {
        normal: [nx / len, ny / len, nz / len],
        bary,
        vertIds: tri.vertIds,
      };
    }
  }
  return null;
}

/**
 * Compute 2D barycentric coordinates for point (u, v) in UV triangle.
 */
function barycentricUV(
  u: number,
  v: number,
  a: [number, number],
  b: [number, number],
  c: [number, number]
): [number, number, number] | null {
  const v0x = b[0] - a[0];
  const v0y = b[1] - a[1];
  const v1x = c[0] - a[0];
  const v1y = c[1] - a[1];
  const v2x = u - a[0];
  const v2y = v - a[1];

  const d00 = v0x * v0x + v0y * v0y;
  const d01 = v0x * v1x + v0y * v1y;
  const d11 = v1x * v1x + v1y * v1y;
  const d20 = v2x * v0x + v2y * v0y;
  const d21 = v2x * v1x + v2y * v1y;

  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-12) return null;

  const inv = 1 / denom;
  const baryV = (d11 * d20 - d01 * d21) * inv;
  const baryW = (d00 * d21 - d01 * d20) * inv;
  const baryU = 1 - baryV - baryW;

  return [baryU, baryV, baryW];
}

function computeMaxNeighborCount(mesh: HalfEdgeMesh): number {
  let max = 0;
  for (const [vid] of mesh.vertices) {
    const count = mesh.vertexFaces(vid).length;
    if (count > max) max = count;
  }
  return max;
}
