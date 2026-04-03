/**
 * Backend B-Rep Confirmation
 *
 * After creating a client-side preview mesh, this module async-calls the
 * Build123d backend to get the accurate B-Rep result, then updates the feature.
 *
 * Pattern: instant preview → async backend call → replace mesh when ready
 */

import type { Feature, TessellatedMesh } from "./features";
import {
  extrudeRect, extrudeCircle,
  filletEdges, chamferEdges, shellFace,
  draftFaces, createHole, createRib,
  splitBody, thickenSurface, createHelix,
  loftProfiles, sweepProfile,
} from "./api-client";

type FeatureUpdater = (id: string, updates: Partial<Feature>) => void;

/**
 * Send a feature to the backend for B-Rep confirmation.
 * On success, calls updateFeature with the accurate mesh.
 * On failure, keeps the preview mesh and marks status as "ready".
 */
export async function confirmWithBackend(
  feature: Feature,
  updateFeature: FeatureUpdater
): Promise<void> {
  try {
    updateFeature(feature.id, { status: "computing" });

    let result: { vertices: number[]; normals: number[]; indices: number[] } | null = null;

    switch (feature.type) {
      case "extrude": {
        // Client-side extrudeEntityToMesh already generates the correct shape
        // (cylinder, prism, etc). Skip backend — it only knows how to make boxes.
        // The preview mesh IS the final mesh for extrude.
        break;
      }

      case "fillet": {
        const p = feature.params as any;
        if (feature.mesh) {
          result = await filletEdges({
            mesh: { vertices: feature.mesh.vertices, normals: feature.mesh.normals, indices: feature.mesh.indices },
            edgeIndices: p.edgeIndices ?? [],
            radius: p.radius ?? 0.3,
          }).then((r) => ({ vertices: r.vertices, normals: r.normals, indices: r.indices }));
        }
        break;
      }

      case "chamfer": {
        const p = feature.params as any;
        if (feature.mesh) {
          result = await chamferEdges({
            mesh: { vertices: feature.mesh.vertices, normals: feature.mesh.normals, indices: feature.mesh.indices },
            edgeIndices: p.edgeIndices ?? [],
            distance: p.distance ?? 0.2,
          }).then((r) => ({ vertices: r.vertices, normals: r.normals, indices: r.indices }));
        }
        break;
      }

      case "shell": {
        const p = feature.params as any;
        if (feature.mesh) {
          result = await shellFace({
            mesh: { vertices: feature.mesh.vertices, normals: feature.mesh.normals, indices: feature.mesh.indices },
            faceIndex: p.faceIndex ?? 0,
            thickness: p.thickness ?? 0.2,
          }).then((r) => ({ vertices: r.vertices, normals: r.normals, indices: r.indices }));
        }
        break;
      }

      case "draft": {
        const p = feature.params as any;
        if (feature.mesh) {
          result = await draftFaces({
            mesh: { vertices: feature.mesh.vertices, normals: feature.mesh.normals, indices: feature.mesh.indices },
            faceIndices: p.faceIndices ?? [],
            angle: p.angle ?? 5,
            pullDirection: p.pullDirection ?? [0, 1, 0],
          }).then((r) => ({ vertices: r.vertices, normals: r.normals, indices: r.indices }));
        }
        break;
      }

      case "hole": {
        const p = feature.params as any;
        if (feature.mesh) {
          result = await createHole({
            mesh: { vertices: feature.mesh.vertices, normals: feature.mesh.normals, indices: feature.mesh.indices },
            center: p.center ?? [0, 0, 0],
            diameter: p.diameter ?? 0.5,
            depth: p.depth ?? 2,
            holeType: p.holeType ?? "simple",
            cboreDiameter: p.cboreDiameter,
            cboreDepth: p.cboreDepth,
            csinkAngle: p.csinkAngle,
          }).then((r) => ({ vertices: r.vertices, normals: r.normals, indices: r.indices }));
        }
        break;
      }

      case "rib": {
        const p = feature.params as any;
        if (feature.mesh) {
          result = await createRib({
            mesh: { vertices: feature.mesh.vertices, normals: feature.mesh.normals, indices: feature.mesh.indices },
            profilePoints: [],
            thickness: p.thickness ?? 0.2,
            direction: p.direction ?? "parallel",
          }).then((r) => ({ vertices: r.vertices, normals: r.normals, indices: r.indices }));
        }
        break;
      }

      case "split": {
        const p = feature.params as any;
        if (feature.mesh) {
          const normal = Array.isArray(p.splitReference) ? p.splitReference : [0, 1, 0];
          result = await splitBody({
            mesh: { vertices: feature.mesh.vertices, normals: feature.mesh.normals, indices: feature.mesh.indices },
            planeNormal: normal,
            planeOffset: p.offset ?? 0,
            keepSide: p.keepSide ?? "above",
          }).then((r) => ({ vertices: r.vertices, normals: r.normals, indices: r.indices }));
        }
        break;
      }

      case "thicken": {
        const p = feature.params as any;
        if (feature.mesh) {
          result = await thickenSurface({
            mesh: { vertices: feature.mesh.vertices, normals: feature.mesh.normals, indices: feature.mesh.indices },
            thickness: p.thickness ?? 0.3,
            direction: p.direction ?? "outward",
          }).then((r) => ({ vertices: r.vertices, normals: r.normals, indices: r.indices }));
        }
        break;
      }

      case "helix": {
        const p = feature.params as any;
        result = await createHelix({
          center: p.center ?? [0, 0, 0],
          radius: p.radius ?? 1,
          pitch: p.pitch ?? 0.5,
          height: p.height ?? 3,
          taperAngle: p.taperAngle ?? 0,
          clockwise: p.clockwise ?? false,
        }).then((r) => ({ vertices: r.vertices, normals: r.normals, indices: r.indices }));
        break;
      }

      default:
        // No backend handler for this feature type — keep preview
        break;
    }

    if (result && result.vertices.length > 0) {
      updateFeature(feature.id, {
        mesh: result as TessellatedMesh,
        status: "ready",
      });
    } else {
      // Backend returned empty or no handler — keep preview mesh
      updateFeature(feature.id, { status: "ready" });
    }
  } catch (err) {
    // Backend unavailable — keep preview mesh, mark as ready (graceful degradation)
    console.warn(`Backend confirmation failed for ${feature.type}:`, err);
    updateFeature(feature.id, { status: "ready" });
  }
}

/**
 * Fire-and-forget backend confirmation.
 * Returns immediately — the feature mesh updates asynchronously.
 */
export function confirmInBackground(
  feature: Feature,
  updateFeature: FeatureUpdater
): void {
  confirmWithBackend(feature, updateFeature).catch(() => {
    // Already handled in confirmWithBackend
  });
}
