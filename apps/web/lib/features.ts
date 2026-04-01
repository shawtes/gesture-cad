/** Feature tree types for parametric modeling history. */

export type FeatureType = "sketch" | "extrude" | "revolve";
export type FeatureStatus = "ready" | "computing" | "error";

export interface Feature {
  id: string;
  type: FeatureType;
  name: string;
  status: FeatureStatus;
  params: ExtrudeParams | RevolveParams | Record<string, unknown>;
  /** Entity IDs this feature was created from */
  sourceEntityIds: string[];
  /** Mesh data if computed */
  mesh?: TessellatedMesh | null;
  visible: boolean;
}

export interface TessellatedMesh {
  vertices: number[]; // flat [x,y,z, x,y,z, ...]
  normals: number[];  // flat [nx,ny,nz, ...]
  indices: number[];  // triangle indices
}

export interface ExtrudeParams {
  distance: number;
  direction: "up" | "down" | "both";
}

export interface RevolveParams {
  angle: number; // degrees
  axis: "x" | "y" | "z";
}

let featureCounter = 0;
function nextFeatureId(): string {
  return `feat_${++featureCounter}_${Date.now()}`;
}

export function createExtrudeFeature(
  sourceEntityIds: string[],
  params: ExtrudeParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "extrude",
    name: `Extrude ${featureCounter}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds,
    mesh: mesh || null,
    visible: true,
  };
}

export function createRevolveFeature(
  sourceEntityIds: string[],
  params: RevolveParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "revolve",
    name: `Revolve ${featureCounter}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds,
    mesh: mesh || null,
    visible: true,
  };
}

/** Generate a simple box mesh from extrude params (client-side preview). */
export function generateExtrudePreviewMesh(
  x1: number, z1: number, x2: number, z2: number,
  distance: number
): TessellatedMesh {
  const y0 = 0;
  const y1 = distance;
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);

  // 8 corners of the box
  const v = [
    minX, y0, minZ,  maxX, y0, minZ,  maxX, y0, maxZ,  minX, y0, maxZ, // bottom
    minX, y1, minZ,  maxX, y1, minZ,  maxX, y1, maxZ,  minX, y1, maxZ, // top
  ];

  // 6 faces × 2 triangles × 3 vertices
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const faces = [
    // bottom (y=0, normal -Y)
    [0,1,2, 0,2,3], [0,-1,0],
    // top (y=distance, normal +Y)
    [4,6,5, 4,7,6], [0,1,0],
    // front (z=maxZ, normal +Z)
    [3,2,6, 3,6,7], [0,0,1],
    // back (z=minZ, normal -Z)
    [0,5,1, 0,4,5], [0,0,-1],
    // right (x=maxX, normal +X)
    [1,5,6, 1,6,2], [1,0,0],
    // left (x=minX, normal -X)
    [0,3,7, 0,7,4], [-1,0,0],
  ];

  let idx = 0;
  for (let f = 0; f < faces.length; f += 2) {
    const faceIndices = faces[f] as number[];
    const normal = faces[f + 1] as number[];
    for (const vi of faceIndices) {
      vertices.push(v[vi * 3], v[vi * 3 + 1], v[vi * 3 + 2]);
      normals.push(normal[0], normal[1], normal[2]);
      indices.push(idx++);
    }
  }

  return { vertices, normals, indices };
}

/** Generate a cylinder mesh from revolve params (client-side preview). */
export function generateRevolvePreviewMesh(
  cx: number, cz: number, radius: number,
  height: number, segments: number = 24
): TessellatedMesh {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Side vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    const x = cx + nx * radius;
    const z = cz + nz * radius;

    // Bottom vertex
    vertices.push(x, 0, z);
    normals.push(nx, 0, nz);
    // Top vertex
    vertices.push(x, height, z);
    normals.push(nx, 0, nz);
  }

  // Side indices
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  return { vertices, normals, indices };
}
