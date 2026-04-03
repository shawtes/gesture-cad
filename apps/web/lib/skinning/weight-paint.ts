/**
 * Weight Painting & Skin Deformation
 *
 * Vertex weight assignment, normalization, distance-based auto-weighting,
 * and linear blend skinning (LBS) deformation.
 */

import type { HalfEdgeMesh } from '../mesh/half-edge';
import type { Armature, Bone } from '../rigging/armature';
import { mat4Multiply } from '../rigging/armature';

// ─── Types ────────────────────────────────────────────────

/** vertexId -> boneId -> weight */
export type SkinWeightData = Map<number, Map<string, number>>;

// ─── Weight Painting ──────────────────────────────────────

/**
 * Paint a weight value for a specific vertex/bone pair.
 *
 * @param data - The skin weight data map.
 * @param vertexId - Target vertex ID.
 * @param boneId - Target bone ID.
 * @param weight - Weight value (0..1).
 * @param blendMode - How to combine with existing weight.
 */
export function paintWeight(
  data: SkinWeightData,
  vertexId: number,
  boneId: string,
  weight: number,
  blendMode: 'replace' | 'add' | 'subtract',
): void {
  let vertexWeights = data.get(vertexId);
  if (!vertexWeights) {
    vertexWeights = new Map<string, number>();
    data.set(vertexId, vertexWeights);
  }

  const current = vertexWeights.get(boneId) ?? 0;

  let newWeight: number;
  switch (blendMode) {
    case 'replace':
      newWeight = weight;
      break;
    case 'add':
      newWeight = current + weight;
      break;
    case 'subtract':
      newWeight = current - weight;
      break;
  }

  newWeight = Math.max(0, Math.min(1, newWeight));

  if (newWeight <= 0) {
    vertexWeights.delete(boneId);
  } else {
    vertexWeights.set(boneId, newWeight);
  }

  if (vertexWeights.size === 0) {
    data.delete(vertexId);
  }
}

/**
 * Normalize weights for a vertex so they sum to 1.0.
 * If no weights exist, does nothing.
 */
export function normalizeWeights(data: SkinWeightData, vertexId: number): void {
  const vertexWeights = data.get(vertexId);
  if (!vertexWeights || vertexWeights.size === 0) return;

  let sum = 0;
  for (const w of vertexWeights.values()) {
    sum += w;
  }

  if (sum < 1e-10) return;

  for (const [boneId, w] of vertexWeights) {
    vertexWeights.set(boneId, w / sum);
  }
}

// ─── Auto-Weighting (Distance-Based) ─────────────────────

type Vec3 = [number, number, number];

function vecSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vecDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecScale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/** Distance from point to line segment (bone head-tail) */
function distanceToSegment(point: Vec3, segA: Vec3, segB: Vec3): number {
  const ab = vecSub(segB, segA);
  const ap = vecSub(point, segA);
  const abLenSq = vecDot(ab, ab);

  if (abLenSq < 1e-10) {
    // Degenerate bone (head == tail)
    const d = vecSub(point, segA);
    return Math.sqrt(vecDot(d, d));
  }

  const t = Math.max(0, Math.min(1, vecDot(ap, ab) / abLenSq));
  const closest = vecAdd(segA, vecScale(ab, t));
  const diff = vecSub(point, closest);
  return Math.sqrt(vecDot(diff, diff));
}

/**
 * Automatically compute skin weights using heat-map style distance-based
 * approximation. Closer vertices get more weight from the nearest bone.
 *
 * Uses inverse distance weighting with exponential falloff.
 */
