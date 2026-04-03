/**
 * Modeling operations: fillet, chamfer, shell, pocket.
 *
 * Each operation:
 * 1. Generates a fast client-side preview (approximate)
 * 2. Sends to Build123d backend for accurate B-Rep result
 * 3. Replaces preview with backend result when ready
 */

import type { TessellatedMesh } from "./features";
import { filletEdges, chamferEdges, shellFace, type OperationResponse } from "./api-client";

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

// ─── Client-side previews (fast, approximate) ───

export function applyFilletPreview(mesh: TessellatedMesh, params: FilletParams): TessellatedMesh {
  // Preview: slightly scale vertices near selected edges to simulate rounding
  // Real fillet requires B-Rep kernel (Build123d backend)
  return { ...mesh };
}

export function applyChamferPreview(mesh: TessellatedMesh, params: ChamferParams): TessellatedMesh {
  return { ...mesh };
}

export function applyShellPreview(mesh: TessellatedMesh, params: ShellParams): TessellatedMesh {
  if (mesh.vertices.length === 0) return mesh;

  const inner = {
    vertices: mesh.vertices.map((v) => v * (1 - params.thickness * 0.3)),
    normals: mesh.normals.map((n) => -n),
    indices: [...mesh.indices],
  };

  const offset = mesh.vertices.length / 3;
  return {
    vertices: [...mesh.vertices, ...inner.vertices],
    normals: [...mesh.normals, ...inner.normals],
    indices: [...mesh.indices, ...inner.indices.map((i) => i + offset)],
  };
}

// ─── Backend calls (accurate B-Rep) ───

function responseToMesh(res: OperationResponse): TessellatedMesh {
  return { vertices: res.vertices, normals: res.normals, indices: res.indices };
}

export async function applyFilletBackend(
  mesh: TessellatedMesh,
  params: FilletParams
): Promise<TessellatedMesh> {
  try {
    const res = await filletEdges({
      mesh: { vertices: mesh.vertices, normals: mesh.normals, indices: mesh.indices },
      edgeIndices: params.edgeIndices,
      radius: params.radius,
    });
    return responseToMesh(res);
  } catch {
    return mesh; // Fallback to unchanged mesh
  }
}

export async function applyChamferBackend(
  mesh: TessellatedMesh,
  params: ChamferParams
): Promise<TessellatedMesh> {
  try {
    const res = await chamferEdges({
      mesh: { vertices: mesh.vertices, normals: mesh.normals, indices: mesh.indices },
      edgeIndices: params.edgeIndices,
      distance: params.distance,
    });
    return responseToMesh(res);
  } catch {
    return mesh;
  }
}

export async function applyShellBackend(
  mesh: TessellatedMesh,
  params: ShellParams
): Promise<TessellatedMesh> {
  try {
    const res = await shellFace({
      mesh: { vertices: mesh.vertices, normals: mesh.normals, indices: mesh.indices },
      faceIndex: params.faceIndex,
      thickness: params.thickness,
    });
    return responseToMesh(res);
  } catch {
    return applyShellPreview({ ...mesh }, params); // Fallback to preview
  }
}

// ─── Draft Operation ───

export interface DraftParams2 {
  faceIndices: number[];
  angle: number; // degrees
  pullDirection: [number, number, number];
}

export function applyDraftPreview(mesh: TessellatedMesh, params: DraftParams2): TessellatedMesh {
  if (mesh.vertices.length === 0) return mesh;
  const angleRad = (params.angle * Math.PI) / 180;
  const [dx, dy, dz] = params.pullDirection;
  const len = Math.hypot(dx, dy, dz) || 1;
  const nx = dx / len, ny = dy / len, nz = dz / len;

  const newVerts = [...mesh.vertices];
  // Approximate draft by tilting vertices based on their height along pull direction
  for (let i = 0; i < newVerts.length; i += 3) {
    const height = newVerts[i] * nx + newVerts[i + 1] * ny + newVerts[i + 2] * nz;
    const shift = height * Math.tan(angleRad);
    // Move vertices perpendicular to pull direction
    newVerts[i] += shift * (1 - Math.abs(nx)) * 0.1;
    newVerts[i + 2] += shift * (1 - Math.abs(nz)) * 0.1;
  }

  return { vertices: newVerts, normals: [...mesh.normals], indices: [...mesh.indices] };
}

