/**
 * Multiresolution Sculpting
 *
 * Manages a stack of displacement layers at different subdivision levels.
 * Each level stores per-vertex deltas from the base mesh, allowing
 * non-destructive sculpt detail at varying resolutions.
 */

import type { HalfEdgeMesh } from "../mesh/half-edge";

// ─── Types ───────────────────────────────────────────────

export interface MultiresLevel {
  level: number;
  /** Per-vertex displacement vectors: vertexId -> [dx, dy, dz] */
  displacements: Map<number, [number, number, number]>;
  /** Number of vertices at this subdivision level */
  vertexCount: number;
}

// ─── MultiresStack ───────────────────────────────────────

/**
 * Manages a stack of displacement layers per subdivision level.
 * Level 0 is the coarsest (base mesh); higher levels contain
 * finer detail from additional subdivision.
 */
export class MultiresStack {
  private levels: Map<number, MultiresLevel> = new Map();
  private maxLevel = 0;

  /** Get the current maximum subdivision level. */
  getMaxLevel(): number {
    return this.maxLevel;
  }

  /** Get a specific level, or undefined if it does not exist. */
  getLevel(level: number): MultiresLevel | undefined {
    return this.levels.get(level);
  }

  /** Get all levels. */
  getAllLevels(): MultiresLevel[] {
    return Array.from(this.levels.values()).sort((a, b) => a.level - b.level);
  }

  /** Add or replace a displacement level. */
  setLevel(level: MultiresLevel): void {
    this.levels.set(level.level, level);
    if (level.level > this.maxLevel) {
      this.maxLevel = level.level;
    }
  }

  /** Create an empty level at the given subdivision depth. */
  addEmptyLevel(level: number, vertexCount: number): MultiresLevel {
    const entry: MultiresLevel = {
      level,
      displacements: new Map(),
      vertexCount,
    };
    this.setLevel(entry);
    return entry;
  }

  /** Remove a level and all its displacements. */
  removeLevel(level: number): boolean {
    const deleted = this.levels.delete(level);
    if (deleted && level === this.maxLevel) {
      this.maxLevel = 0;
      for (const [lvl] of this.levels) {
        if (lvl > this.maxLevel) this.maxLevel = lvl;
      }
    }
    return deleted;
  }

  /** Clear all levels. */
  clear(): void {
    this.levels.clear();
    this.maxLevel = 0;
  }

  /**
   * Set displacement for a specific vertex at a specific level.
   * Creates the level if it does not exist.
   */
  setDisplacement(
    level: number,
    vertexId: number,
    displacement: [number, number, number]
  ): void {
    let entry = this.levels.get(level);
    if (!entry) {
      entry = this.addEmptyLevel(level, 0);
    }
    entry.displacements.set(vertexId, displacement);
  }

  /**
   * Get displacement for a specific vertex at a specific level.
   * Returns [0,0,0] if no displacement is recorded.
   */
  getDisplacement(level: number, vertexId: number): [number, number, number] {
    const entry = this.levels.get(level);
    if (!entry) return [0, 0, 0];
    return entry.displacements.get(vertexId) ?? [0, 0, 0];
  }
}

// ─── Operations ──────────────────────────────────────────

/**
 * Apply accumulated displacements from level 0 up to `level` onto
 * the mesh vertex positions. The mesh should be at its base (level 0)
 * state before calling this.
 */
export function applyMultires(
  mesh: HalfEdgeMesh,
  stack: MultiresStack,
  level: number
): void {
  for (let lvl = 0; lvl <= level; lvl++) {
    const entry = stack.getLevel(lvl);
    if (!entry) continue;

    for (const [vertexId, disp] of entry.displacements) {
      const v = mesh.vertices.get(vertexId);
      if (!v) continue;

      v.position[0] += disp[0];
      v.position[1] += disp[1];
      v.position[2] += disp[2];
    }
  }

  mesh.computeVertexNormals();
}

/**
 * Capture the difference between the current mesh vertex positions
 * and a base mesh as a displacement layer at the given level.
 *
 * Only vertices present in both meshes are compared. The delta
 * (current - base) is stored as the displacement.
 */
export function captureDisplacement(
  mesh: HalfEdgeMesh,
  baseMesh: HalfEdgeMesh,
  level: number
): MultiresLevel {
  const displacements = new Map<number, [number, number, number]>();

  for (const [id, v] of mesh.vertices) {
    const baseV = baseMesh.vertices.get(id);
    if (!baseV) continue;

    const dx = v.position[0] - baseV.position[0];
    const dy = v.position[1] - baseV.position[1];
    const dz = v.position[2] - baseV.position[2];

    // Only store non-zero displacements to save memory
    if (Math.abs(dx) > 1e-9 || Math.abs(dy) > 1e-9 || Math.abs(dz) > 1e-9) {
      displacements.set(id, [dx, dy, dz]);
    }
  }

  const entry: MultiresLevel = {
    level,
    displacements,
    vertexCount: mesh.vertices.size,
  };

  return entry;
}

/**
 * Reconstruct a mesh at a specific multiresolution level.
 * Clones the base mesh and applies displacements up to `level`.
 */
export function reconstructAtLevel(
  baseMesh: HalfEdgeMesh,
  stack: MultiresStack,
  level: number
): HalfEdgeMesh {
  const result = baseMesh.clone();
  applyMultires(result, stack, level);
  return result;
}
