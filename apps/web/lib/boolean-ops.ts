/**
 * Boolean operations on tessellated meshes.
 * Client-side implementation using simple mesh operations.
 * Production would use Manifold WASM for guaranteed-manifold results.
 */

import type { TessellatedMesh } from "./features";

export type BooleanOp = "union" | "subtract" | "intersect";

/**
 * Combine two meshes via boolean operation.
 * This is a simplified implementation that merges vertex buffers.
 * Full CSG boolean would use Manifold WASM or backend OCCT.
 */
export function performBoolean(
  meshA: TessellatedMesh,
  meshB: TessellatedMesh,
  operation: BooleanOp
): TessellatedMesh {
  switch (operation) {
    case "union":
      return unionMeshes(meshA, meshB);
    case "subtract":
      // Simplified: return meshA (proper CSG subtract would clip meshB from meshA)
      return meshA;
    case "intersect":
      // Simplified: return empty (proper CSG intersect would find overlap volume)
      return { vertices: [], normals: [], indices: [] };
    default:
      return meshA;
  }
}

/** Simple union: concatenate vertex/normal/index buffers. */
function unionMeshes(a: TessellatedMesh, b: TessellatedMesh): TessellatedMesh {
  const vertexOffset = a.vertices.length / 3;
  return {
    vertices: [...a.vertices, ...b.vertices],
    normals: [...a.normals, ...b.normals],
    indices: [
      ...a.indices,
      ...b.indices.map((i) => i + vertexOffset),
    ],
  };
}