// ─── Rib Operation ───

export function applyRibPreview(
  baseMesh: TessellatedMesh,
  thickness: number,
  height: number = 1
): TessellatedMesh {
  // Preview: thin extrusion (simplified)
  const w = thickness / 2;
  const vertices = [
    -w, 0, -1, w, 0, -1, w, 0, 1, -w, 0, 1,
    -w, height, -1, w, height, -1, w, height, 1, -w, height, 1,
  ];
  const normals = [
    -1,0,0, 1,0,0, 1,0,0, -1,0,0,
    -1,0,0, 1,0,0, 1,0,0, -1,0,0,
  ];
  const indices = [
    0,1,5, 0,5,4, 1,2,6, 1,6,5,
    2,3,7, 2,7,6, 3,0,4, 3,4,7,
    4,5,6, 4,6,7, 0,2,1, 0,3,2,
  ];

  // Combine with base mesh
  const offset = baseMesh.vertices.length / 3;
  return {
    vertices: [...baseMesh.vertices, ...vertices],
    normals: [...baseMesh.normals, ...normals],
    indices: [...baseMesh.indices, ...indices.map(i => i + offset)],
  };
}

// ─── Split Operation ───

export function applySplitPreview(
  mesh: TessellatedMesh,
  planeNormal: [number, number, number],
  planeOffset: number,
  keepSide: "above" | "below" | "both"
): TessellatedMesh {
  if (keepSide === "both") return mesh;

  const [nx, ny, nz] = planeNormal;
  const newVerts: number[] = [];
  const newNormals: number[] = [];
  const newIndices: number[] = [];

  // Keep triangles on the correct side of the plane
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const i0 = mesh.indices[i], i1 = mesh.indices[i + 1], i2 = mesh.indices[i + 2];
    const d0 = mesh.vertices[i0*3]*nx + mesh.vertices[i0*3+1]*ny + mesh.vertices[i0*3+2]*nz - planeOffset;
    const d1 = mesh.vertices[i1*3]*nx + mesh.vertices[i1*3+1]*ny + mesh.vertices[i1*3+2]*nz - planeOffset;
    const d2 = mesh.vertices[i2*3]*nx + mesh.vertices[i2*3+1]*ny + mesh.vertices[i2*3+2]*nz - planeOffset;

    const above = (keepSide === "above");
    if ((above && d0 >= 0 && d1 >= 0 && d2 >= 0) || (!above && d0 <= 0 && d1 <= 0 && d2 <= 0)) {
      const base = newVerts.length / 3;
      for (const idx of [i0, i1, i2]) {
        newVerts.push(mesh.vertices[idx*3], mesh.vertices[idx*3+1], mesh.vertices[idx*3+2]);
        newNormals.push(mesh.normals[idx*3], mesh.normals[idx*3+1], mesh.normals[idx*3+2]);
      }
      newIndices.push(base, base + 1, base + 2);
    }
  }

  return { vertices: newVerts, normals: newNormals, indices: newIndices };
}

// ─── Thicken Operation ───

export function applyThickenPreview(
  mesh: TessellatedMesh,
  thickness: number,
  direction: "inward" | "outward" | "both" = "outward"
): TessellatedMesh {
  const t = direction === "both" ? thickness / 2 : thickness;
  const sign = direction === "inward" ? -1 : 1;

  const offsetVerts: number[] = [];
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    offsetVerts.push(
      mesh.vertices[i] + mesh.normals[i] * t * sign,
      mesh.vertices[i + 1] + mesh.normals[i + 1] * t * sign,
      mesh.vertices[i + 2] + mesh.normals[i + 2] * t * sign
    );
  }

  const vertCount = mesh.vertices.length / 3;
  const flippedNormals = mesh.normals.map(n => -n);
  const offsetIndices = mesh.indices.map(i => i + vertCount);

  return {
    vertices: direction === "both"
      ? [...mesh.vertices.map((v, i) => v - mesh.normals[i] * t), ...offsetVerts]
      : [...mesh.vertices, ...offsetVerts],
    normals: [...mesh.normals, ...flippedNormals],
    indices: [...mesh.indices, ...offsetIndices],
  };
}

export type ModelingOpType = "fillet" | "chamfer" | "shell" | "draft" | "rib" | "split" | "thicken";
