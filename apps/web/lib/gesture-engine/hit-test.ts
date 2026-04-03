/**
 * Hit testing for entity and feature picking.
 * Projects screen coordinates to 3D and tests against sketch entities and mesh features.
 */

import type { HitTarget } from "./types";
import type { SketchEntity } from "../sketch-entities";
import type { Feature } from "../features";
import type { SketchPlaneId } from "../store";

/** Distance threshold for picking sketch entities (in sketch-plane units) */
const POINT_PICK_RADIUS = 0.2;
const LINE_PICK_DISTANCE = 0.15;
const ENDPOINT_PICK_RADIUS = 0.12;

export interface HitTestContext {
  entities: SketchEntity[];
  features: Feature[];
  sketchPlane: SketchPlaneId;
}

/**
 * Test if a 2D sketch point is near a given sketch position.
 * Returns the closest hit target or null.
 */
export function hitTestSketchEntities(
  sketchPos: { x: number; z: number },
  context: HitTestContext
): HitTarget | null {
  let bestHit: HitTarget | null = null;
  let bestDistance = Infinity;

  for (const entity of context.entities) {
    const hit = hitTestEntity(sketchPos, entity, context.sketchPlane);
    if (hit && hit.distance < bestDistance) {
      bestDistance = hit.distance;
      bestHit = hit;
    }
  }

  return bestHit;
}

