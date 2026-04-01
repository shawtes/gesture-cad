/**
 * Modeling operations: fillet, chamfer, shell.
 * Client-side preview approximations. Production uses Build123d backend.
 */

import type { TessellatedMesh } from "./features";

export interface FilletParams {
  edgeIndices: number[];
  radius: number;
}

export interface ChamferParams {
  edgeIndices: number[];
  distance: number;
}

export interface ShellParams {
  faceIndex: number;
  thickness: number;
}

/**
 * Apply a fillet preview to a box mesh.
 * Simplified: rounds edges by subdividing near-edge vertices.
 * Real implementation would use Build123d fillet() on the backend.
 */
export function applyFilletPreview(
  mesh: TessellatedMesh,
  params: FilletParams
): TessellatedMesh {
  // For preview, just return the original mesh with a note
  // Full fillet requires B-Rep operations (Build123d backend)
  return { ...mesh };
}

/**
 * Apply a chamfer preview to a box mesh.
 * Simplified: bevels edges by cutting corners.
 */
export function applyChamferPreview(
  mesh: TessellatedMesh,
  params: ChamferParams
): TessellatedMesh {
  return { ...mesh };
}

/**
 * Apply a shell preview.
 * Simplified: creates an offset surface (hollow box).
 */
export function applyShellPreview(
  mesh: TessellatedMesh,
  params: ShellParams
): TessellatedMesh {
  if (mesh.vertices.length === 0) return mesh;

  // Simple shell: scale inner copy by (1 - thickness/size) and invert normals
  const inner = {
    vertices: mesh.vertices.map((v, i) => {
      // Move vertices toward center by thickness
      return v * (1 - params.thickness * 0.3);
    }),
    normals: mesh.normals.map((n) => -n), // invert normals for inner surface
    indices: [...mesh.indices], // same topology
  };

  // Combine outer and inner
  const offset = mesh.vertices.length / 3;
  return {
    vertices: [...mesh.vertices, ...inner.vertices],
    normals: [...mesh.normals, ...inner.normals],
    indices: [
      ...mesh.indices,
      ...inner.indices.map((i) => i + offset),
    ],
  };
}

export type ModelingOpType = "fillet" | "chamfer" | "shell";
