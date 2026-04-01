/** Assembly system: components, mates, and interference detection. */

import type { TessellatedMesh } from "./features";

export type MateType =
  | "coincident"
  | "concentric"
  | "distance"
  | "angle"
  | "tangent"
  | "lock";

export interface AssemblyComponent {
  id: string;
  name: string;
  featureIds: string[];
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  visible: boolean;
  locked: boolean;
}

export interface AssemblyMate {
  id: string;
  type: MateType;
  componentA: string;
  componentB: string;
  /** Mate value (distance, angle, etc.) */
  value?: number;
}

export interface AssemblyState {
  components: AssemblyComponent[];
  mates: AssemblyMate[];
}

let compCounter = 0;
let mateCounter = 0;

export function createComponent(
  name: string,
  featureIds: string[],
  position = { x: 0, y: 0, z: 0 }
): AssemblyComponent {
  return {
    id: `comp_${++compCounter}`,
    name,
    featureIds,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    visible: true,
    locked: false,
  };
}

export function createMate(
  type: MateType,
  componentA: string,
  componentB: string,
  value?: number
): AssemblyMate {
  return {
    id: `mate_${++mateCounter}`,
    type,
    componentA,
    componentB,
    value,
  };
}

/** Simple AABB interference check between two components. */
export function checkInterference(
  meshA: TessellatedMesh,
  posA: { x: number; y: number; z: number },
  meshB: TessellatedMesh,
  posB: { x: number; y: number; z: number }
): boolean {
  const bboxA = computeBBox(meshA, posA);
  const bboxB = computeBBox(meshB, posB);

  return (
    bboxA.min.x <= bboxB.max.x && bboxA.max.x >= bboxB.min.x &&
    bboxA.min.y <= bboxB.max.y && bboxA.max.y >= bboxB.min.y &&
    bboxA.min.z <= bboxB.max.z && bboxA.max.z >= bboxB.min.z
  );
}

function computeBBox(mesh: TessellatedMesh, offset: { x: number; y: number; z: number }) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const x = mesh.vertices[i] + offset.x;
    const y = mesh.vertices[i + 1] + offset.y;
    const z = mesh.vertices[i + 2] + offset.z;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}