function hitTestEntity(
  pos: { x: number; z: number },
  entity: SketchEntity,
  plane: SketchPlaneId
): HitTarget | null {
  const toWorld = (x: number, z: number) => sketchToWorld(x, z, plane);

  switch (entity.type) {
    case "point": {
      const d = Math.hypot(pos.x - entity.x, pos.z - entity.z);
      if (d < POINT_PICK_RADIUS) {
        return {
          type: "entity",
          entityId: entity.id,
          worldPosition: toWorld(entity.x, entity.z),
          distance: d,
        };
      }
      return null;
    }

    case "line": {
      // Check endpoints first (higher priority)
      const d1 = Math.hypot(pos.x - entity.x1, pos.z - entity.z1);
      const d2 = Math.hypot(pos.x - entity.x2, pos.z - entity.z2);

      if (d1 < ENDPOINT_PICK_RADIUS) {
        return {
          type: "entity_endpoint",
          entityId: entity.id,
          worldPosition: toWorld(entity.x1, entity.z1),
          distance: d1,
        };
      }
      if (d2 < ENDPOINT_PICK_RADIUS) {
        return {
          type: "entity_endpoint",
          entityId: entity.id,
          worldPosition: toWorld(entity.x2, entity.z2),
          distance: d2,
        };
      }

      // Check line body
      const lineDist = pointToLineDistance(
        pos.x, pos.z,
        entity.x1, entity.z1,
        entity.x2, entity.z2
      );
      if (lineDist < LINE_PICK_DISTANCE) {
        return {
          type: "entity_edge",
          entityId: entity.id,
          worldPosition: toWorld(pos.x, pos.z),
          distance: lineDist,
        };
      }
      return null;
    }

    case "circle": {
      const distFromCenter = Math.hypot(pos.x - entity.cx, pos.z - entity.cz);
      const distFromRing = Math.abs(distFromCenter - entity.radius);
      if (distFromRing < LINE_PICK_DISTANCE) {
        return {
          type: "entity_edge",
          entityId: entity.id,
          worldPosition: toWorld(pos.x, pos.z),
          distance: distFromRing,
        };
      }
      // Also pick center point
      if (distFromCenter < ENDPOINT_PICK_RADIUS) {
        return {
          type: "entity_endpoint",
          entityId: entity.id,
          worldPosition: toWorld(entity.cx, entity.cz),
          distance: distFromCenter,
        };
      }
      return null;
    }

    case "rect": {
      // Check all 4 corners
      const corners = [
        { x: entity.x1, z: entity.z1 },
        { x: entity.x2, z: entity.z1 },
        { x: entity.x2, z: entity.z2 },
        { x: entity.x1, z: entity.z2 },
      ];
      for (const c of corners) {
        const d = Math.hypot(pos.x - c.x, pos.z - c.z);
        if (d < ENDPOINT_PICK_RADIUS) {
          return {
            type: "entity_endpoint",
            entityId: entity.id,
            worldPosition: toWorld(c.x, c.z),
            distance: d,
          };
        }
      }

      // Check 4 edges
      const edges = [
        [entity.x1, entity.z1, entity.x2, entity.z1],
        [entity.x2, entity.z1, entity.x2, entity.z2],
        [entity.x2, entity.z2, entity.x1, entity.z2],
        [entity.x1, entity.z2, entity.x1, entity.z1],
      ];
      for (const [x1, z1, x2, z2] of edges) {
        const d = pointToLineDistance(pos.x, pos.z, x1, z1, x2, z2);
        if (d < LINE_PICK_DISTANCE) {
          return {
            type: "entity_edge",
            entityId: entity.id,
            worldPosition: toWorld(pos.x, pos.z),
            distance: d,
          };
        }
      }
      return null;
    }

    case "arc": {
      // Check endpoints
      const d1 = Math.hypot(pos.x - entity.x1, pos.z - entity.z1);
      const d2 = Math.hypot(pos.x - entity.x2, pos.z - entity.z2);
      if (d1 < ENDPOINT_PICK_RADIUS) {
        return {
          type: "entity_endpoint",
          entityId: entity.id,
          worldPosition: toWorld(entity.x1, entity.z1),
          distance: d1,
        };
      }
      if (d2 < ENDPOINT_PICK_RADIUS) {
        return {
          type: "entity_endpoint",
          entityId: entity.id,
          worldPosition: toWorld(entity.x2, entity.z2),
          distance: d2,
        };
      }
      // Approximate arc hit with midpoint distance
      const dm = Math.hypot(pos.x - entity.mx, pos.z - entity.mz);
      if (dm < LINE_PICK_DISTANCE) {
        return {
          type: "entity_edge",
          entityId: entity.id,
          worldPosition: toWorld(pos.x, pos.z),
          distance: dm,
        };
      }
      return null;
    }

    case "spline": {
      // Check control points
      for (let i = 0; i < entity.points.length; i += 2) {
        const sx = entity.points[i];
        const sz = entity.points[i + 1];
        const d = Math.hypot(pos.x - sx, pos.z - sz);
        if (d < ENDPOINT_PICK_RADIUS) {
          return {
            type: "entity_endpoint",
            entityId: entity.id,
            worldPosition: toWorld(sx, sz),
            distance: d,
          };
        }
      }
      return null;
    }

    case "ellipse": {
      // Check center
      const distFromCenter = Math.hypot(pos.x - entity.cx, pos.z - entity.cz);
      if (distFromCenter < ENDPOINT_PICK_RADIUS) {
        return {
          type: "entity_endpoint",
          entityId: entity.id,
          worldPosition: toWorld(entity.cx, entity.cz),
          distance: distFromCenter,
        };
      }
      // Approximate ellipse ring distance
      const cos = Math.cos(-entity.rotation);
      const sin = Math.sin(-entity.rotation);
      const lx = (pos.x - entity.cx) * cos - (pos.z - entity.cz) * sin;
      const lz = (pos.x - entity.cx) * sin + (pos.z - entity.cz) * cos;
      const normalized = (lx / entity.radiusX) ** 2 + (lz / entity.radiusZ) ** 2;
      const distFromRing = Math.abs(Math.sqrt(normalized) - 1) * Math.max(entity.radiusX, entity.radiusZ);
      if (distFromRing < LINE_PICK_DISTANCE) {
        return {
          type: "entity_edge",
          entityId: entity.id,
          worldPosition: toWorld(pos.x, pos.z),
          distance: distFromRing,
        };
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Test if a screen position hits any 3D mesh feature.
 * Uses bounding box approximation for performance.
 */
export function hitTestFeatures(
  sketchPos: { x: number; z: number },
  features: Feature[],
  plane: SketchPlaneId
): HitTarget | null {
  for (const feature of features) {
    if (!feature.visible || !feature.mesh || feature.mesh.vertices.length === 0) continue;

    const verts = feature.mesh.vertices;
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    // Compute bounding box projected to sketch plane
    for (let i = 0; i < verts.length; i += 3) {
      const projected = worldToSketch(verts[i], verts[i + 1], verts[i + 2], plane);
      minX = Math.min(minX, projected.x);
      maxX = Math.max(maxX, projected.x);
      minZ = Math.min(minZ, projected.z);
      maxZ = Math.max(maxZ, projected.z);
    }

    // Expand bbox slightly for picking tolerance
    const pad = 0.1;
    if (
      sketchPos.x >= minX - pad && sketchPos.x <= maxX + pad &&
      sketchPos.z >= minZ - pad && sketchPos.z <= maxZ + pad
    ) {
      return {
        type: "feature_face",
        featureId: feature.id,
        worldPosition: sketchToWorld(sketchPos.x, sketchPos.z, plane),
        distance: 0,
      };
    }
  }

  return null;
}

/** Point-to-line-segment distance in 2D */
function pointToLineDistance(
  px: number, pz: number,
  x1: number, z1: number,
  x2: number, z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lengthSq = dx * dx + dz * dz;

  if (lengthSq === 0) return Math.hypot(px - x1, pz - z1);

  let t = ((px - x1) * dx + (pz - z1) * dz) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

/** Convert sketch coordinates to 3D world position based on active plane */
function sketchToWorld(x: number, z: number, plane: SketchPlaneId): { x: number; y: number; z: number } {
  switch (plane) {
    case "xz": return { x, y: 0, z };
    case "xy": return { x, y: z, z: 0 };
    case "yz": return { x: 0, y: z, z: x };
    default: return { x, y: 0, z };
  }
}

/** Convert 3D world position to sketch coordinates based on active plane */
function worldToSketch(wx: number, wy: number, wz: number, plane: SketchPlaneId): { x: number; z: number } {
  switch (plane) {
    case "xz": return { x: wx, z: wz };
    case "xy": return { x: wx, z: wy };
    case "yz": return { x: wz, z: wy };
    default: return { x: wx, z: wz };
  }
}
