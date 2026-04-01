/** Constraint types and auto-detection for 2D sketch geometry. */

export type ConstraintType =
  | "horizontal"
  | "vertical"
  | "coincident"
  | "tangent"
  | "equal";

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
  }
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
