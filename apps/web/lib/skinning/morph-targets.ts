/**
 * Morph Targets / Shape Keys / Blend Shapes
 *
 * Compute and apply vertex position deltas driven by weights or bone rotation.
 */

import type { HalfEdgeMesh } from '../mesh/half-edge';

// ─── Types ────────────────────────────────────────────────

export interface MorphTarget {
  id: string;
  name: string;
  /** Vertex ID -> position delta [dx, dy, dz] */
  vertices: Map<number, [number, number, number]>;
  /** Blend weight 0..1 */
  weight: number;
}

export interface MorphDriver {
  targetId: string;
  boneId: string;
  property: 'rotation_x' | 'rotation_y' | 'rotation_z';
  /** Bone rotation value at which morph weight = 0 */
  min: number;
  /** Bone rotation value at which morph weight = 1 */
  max: number;
}

// ─── MorphTargetSet Class ─────────────────────────────────

let morphIdCounter = 0;

export class MorphTargetSet {
  targets: MorphTarget[] = [];

  /**
   * Add a morph target by computing deltas between a base mesh and morphed mesh.
   * Both meshes must share the same vertex IDs.
   *
   * @param name - Display name for this shape key.
   * @param baseMesh - The mesh in its rest/base pose.
   * @param morphedMesh - The mesh in its morphed/deformed pose.
   * @returns The created MorphTarget.
   */
  addTarget(
    name: string,
    baseMesh: HalfEdgeMesh,
    morphedMesh: HalfEdgeMesh,
  ): MorphTarget {
    const deltas = new Map<number, [number, number, number]>();

    for (const [vertId, baseVert] of baseMesh.vertices) {
      const morphVert = morphedMesh.vertices.get(vertId);
      if (!morphVert) continue;

      const dx = morphVert.position[0] - baseVert.position[0];
      const dy = morphVert.position[1] - baseVert.position[1];
      const dz = morphVert.position[2] - baseVert.position[2];

      // Only store non-zero deltas
      if (Math.abs(dx) > 1e-8 || Math.abs(dy) > 1e-8 || Math.abs(dz) > 1e-8) {
        deltas.set(vertId, [dx, dy, dz]);
      }
    }

    const target: MorphTarget = {
      id: `morph_${morphIdCounter++}`,
      name,
      vertices: deltas,
      weight: 0,
    };

    this.targets.push(target);
    return target;
  }

  /**
   * Set the blend weight for a morph target.
   */
  setWeight(targetId: string, weight: number): void {
    const target = this.targets.find((t) => t.id === targetId);
    if (target) {
      target.weight = Math.max(0, Math.min(1, weight));
    }
  }

  /**
   * Apply all morph targets to a mesh by blending deltas according to their weights.
   * Mutates vertex positions in place.
   *
   * Formula: v' = v_base + sum(target.weight * target.delta[v])
   *
   * NOTE: This assumes the mesh is currently at its base pose.
   * To apply morphs correctly after previous application, reset to base first.
   */
  applyMorphs(mesh: HalfEdgeMesh): void {
    // Accumulate deltas per vertex
    const accumulated = new Map<number, [number, number, number]>();

    for (const target of this.targets) {
      if (target.weight < 1e-8) continue;

      for (const [vertId, delta] of target.vertices) {
        const current = accumulated.get(vertId) ?? [0, 0, 0];
        accumulated.set(vertId, [
          current[0] + delta[0] * target.weight,
          current[1] + delta[1] * target.weight,
          current[2] + delta[2] * target.weight,
        ]);
      }
    }

    // Apply accumulated deltas
    for (const [vertId, delta] of accumulated) {
      const vertex = mesh.vertices.get(vertId);
      if (!vertex) continue;

      vertex.position = [
        vertex.position[0] + delta[0],
        vertex.position[1] + delta[1],
        vertex.position[2] + delta[2],
      ];
    }
  }
}
