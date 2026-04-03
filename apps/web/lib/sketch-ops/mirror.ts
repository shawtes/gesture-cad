/**
 * Mirror operation: reflect sketch entities across an axis or line.
 */

import type { SketchEntity } from "../sketch-entities";
import {
  createPoint,
  createLine,
  createCircle,
  createRect,
  createArc,
  createSpline,
  createEllipse,
} from "../sketch-entities";

export type MirrorAxis = "x" | "z" | "custom";

export interface MirrorConfig {
  axis: MirrorAxis;
  /** For custom axis: line defined by two points */
  lineStart?: { x: number; z: number };
  lineEnd?: { x: number; z: number };
}

/**
 * Mirror a sketch entity across the given axis.
 * Returns a new entity (the mirrored copy).
 */
export function mirrorEntity(entity: SketchEntity, config: MirrorConfig): SketchEntity {
  const reflect = (px: number, pz: number) => reflectPoint(px, pz, config);

  switch (entity.type) {
    case "point": {
      const m = reflect(entity.x, entity.z);
      return createPoint(m.x, m.z);
    }
    case "line": {
      const m1 = reflect(entity.x1, entity.z1);
      const m2 = reflect(entity.x2, entity.z2);
      return createLine(m1.x, m1.z, m2.x, m2.z);
    }
    case "circle": {
      const mc = reflect(entity.cx, entity.cz);
      return createCircle(mc.x, mc.z, entity.radius);
    }
    case "rect": {
      const m1 = reflect(entity.x1, entity.z1);
      const m2 = reflect(entity.x2, entity.z2);
      return createRect(m1.x, m1.z, m2.x, m2.z);
    }
    case "arc": {
      const m1 = reflect(entity.x1, entity.z1);
      const mm = reflect(entity.mx, entity.mz);
      const m2 = reflect(entity.x2, entity.z2);
      // Reverse order to maintain arc direction after mirror
      return createArc(m2.x, m2.z, mm.x, mm.z, m1.x, m1.z);
    }
    case "spline": {
      const mirrored: number[] = [];
      for (let i = 0; i < entity.points.length; i += 2) {
        const m = reflect(entity.points[i], entity.points[i + 1]);
        mirrored.push(m.x, m.z);
      }
      return createSpline(mirrored);
    }
    case "ellipse": {
      const mc = reflect(entity.cx, entity.cz);
      // Mirror flips the rotation angle
      const mirroredRotation = config.axis === "x" ? -entity.rotation
        : config.axis === "z" ? Math.PI - entity.rotation
        : -entity.rotation; // Approximate for custom axis
      return createEllipse(mc.x, mc.z, entity.radiusX, entity.radiusZ, mirroredRotation);
    }
    default:
      return entity;
  }
}

/**
 * Mirror multiple entities across an axis.
 * Returns the mirrored copies (originals are kept).
 */
export function mirrorEntities(entities: SketchEntity[], config: MirrorConfig): SketchEntity[] {
  return entities.map((e) => mirrorEntity(e, config));
}

/** Reflect a point across the configured axis */
function reflectPoint(px: number, pz: number, config: MirrorConfig): { x: number; z: number } {
  switch (config.axis) {
    case "x":
      // Mirror across X axis (z = 0)
      return { x: px, z: -pz };
    case "z":
      // Mirror across Z axis (x = 0)
      return { x: -px, z: pz };
    case "custom": {
      if (!config.lineStart || !config.lineEnd) return { x: px, z: pz };
      return reflectAcrossLine(px, pz, config.lineStart, config.lineEnd);
    }
  }
}

/** Reflect a point across an arbitrary line defined by two points */
function reflectAcrossLine(
  px: number, pz: number,
  a: { x: number; z: number },
  b: { x: number; z: number }
): { x: number; z: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-10) return { x: px, z: pz };

  // Project point onto line
  const t = ((px - a.x) * dx + (pz - a.z) * dz) / lenSq;
  const projX = a.x + t * dx;
  const projZ = a.z + t * dz;

  // Reflect: mirror = 2 * projection - original
  return {
    x: 2 * projX - px,
    z: 2 * projZ - pz,
  };
}
