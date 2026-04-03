/**
 * Parametric Feature Replay Engine.
 *
 * When an upstream sketch or parameter changes, this engine replays
 * all downstream features in order to recompute their geometry.
 *
 * Feature tree order determines replay sequence:
 *   Sketch → Extrude → Fillet → Boolean → ...
 *
 * Each feature records its source entity IDs and params, so it can
 * be recomputed from scratch.
 */

import type { Feature, TessellatedMesh } from "../features";
import type { SketchEntity } from "../sketch-entities";
import { generateExtrudePreviewMesh, generateRevolvePreviewMesh } from "../features";

export interface ReplayContext {
  entities: SketchEntity[];
  features: Feature[];
}

export interface ReplayResult {
  features: Feature[];
  errors: { featureId: string; message: string }[];
}

/**
 * Replay all features from the given index onward.
 * Returns updated features with recomputed meshes.
 *
 * @param startIndex - Index in the feature array to start replaying from
 * @param context - Current entities and features
 */
export function replayFeatures(
  startIndex: number,
  context: ReplayContext
): ReplayResult {
  const features = [...context.features];
  const errors: { featureId: string; message: string }[] = [];

  for (let i = startIndex; i < features.length; i++) {
    const feature = features[i];
    const result = recomputeFeature(feature, context.entities, features.slice(0, i));

    if (result.error) {
      errors.push({ featureId: feature.id, message: result.error });
      features[i] = { ...feature, status: "error" };
    } else if (result.mesh) {
      features[i] = { ...feature, mesh: result.mesh, status: "ready" };
    }
  }

  return { features, errors };
}

/**
 * Find which features depend on a changed entity and need recomputation.
 */
export function findDependentFeatures(
  changedEntityId: string,
  features: Feature[]
): number {
  for (let i = 0; i < features.length; i++) {
    if (features[i].sourceEntityIds.includes(changedEntityId)) {
      return i; // Replay from this index onward
    }
  }
  return -1; // No features depend on this entity
}

/** Recompute a single feature's mesh from its params and source entities */
function recomputeFeature(
  feature: Feature,
  entities: SketchEntity[],
  priorFeatures: Feature[]
): { mesh: TessellatedMesh | null; error: string | null } {
  try {
    switch (feature.type) {
      case "extrude": {
        const params = feature.params as { distance: number; direction: string };
        const sourceEntity = entities.find((e) => feature.sourceEntityIds.includes(e.id));
        if (!sourceEntity) return { mesh: null, error: "Source entity not found" };

        if (sourceEntity.type === "rect") {
          const mesh = generateExtrudePreviewMesh(
            sourceEntity.x1, sourceEntity.z1,
            sourceEntity.x2, sourceEntity.z2,
            params.distance
          );
          return { mesh, error: null };
        }
        if (sourceEntity.type === "circle") {
          const mesh = generateRevolvePreviewMesh(
            sourceEntity.cx, sourceEntity.cz,
            sourceEntity.radius, params.distance
          );
          return { mesh, error: null };
        }
        return { mesh: null, error: `Cannot extrude ${sourceEntity.type}` };
      }

      case "revolve": {
        const params = feature.params as { angle: number; axis: string };
        const sourceEntity = entities.find((e) => feature.sourceEntityIds.includes(e.id));
        if (!sourceEntity || sourceEntity.type !== "circle") {
          return { mesh: null, error: "Revolve requires a circle entity" };
        }
        const height = params.angle / 360; // Approximate
        const mesh = generateRevolvePreviewMesh(
          sourceEntity.cx, sourceEntity.cz,
          sourceEntity.radius, height
        );
        return { mesh, error: null };
      }

      case "pocket": {
        // Pocket is like extrude but subtracts. For client preview, same as extrude.
        const params = feature.params as { depth: number };
        const sourceEntity = entities.find((e) => feature.sourceEntityIds.includes(e.id));
        if (!sourceEntity) return { mesh: null, error: "Source entity not found" };

        if (sourceEntity.type === "rect") {
          const mesh = generateExtrudePreviewMesh(
            sourceEntity.x1, sourceEntity.z1,
            sourceEntity.x2, sourceEntity.z2,
            -params.depth // Negative for pocket
          );
          return { mesh, error: null };
        }
        return { mesh: null, error: `Cannot pocket ${sourceEntity.type}` };
      }

      case "fillet":
      case "chamfer":
      case "shell":
        // These need B-Rep backend — keep existing mesh if available
        return { mesh: feature.mesh || null, error: null };

      case "boolean": {
        // Keep existing mesh — recompute requires Manifold worker (async)
        return { mesh: feature.mesh || null, error: null };
      }

      case "loft":
      case "sweep":
        // These need B-Rep backend
        return { mesh: feature.mesh || null, error: null };

      default:
        return { mesh: feature.mesh || null, error: null };
    }
  } catch (err: any) {
    return { mesh: null, error: err.message || "Recomputation failed" };
  }
}