export function autoWeight(
  mesh: HalfEdgeMesh,
  armature: Armature,
): SkinWeightData {
  const data: SkinWeightData = new Map();
  const boneList: Bone[] = Array.from(armature.bones.values());

  if (boneList.length === 0) return data;

  for (const vertex of mesh.vertices.values()) {
    const vPos = vertex.position;
    const vertexWeights = new Map<string, number>();

    // Compute distance to each bone segment
    const distances: Array<{ boneId: string; dist: number }> = [];
    for (const bone of boneList) {
      const dist = distanceToSegment(vPos, bone.head, bone.tail);
      distances.push({ boneId: bone.id, dist });
    }

    // Sort by distance
    distances.sort((a, b) => a.dist - b.dist);

    // Use inverse distance weighting for closest bones (max 4)
    const maxInfluences = Math.min(4, distances.length);
    const sigma = distances[0].dist + 0.001; // avoid division by zero

    let weightSum = 0;
    for (let i = 0; i < maxInfluences; i++) {
      const d = distances[i].dist;
      const w = Math.exp(-(d * d) / (2 * sigma * sigma));
      vertexWeights.set(distances[i].boneId, w);
      weightSum += w;
    }

    // Normalize
    if (weightSum > 1e-10) {
      for (const [boneId, w] of vertexWeights) {
        vertexWeights.set(boneId, w / weightSum);
      }
    }

    data.set(vertex.id, vertexWeights);
  }

  return data;
}

// ─── Linear Blend Skinning ────────────────────────────────

/** Invert a 4x4 column-major matrix (general case) */
function mat4Invert(m: number[]): number[] | null {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det =
    b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (Math.abs(det) < 1e-12) return null;
  det = 1.0 / det;

  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * det,
    (a02 * b10 - a01 * b11 - a03 * b09) * det,
    (a31 * b05 - a32 * b04 + a33 * b03) * det,
    (a22 * b04 - a21 * b05 - a23 * b03) * det,
    (a12 * b08 - a10 * b11 - a13 * b07) * det,
    (a00 * b11 - a02 * b08 + a03 * b07) * det,
    (a32 * b02 - a30 * b05 - a33 * b01) * det,
    (a20 * b05 - a22 * b02 + a23 * b01) * det,
    (a10 * b10 - a11 * b08 + a13 * b06) * det,
    (a01 * b08 - a00 * b10 - a03 * b06) * det,
    (a30 * b04 - a31 * b02 + a33 * b00) * det,
    (a21 * b02 - a20 * b04 - a23 * b00) * det,
    (a11 * b07 - a10 * b09 - a12 * b06) * det,
    (a00 * b09 - a01 * b07 + a02 * b06) * det,
    (a31 * b01 - a30 * b03 - a32 * b00) * det,
    (a20 * b03 - a21 * b01 + a22 * b00) * det,
  ];
}

/** Transform a vec3 by a 4x4 column-major matrix (w=1) */
function mat4TransformPoint(m: number[], p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

/**
 * Apply Linear Blend Skinning deformation to a mesh.
 *
 * Each vertex is transformed by a weighted combination of bone matrices:
 *   v' = sum_i (weight_i * boneWorldMatrix_i * boneBindInverse_i * v)
 *
 * This mutates the mesh vertex positions in place.
 * Call armature.updateWorldMatrices() before invoking this.
 */
export function applySkinDeformation(
  mesh: HalfEdgeMesh,
  weights: SkinWeightData,
  armature: Armature,
): void {
  // Compute bind pose inverse matrices (using current world matrices as bind)
  const bindInverses = new Map<string, number[]>();
  for (const [boneId, bone] of armature.bones) {
    const inv = mat4Invert(bone.worldMatrix);
    if (inv) {
      bindInverses.set(boneId, inv);
    }
  }

  for (const vertex of mesh.vertices.values()) {
    const vertexWeights = weights.get(vertex.id);
    if (!vertexWeights || vertexWeights.size === 0) continue;

    let outX = 0, outY = 0, outZ = 0;
    let totalWeight = 0;

    for (const [boneId, weight] of vertexWeights) {
      const bone = armature.bones.get(boneId);
      const bindInv = bindInverses.get(boneId);
      if (!bone || !bindInv) continue;

      // Skin matrix = worldMatrix * bindInverse
      const skinMatrix = mat4Multiply(bone.worldMatrix, bindInv);
      const transformed = mat4TransformPoint(skinMatrix, vertex.position);

      outX += transformed[0] * weight;
      outY += transformed[1] * weight;
      outZ += transformed[2] * weight;
      totalWeight += weight;
    }

    if (totalWeight > 1e-10) {
      vertex.position = [
        outX / totalWeight,
        outY / totalWeight,
        outZ / totalWeight,
      ];
    }
  }
}
