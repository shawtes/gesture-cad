/**
 * Trim operation: split a sketch entity at intersection points with other entities.
 * The user clicks near an entity segment to keep; the other segments are removed.
 */

import type { SketchEntity, SketchLine } from "../sketch-entities";
import { createLine } from "../sketch-entities";

interface Intersection {
  /** Parameter t along entity A (0-1) */
  tA: number;
  /** Parameter t along entity B (0-1) */
  tB: number;
  /** World position of intersection */
  x: number;
  z: number;
}

/**
 * Find intersection points between a line and all other entities.
 * Returns sorted by parameter t along the target line.
 */
export function findLineIntersections(
  target: SketchLine,
  others: SketchEntity[]
): Intersection[] {
  const intersections: Intersection[] = [];

  for (const other of others) {
    if (other.id === target.id) continue;

    if (other.type === "line") {
      const hit = lineLineIntersection(
        target.x1, target.z1, target.x2, target.z2,
        other.x1, other.z1, other.x2, other.z2
      );
      if (hit) intersections.push(hit);
    } else if (other.type === "circle") {
      const hits = lineCircleIntersection(
        target.x1, target.z1, target.x2, target.z2,
        other.cx, other.cz, other.radius
      );
      intersections.push(...hits);
    } else if (other.type === "rect") {
      // Test against 4 edges of rectangle
      const edges: [number, number, number, number][] = [
        [other.x1, other.z1, other.x2, other.z1],
        [other.x2, other.z1, other.x2, other.z2],
        [other.x2, other.z2, other.x1, other.z2],
        [other.x1, other.z2, other.x1, other.z1],
      ];
      for (const [ex1, ez1, ex2, ez2] of edges) {
        const hit = lineLineIntersection(
          target.x1, target.z1, target.x2, target.z2,
          ex1, ez1, ex2, ez2
        );
        if (hit) intersections.push(hit);
      }
    }
  }

  return intersections.sort((a, b) => a.tA - b.tA);
}

/**
 * Trim a line at its intersection points, returning the segments.
 * The segment closest to clickPos is kept, others are removed.
 */
export function trimLine(
  target: SketchLine,
  others: SketchEntity[],
  clickPos: { x: number; z: number }
): SketchEntity[] {
  const intersections = findLineIntersections(target, others);

  if (intersections.length === 0) return [target]; // No intersections, keep original

  // Create segments: [0, t1], [t1, t2], ..., [tN, 1]
  const params = [0, ...intersections.map((i) => i.tA), 1];
  const segments: SketchLine[] = [];

  for (let i = 0; i < params.length - 1; i++) {
    const t0 = params[i];
    const t1 = params[i + 1];
    if (t1 - t0 < 0.001) continue; // Skip degenerate segments

    const x1 = target.x1 + (target.x2 - target.x1) * t0;
    const z1 = target.z1 + (target.z2 - target.z1) * t0;
    const x2 = target.x1 + (target.x2 - target.x1) * t1;
    const z2 = target.z1 + (target.z2 - target.z1) * t1;

    segments.push(createLine(x1, z1, x2, z2));
  }

  if (segments.length <= 1) return segments;

  // Find which segment the click is closest to
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const midX = (seg.x1 + seg.x2) / 2;
    const midZ = (seg.z1 + seg.z2) / 2;
    const d = Math.hypot(clickPos.x - midX, clickPos.z - midZ);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  // Return only the clicked segment (trim removes the rest)
  return [segments[bestIdx]];
}

/** Line-line intersection, returns null if no intersection within both segments */
function lineLineIntersection(
  ax1: number, az1: number, ax2: number, az2: number,
  bx1: number, bz1: number, bx2: number, bz2: number
): Intersection | null {
  const dax = ax2 - ax1, daz = az2 - az1;
  const dbx = bx2 - bx1, dbz = bz2 - bz1;

  const denom = dax * dbz - daz * dbx;
  if (Math.abs(denom) < 1e-10) return null; // Parallel

  const t = ((bx1 - ax1) * dbz - (bz1 - az1) * dbx) / denom;
  const u = ((bx1 - ax1) * daz - (bz1 - az1) * dax) / denom;

  if (t < 0.001 || t > 0.999 || u < 0.001 || u > 0.999) return null;

  return {
    tA: t,
    tB: u,
    x: ax1 + dax * t,
    z: az1 + daz * t,
  };
}

/** Line-circle intersection, returns 0-2 intersections */
function lineCircleIntersection(
  x1: number, z1: number, x2: number, z2: number,
  cx: number, cz: number, r: number
): Intersection[] {
  const dx = x2 - x1, dz = z2 - z1;
  const fx = x1 - cx, fz = z1 - cz;

  const a = dx * dx + dz * dz;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - r * r;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  discriminant = Math.sqrt(discriminant);
  const results: Intersection[] = [];

  for (const sign of [-1, 1]) {
    const t = (-b + sign * discriminant) / (2 * a);
    if (t > 0.001 && t < 0.999) {
      results.push({
        tA: t,
        tB: 0,
        x: x1 + dx * t,
        z: z1 + dz * t,
      });
    }
  }

  return results;
}
