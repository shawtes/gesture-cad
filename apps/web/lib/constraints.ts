/** Constraint types and auto-detection for 2D sketch geometry. */

export type ConstraintType =
  | "horizontal"
  | "vertical"
  | "coincident"
  | "tangent"
  | "equal"
  | "parallel"
  | "perpendicular"
  | "symmetric"
  | "concentric"
  | "midpoint"
  | "distance"
  | "angle"
  | "radius"
  | "diameter";

export interface SketchConstraint {
  id: string;
  type: ConstraintType;
  entityIds: string[];
  /** For distance/angle constraints */
  value?: number;
}

let cCounter = 0;
function nextConstraintId(): string {
  return `c_${++cCounter}_${Date.now()}`;
}

// ─── Auto-detection thresholds ───
const ANGLE_THRESHOLD_DEG = 5; // degrees from axis to auto-apply H/V
const COINCIDENT_THRESHOLD = 0.15; // world units for point snapping

import type { SketchEntity, SketchLine } from "./sketch-entities";

/** Detect if a line is near-horizontal (within threshold of X-axis on XZ plane). */
export function detectHorizontal(line: SketchLine): SketchConstraint | null {
  const dz = Math.abs(line.z2 - line.z1);
  const dx = Math.abs(line.x2 - line.x1);
  if (dx < 0.01) return null; // too short or vertical
  const angleDeg = Math.atan2(dz, dx) * (180 / Math.PI);
  if (angleDeg < ANGLE_THRESHOLD_DEG) {
    return {
      id: nextConstraintId(),
      type: "horizontal",
      entityIds: [line.id],
    };
  }
  return null;
}

/** Detect if a line is near-vertical (within threshold of Z-axis on XZ plane). */
export function detectVertical(line: SketchLine): SketchConstraint | null {
  const dz = Math.abs(line.z2 - line.z1);
  const dx = Math.abs(line.x2 - line.x1);
  if (dz < 0.01) return null;
  const angleDeg = Math.atan2(dx, dz) * (180 / Math.PI);
  if (angleDeg < ANGLE_THRESHOLD_DEG) {
    return {
      id: nextConstraintId(),
      type: "vertical",
      entityIds: [line.id],
    };
  }
  return null;
}

/** Find coincident point pairs between a new entity and existing entities. */
export function detectCoincident(
  newEntity: SketchEntity,
  existingEntities: SketchEntity[]
): SketchConstraint[] {
  const constraints: SketchConstraint[] = [];
  const newPoints = getEntityEndpoints(newEntity);

  for (const existing of existingEntities) {
    if (existing.id === newEntity.id) continue;
    const existingPoints = getEntityEndpoints(existing);

    for (const np of newPoints) {
      for (const ep of existingPoints) {
        const dist = Math.hypot(np.x - ep.x, np.z - ep.z);
        if (dist < COINCIDENT_THRESHOLD && dist > 0.001) {
          constraints.push({
            id: nextConstraintId(),
            type: "coincident",
            entityIds: [newEntity.id, existing.id],
          });
          return constraints; // one coincident per entity pair is enough
        }
      }
    }
  }
  return constraints;
}

/** Extract endpoint coordinates from an entity. */
function getEntityEndpoints(
  entity: SketchEntity
): { x: number; z: number }[] {
  switch (entity.type) {
    case "point":
      return [{ x: entity.x, z: entity.z }];
    case "line":
      return [
        { x: entity.x1, z: entity.z1 },
        { x: entity.x2, z: entity.z2 },
      ];
    case "circle":
      return [{ x: entity.cx, z: entity.cz }];
    case "rect":
      return [
        { x: entity.x1, z: entity.z1 },
        { x: entity.x2, z: entity.z2 },
      ];
    case "arc":
      return [
        { x: entity.x1, z: entity.z1 },
        { x: entity.x2, z: entity.z2 },
      ];
    case "spline":
      if (entity.points.length >= 2) {
        return [
          { x: entity.points[0], z: entity.points[1] },
          { x: entity.points[entity.points.length - 2], z: entity.points[entity.points.length - 1] },
        ];
      }
      return [];
    case "ellipse":
      return [{ x: entity.cx, z: entity.cz }];
    default:
      return [];
  }
}

// ─── Manual constraint factories ───

/** Create a distance constraint between two entities */
export function createDistanceConstraint(entityId1: string, entityId2: string, value: number): SketchConstraint {
  return { id: nextConstraintId(), type: "distance", entityIds: [entityId1, entityId2], value };
}

/** Create an angle constraint between two lines */
export function createAngleConstraint(lineId1: string, lineId2: string, angleDeg: number): SketchConstraint {
  return { id: nextConstraintId(), type: "angle", entityIds: [lineId1, lineId2], value: angleDeg };
}

/** Create a radius constraint on a circle or arc */
export function createRadiusConstraint(entityId: string, radius: number): SketchConstraint {
  return { id: nextConstraintId(), type: "radius", entityIds: [entityId], value: radius };
}

/** Create a diameter constraint on a circle */
export function createDiameterConstraint(entityId: string, diameter: number): SketchConstraint {
  return { id: nextConstraintId(), type: "diameter", entityIds: [entityId], value: diameter };
}

/** Create a parallel constraint between two lines */
export function createParallelConstraint(lineId1: string, lineId2: string): SketchConstraint {
  return { id: nextConstraintId(), type: "parallel", entityIds: [lineId1, lineId2] };
}

/** Create a perpendicular constraint between two lines */
export function createPerpendicularConstraint(lineId1: string, lineId2: string): SketchConstraint {
  return { id: nextConstraintId(), type: "perpendicular", entityIds: [lineId1, lineId2] };
}

/** Create a symmetric constraint for two entities about an axis entity */
export function createSymmetricConstraint(entityId1: string, entityId2: string, axisId: string): SketchConstraint {
  return { id: nextConstraintId(), type: "symmetric", entityIds: [entityId1, entityId2, axisId] };
}

/** Create a concentric constraint between two circles/arcs */
export function createConcentricConstraint(entityId1: string, entityId2: string): SketchConstraint {
  return { id: nextConstraintId(), type: "concentric", entityIds: [entityId1, entityId2] };
}

/** Run all auto-detections on a newly created entity. */
export function autoDetectConstraints(
  newEntity: SketchEntity,
  allEntities: SketchEntity[]
): SketchConstraint[] {
  const constraints: SketchConstraint[] = [];

  // Line-specific constraints
  if (newEntity.type === "line") {
    const h = detectHorizontal(newEntity);
    if (h) constraints.push(h);
    const v = detectVertical(newEntity);
    if (v) constraints.push(v);
  }

  // Coincident detection for all entity types
  const coincidents = detectCoincident(newEntity, allEntities);
  constraints.push(...coincidents);

  return constraints;
}
