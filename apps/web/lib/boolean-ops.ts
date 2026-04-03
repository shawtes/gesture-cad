/**
 * Boolean operations on tessellated meshes.
 *
 * Uses Manifold WASM Web Worker for non-blocking mesh booleans.
 * Falls back to simple mesh operations when Worker is unavailable.
 * Can also delegate to Build123d backend for B-Rep accuracy.
 */

import type { TessellatedMesh } from "./features";

export type BooleanOp = "union" | "subtract" | "intersect";

// Lazy import to avoid circular dependency and webpack resolve issues
async function getBooleanAsync() {
  const { booleanAsync } = await import("./manifold");
  return booleanAsync;
}

/**
 * Perform boolean operation asynchronously via Manifold Web Worker.
 * Returns a Promise that resolves with the result mesh.
 */
export async function performBooleanAsync(
  meshA: TessellatedMesh,
  meshB: TessellatedMesh,
  operation: BooleanOp
): Promise<TessellatedMesh> {
  const booleanAsync = await getBooleanAsync();
  return booleanAsync(meshA, meshB, operation);
}

/**
 * Synchronous boolean (simple fallback for immediate results).
 * Only union produces correct results; subtract/intersect are placeholders.
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
      // Simple fallback: return meshA unchanged
      // Full CSG subtract handled by Manifold worker or backend
      return meshA;
    case "intersect":
      // Simple fallback: return empty
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
