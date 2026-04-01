/** File import/export for CAD models (STL, OBJ, glTF). */

import type { TessellatedMesh } from "./features";

// ─── STL Import ───

/** Parse an STL file (binary or ASCII) into a TessellatedMesh. */
export async function parseSTL(buffer: ArrayBuffer): Promise<TessellatedMesh> {
  const view = new DataView(buffer);
  // Check if binary STL: binary starts with 80-byte header + 4-byte triangle count
  // ASCII starts with "solid"
  const header = new Uint8Array(buffer, 0, 5);
  const isAscii = String.fromCharCode(...header) === "solid";

  if (isAscii) {
    return parseSTLAscii(buffer);
  }
  return parseSTLBinary(buffer);
}

function parseSTLBinary(buffer: ArrayBuffer): TessellatedMesh {
  const view = new DataView(buffer);
  const numTriangles = view.getUint32(80, true);
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  let offset = 84;
  for (let i = 0; i < numTriangles; i++) {
    const nx = view.getFloat32(offset, true); offset += 4;
    const ny = view.getFloat32(offset, true); offset += 4;
    const nz = view.getFloat32(offset, true); offset += 4;

    for (let v = 0; v < 3; v++) {
      const x = view.getFloat32(offset, true); offset += 4;
      const y = view.getFloat32(offset, true); offset += 4;
      const z = view.getFloat32(offset, true); offset += 4;
      vertices.push(x, y, z);
      normals.push(nx, ny, nz);
      indices.push(i * 3 + v);
    }
    offset += 2; // attribute byte count
  }

  return { vertices, normals, indices };
}

function parseSTLAscii(buffer: ArrayBuffer): TessellatedMesh {
  const text = new TextDecoder().decode(buffer);
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let idx = 0;

  const lines = text.split("\n");
  let currentNormal = [0, 0, 0];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("facet normal")) {
      const parts = trimmed.split(/\s+/);
      currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
    } else if (trimmed.startsWith("vertex")) {
      const parts = trimmed.split(/\s+/);
      vertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
      normals.push(...currentNormal);
      indices.push(idx++);
    }
  }

  return { vertices, normals, indices };
}

// ─── STL Export ───

/** Export a TessellatedMesh as binary STL. */
export function exportSTLBinary(mesh: TessellatedMesh, name: string = "model"): ArrayBuffer {
  const numTriangles = mesh.indices.length / 3;
  const bufferSize = 84 + numTriangles * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // 80-byte header
  const header = `GestureCAD Export: ${name}`.padEnd(80, "\0");
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, header.charCodeAt(i));
  }
  view.setUint32(80, numTriangles, true);

  let offset = 84;
  for (let t = 0; t < numTriangles; t++) {
    const i0 = mesh.indices[t * 3];
    const i1 = mesh.indices[t * 3 + 1];
    const i2 = mesh.indices[t * 3 + 2];

    // Normal (from first vertex normal or compute)
    const nx = mesh.normals[i0 * 3] || 0;
    const ny = mesh.normals[i0 * 3 + 1] || 0;
    const nz = mesh.normals[i0 * 3 + 2] || 0;

    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    for (const idx of [i0, i1, i2]) {
      view.setFloat32(offset, mesh.vertices[idx * 3], true); offset += 4;
      view.setFloat32(offset, mesh.vertices[idx * 3 + 1], true); offset += 4;
      view.setFloat32(offset, mesh.vertices[idx * 3 + 2], true); offset += 4;
    }
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}

// ─── OBJ Export ───

export function exportOBJ(mesh: TessellatedMesh): string {
  let obj = "# GestureCAD Export\n";
  const vCount = mesh.vertices.length / 3;
  for (let i = 0; i < vCount; i++) {
    obj += `v ${mesh.vertices[i * 3]} ${mesh.vertices[i * 3 + 1]} ${mesh.vertices[i * 3 + 2]}\n`;
  }
  for (let i = 0; i < vCount; i++) {
    obj += `vn ${mesh.normals[i * 3]} ${mesh.normals[i * 3 + 1]} ${mesh.normals[i * 3 + 2]}\n`;
  }
  const triCount = mesh.indices.length / 3;
  for (let t = 0; t < triCount; t++) {
    const a = mesh.indices[t * 3] + 1;
    const b = mesh.indices[t * 3 + 1] + 1;
    const c = mesh.indices[t * 3 + 2] + 1;
    obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
  }
  return obj;
}

// ─── File Detection ───

export type ImportFileType = "stl" | "obj" | "step" | "unknown";

export function detectFileType(filename: string): ImportFileType {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "stl": return "stl";
    case "obj": return "obj";
    case "step": case "stp": return "step";
    default: return "unknown";
  }
}

// ─── Download Helper ───

export function downloadBlob(data: ArrayBuffer | string, filename: string, mimeType: string) {
  const blob = data instanceof ArrayBuffer
    ? new Blob([data], { type: mimeType })
    : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
