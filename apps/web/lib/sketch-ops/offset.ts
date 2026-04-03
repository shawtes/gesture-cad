/**
 * Offset operation: create a parallel copy of a sketch entity at a given distance.
 */

import type { SketchEntity, SketchLine, SketchCircle, SketchRect, SketchArc } from "../sketch-entities";
import { createLine, createCircle, createRect, createArc } from "../sketch-entities";

/**
 * Create an offset copy of a sketch entity at the given distance.
 * Positive distance offsets outward, negative inward.
 */
export function offsetEntity(entity: SketchEntity, distance: number): SketchEntity | null {
  switch (entity.type) {
    case "line":
      return offsetLine(entity, distance);
    case "circle":
      return offsetCircle(entity, distance);
    case "rect":
      return offsetRect(entity, distance);
    case "arc":
      return offsetArc(entity, distance);
    default:
      return null; // Points and splines don't have a meaningful offset
  }
}

function offsetLine(line: SketchLine, distance: number): SketchLine {
  // Compute perpendicular direction
  const dx = line.x2 - line.x1;
  const dz = line.z2 - line.z1;
  const len = Math.hypot(dx, dz);
  if (len < 1e-10) return createLine(line.x1, line.z1, line.x2, line.z2);

  // Normal perpendicular to line (rotated 90 degrees)
  const nx = -dz / len;
  const nz = dx / len;

  return createLine(
    line.x1 + nx * distance,
    line.z1 + nz * distance,
    line.x2 + nx * distance,
    line.z2 + nz * distance
  );
}

function offsetCircle(circle: SketchCircle, distance: number): SketchCircle | null {
  const newRadius = circle.radius + distance;
  if (newRadius <= 0) return null;
  return createCircle(circle.cx, circle.cz, newRadius);
}

function offsetRect(rect: SketchRect, distance: number): SketchRect {
  const signX = rect.x2 > rect.x1 ? 1 : -1;
  const signZ = rect.z2 > rect.z1 ? 1 : -1;
  return createRect(
    rect.x1 - signX * distance,
    rect.z1 - signZ * distance,
    rect.x2 + signX * distance,
    rect.z2 + signZ * distance
  );
}

function offsetArc(arc: SketchArc, distance: number): SketchArc {
  // Approximate: compute arc center, then offset all 3 points radially
  const cx = (arc.x1 + arc.mx + arc.x2) / 3;
  const cz = (arc.z1 + arc.mz + arc.z2) / 3;

  function offsetPoint(px: number, pz: number): { x: number; z: number } {
    const dx = px - cx;
    const dz = pz - cz;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-10) return { x: px, z: pz };
    const scale = (dist + distance) / dist;
    return { x: cx + dx * scale, z: cz + dz * scale };
  }

  const p1 = offsetPoint(arc.x1, arc.z1);
  const pm = offsetPoint(arc.mx, arc.mz);
  const p2 = offsetPoint(arc.x2, arc.z2);

  return createArc(p1.x, p1.z, pm.x, pm.z, p2.x, p2.z);
}
