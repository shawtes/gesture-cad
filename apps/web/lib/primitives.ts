/**
 * 3D Primitive shape generators — equivalent to FreeCAD Part workbench.
 * Generates TessellatedMesh data for Box, Cylinder, Sphere, Cone, Torus.
 */

import type { TessellatedMesh } from "./features";

export type PrimitiveType = "box" | "cylinder" | "sphere" | "cone" | "torus";

export interface PrimitiveParams {
  type: PrimitiveType;
  // Box
  width?: number;
  height?: number;
  depth?: number;
  // Cylinder / Cone
  radius?: number;
  radiusTop?: number; // for cone (0 = point)
  // Sphere
  // uses radius
  // Torus
  tubeRadius?: number;
  // Common
  segments?: number;
  position?: [number, number, number];
}

export function generatePrimitive(params: PrimitiveParams): TessellatedMesh {
  switch (params.type) {
    case "box": return generateBox(params.width ?? 1, params.height ?? 1, params.depth ?? 1);
    case "cylinder": return generateCylinder(params.radius ?? 0.5, params.height ?? 1, params.segments ?? 24);
    case "sphere": return generateSphere(params.radius ?? 0.5, params.segments ?? 16);
    case "cone": return generateCone(params.radius ?? 0.5, params.height ?? 1, params.segments ?? 24);
    case "torus": return generateTorus(params.radius ?? 0.5, params.tubeRadius ?? 0.15, params.segments ?? 24);
  }
}

function generateBox(w: number, h: number, d: number): TessellatedMesh {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const faces = [
    // front (+Z)
    { verts: [[-hw,hh,hd],[hw,hh,hd],[hw,-hh,hd],[-hw,-hh,hd]], n: [0,0,1] },
    // back (-Z)
    { verts: [[hw,hh,-hd],[-hw,hh,-hd],[-hw,-hh,-hd],[hw,-hh,-hd]], n: [0,0,-1] },
    // top (+Y)
    { verts: [[-hw,hh,-hd],[hw,hh,-hd],[hw,hh,hd],[-hw,hh,hd]], n: [0,1,0] },
    // bottom (-Y)
    { verts: [[-hw,-hh,hd],[hw,-hh,hd],[hw,-hh,-hd],[-hw,-hh,-hd]], n: [0,-1,0] },
    // right (+X)
    { verts: [[hw,hh,hd],[hw,hh,-hd],[hw,-hh,-hd],[hw,-hh,hd]], n: [1,0,0] },
    // left (-X)
    { verts: [[-hw,hh,-hd],[-hw,hh,hd],[-hw,-hh,hd],[-hw,-hh,-hd]], n: [-1,0,0] },
  ];

  const vertices: number[] = [], normals: number[] = [], indices: number[] = [];
  let idx = 0;
  for (const f of faces) {
    for (const v of f.verts) { vertices.push(...v); normals.push(...f.n); }
    indices.push(idx, idx+1, idx+2, idx, idx+2, idx+3);
    idx += 4;
  }
  return { vertices, normals, indices };
}

function generateCylinder(radius: number, height: number, segments: number): TessellatedMesh {
  const vertices: number[] = [], normals: number[] = [], indices: number[] = [];
  const hh = height / 2;

  // Side
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const nx = Math.cos(a), nz = Math.sin(a);
    vertices.push(nx * radius, -hh, nz * radius);
    normals.push(nx, 0, nz);
    vertices.push(nx * radius, hh, nz * radius);
    normals.push(nx, 0, nz);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  // Top cap
  const topCenter = vertices.length / 3;
  vertices.push(0, hh, 0); normals.push(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push(Math.cos(a) * radius, hh, Math.sin(a) * radius);
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(topCenter, topCenter + 1 + i, topCenter + 2 + i);
  }

  // Bottom cap
  const botCenter = vertices.length / 3;
  vertices.push(0, -hh, 0); normals.push(0, -1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push(Math.cos(a) * radius, -hh, Math.sin(a) * radius);
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(botCenter, botCenter + 2 + i, botCenter + 1 + i);
  }

  return { vertices, normals, indices };
}

function generateSphere(radius: number, segments: number): TessellatedMesh {
  const vertices: number[] = [], normals: number[] = [], indices: number[] = [];
  const rings = segments;

  for (let j = 0; j <= rings; j++) {
    const theta = (j / rings) * Math.PI;
    const sinT = Math.sin(theta), cosT = Math.cos(theta);
    for (let i = 0; i <= segments; i++) {
      const phi = (i / segments) * Math.PI * 2;
      const x = sinT * Math.cos(phi), y = cosT, z = sinT * Math.sin(phi);
      vertices.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);
    }
  }

  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return { vertices, normals, indices };
}

function generateCone(radius: number, height: number, segments: number): TessellatedMesh {
  const vertices: number[] = [], normals: number[] = [], indices: number[] = [];
  const hh = height / 2;
  const slant = Math.sqrt(radius * radius + height * height);
  const ny = radius / slant, nr = height / slant;

  // Apex
  const apex = vertices.length / 3;
  vertices.push(0, hh, 0); normals.push(0, 1, 0);

  // Base ring
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const nx = Math.cos(a) * nr, nz = Math.sin(a) * nr;
    vertices.push(Math.cos(a) * radius, -hh, Math.sin(a) * radius);
    normals.push(nx, ny, nz);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(apex, apex + 1 + i, apex + 2 + i);
  }

  // Base cap
  const baseCenter = vertices.length / 3;
  vertices.push(0, -hh, 0); normals.push(0, -1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push(Math.cos(a) * radius, -hh, Math.sin(a) * radius);
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(baseCenter, baseCenter + 2 + i, baseCenter + 1 + i);
  }

  return { vertices, normals, indices };
}

function generateTorus(radius: number, tubeRadius: number, segments: number): TessellatedMesh {
  const vertices: number[] = [], normals: number[] = [], indices: number[] = [];
  const tubeSeg = segments;

  for (let j = 0; j <= segments; j++) {
    const u = (j / segments) * Math.PI * 2;
    const cu = Math.cos(u), su = Math.sin(u);
    for (let i = 0; i <= tubeSeg; i++) {
      const v = (i / tubeSeg) * Math.PI * 2;
      const cv = Math.cos(v), sv = Math.sin(v);
      const x = (radius + tubeRadius * cv) * cu;
      const y = tubeRadius * sv;
      const z = (radius + tubeRadius * cv) * su;
      vertices.push(x, y, z);
      normals.push(cv * cu, sv, cv * su);
    }
  }

  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < tubeSeg; i++) {
      const a = j * (tubeSeg + 1) + i;
      const b = a + tubeSeg + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return { vertices, normals, indices };
}
