/**
 * Brush Engine — BVH-accelerated vertex queries via spatial hash grid.
 *
 * Provides the core loop: find affected vertices within brush radius,
 * compute falloff weights, then delegate to a BrushFunction.
 */

import type { HalfEdgeMesh, HEVertex } from "../mesh/half-edge";

// ─── Types ───────────────────────────────────────────────

export type FalloffType = "smooth" | "sharp" | "constant" | "linear";

export interface BrushStroke {
  center: [number, number, number];
  radius: number;
  strength: number;
  falloff: FalloffType;
}

export interface AffectedVertex {
  vertexId: number;
  weight: number;
}

/**
 * A brush function receives the mesh, stroke info, and the list of
 * affected vertices with their falloff weights. It mutates vertex
 * positions in place.
 */
export type BrushFunction = (
  mesh: HalfEdgeMesh,
  stroke: BrushStroke,
  affected: AffectedVertex[]
) => void;

// ─── Falloff Curves ──────────────────────────────────────

function computeFalloff(distance: number, radius: number, type: FalloffType): number {
  const t = Math.min(distance / radius, 1);

  switch (type) {
    case "constant":
      return 1;
    case "linear":
      return 1 - t;
    case "sharp":
      return (1 - t) * (1 - t);
    case "smooth":
    default:
      // Hermite smoothstep: 3t^2 - 2t^3, inverted
      return 1 - (3 * t * t - 2 * t * t * t);
  }
}

// ─── Spatial Hash Grid ───────────────────────────────────

/**
 * Simple spatial hash grid for O(1) average-case sphere queries.
 * Cell size should match the typical brush radius for best performance.
 */
export class SpatialHashGrid {
  private cellSize: number;
  private cells: Map<string, number[]> = new Map();
  private vertexPositions: Map<number, [number, number, number]> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private hashKey(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  private cellCoord(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  /** Clear all entries. */
  clear(): void {
    this.cells.clear();
    this.vertexPositions.clear();
  }

  /** Insert a vertex into the grid. */
  insert(vertexId: number, position: [number, number, number]): void {
    this.vertexPositions.set(vertexId, position);
    const cx = this.cellCoord(position[0]);
    const cy = this.cellCoord(position[1]);
    const cz = this.cellCoord(position[2]);
    const key = this.hashKey(cx, cy, cz);
    const bucket = this.cells.get(key);
    if (bucket) {
      bucket.push(vertexId);
    } else {
      this.cells.set(key, [vertexId]);
    }
  }

  /** Build the grid from an entire HalfEdgeMesh. */
  buildFromMesh(mesh: HalfEdgeMesh): void {
    this.clear();
    for (const [id, v] of mesh.vertices) {
      this.insert(id, v.position);
    }
  }

  /**
   * Query all vertex IDs within a sphere defined by center + radius.
   * Returns an array of { vertexId, distanceSq } for candidates within range.
   */
  querySphere(
    center: [number, number, number],
    radius: number
  ): { vertexId: number; distanceSq: number }[] {
    const results: { vertexId: number; distanceSq: number }[] = [];
    const radiusSq = radius * radius;

    const minCx = this.cellCoord(center[0] - radius);
    const maxCx = this.cellCoord(center[0] + radius);
    const minCy = this.cellCoord(center[1] - radius);
    const maxCy = this.cellCoord(center[1] + radius);
    const minCz = this.cellCoord(center[2] - radius);
    const maxCz = this.cellCoord(center[2] + radius);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const bucket = this.cells.get(this.hashKey(cx, cy, cz));
          if (!bucket) continue;

          for (const vid of bucket) {
            const pos = this.vertexPositions.get(vid);
            if (!pos) continue;

            const dx = pos[0] - center[0];
            const dy = pos[1] - center[1];
            const dz = pos[2] - center[2];
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq <= radiusSq) {
              results.push({ vertexId: vid, distanceSq: distSq });
            }
          }
        }
      }
    }

    return results;
  }

  /** Update a single vertex position (remove + re-insert). */
  updateVertex(vertexId: number, newPosition: [number, number, number]): void {
    const oldPos = this.vertexPositions.get(vertexId);
    if (oldPos) {
      const oldKey = this.hashKey(
        this.cellCoord(oldPos[0]),
        this.cellCoord(oldPos[1]),
        this.cellCoord(oldPos[2])
      );
      const bucket = this.cells.get(oldKey);
      if (bucket) {
        const idx = bucket.indexOf(vertexId);
        if (idx !== -1) bucket.splice(idx, 1);
        if (bucket.length === 0) this.cells.delete(oldKey);
      }
    }
    this.insert(vertexId, newPosition);
  }
}

// ─── Core Brush Operations ───────────────────────────────

/**
 * Find all vertices within the brush stroke radius and compute
 * their falloff weight (0..1) based on distance and falloff curve.
 */
export function getAffectedVertices(
  mesh: HalfEdgeMesh,
  stroke: BrushStroke,
  grid?: SpatialHashGrid
): AffectedVertex[] {
  const results: AffectedVertex[] = [];

  if (grid) {
    // Fast path: use spatial hash grid
    const candidates = grid.querySphere(stroke.center, stroke.radius);
    for (const { vertexId, distanceSq } of candidates) {
      const distance = Math.sqrt(distanceSq);
      const falloff = computeFalloff(distance, stroke.radius, stroke.falloff);
      const weight = falloff * stroke.strength;
      if (weight > 0) {
        results.push({ vertexId, weight });
      }
    }
  } else {
    // Slow path: brute-force scan all vertices
    const radiusSq = stroke.radius * stroke.radius;
    for (const [id, v] of mesh.vertices) {
      const dx = v.position[0] - stroke.center[0];
      const dy = v.position[1] - stroke.center[1];
      const dz = v.position[2] - stroke.center[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq > radiusSq) continue;

      const distance = Math.sqrt(distSq);
      const falloff = computeFalloff(distance, stroke.radius, stroke.falloff);
      const weight = falloff * stroke.strength;
      if (weight > 0) {
        results.push({ vertexId: id, weight });
      }
    }
  }

  return results;
}

/**
 * Apply a brush stroke to a mesh. Finds affected vertices, computes
 * falloff weights, then calls the provided brush function.
 */
export function applyBrushStroke(
  mesh: HalfEdgeMesh,
  stroke: BrushStroke,
  brushFn: BrushFunction,
  grid?: SpatialHashGrid
): void {
  const affected = getAffectedVertices(mesh, stroke, grid);
  if (affected.length === 0) return;
  brushFn(mesh, stroke, affected);
}
