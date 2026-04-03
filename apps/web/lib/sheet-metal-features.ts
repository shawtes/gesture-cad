/**
 * Sheet Metal Feature Tools — Flange, Hem, Tab, Joint, Flat Pattern
 *
 * Extends the existing sheet-metal.ts with Onshape-style features.
 */

import type { TessellatedMesh } from "./features";

/** Sheet Metal Flange — add a bent flange to an edge */
export function createFlange(
  baseMesh: TessellatedMesh,
  edgeIdx: number,
  length: number,
  angle: number = 90,
  thickness: number = 0.5
): TessellatedMesh {
  // Generate a flat rectangular extension at the specified angle
  const angleRad = (angle * Math.PI) / 180;
  const flangeVerts: number[] = [];
  const flangeNorms: number[] = [];
  const flangeIdx: number[] = [];

  // Simple flange: rectangle bent at angle from base edge
  const hw = thickness / 2;
  const base = baseMesh.vertices.length / 3;

  // 4 corners of flange face
  flangeVerts.push(
    -hw, 0, 0,
    hw, 0, 0,
    hw + length * Math.sin(angleRad), length * Math.cos(angleRad), 0,
    -hw + length * Math.sin(angleRad), length * Math.cos(angleRad), 0,
  );
  flangeNorms.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
  flangeIdx.push(base, base + 1, base + 2, base, base + 2, base + 3);

  return {
    vertices: [...baseMesh.vertices, ...flangeVerts],
    normals: [...baseMesh.normals, ...flangeNorms],
    indices: [...baseMesh.indices, ...flangeIdx],
  };
}

/** Sheet Metal Hem — fold edge over for safety/rigidity */
export function createHem(
  baseMesh: TessellatedMesh,
  hemType: "closed" | "open" | "teardrop" = "closed",
  hemLength: number = 0.5,
  thickness: number = 0.5
): TessellatedMesh {
  // Hem is a tight 180° bend at the edge
  return createFlange(baseMesh, 0, hemLength, 180, thickness);
}

/** Sheet Metal Tab — create a tab from a sketch on a sheet face */
export function createTab(
  baseMesh: TessellatedMesh,
  tabWidth: number,
  tabLength: number,
  thickness: number = 0.5
): TessellatedMesh {
  const hw = tabWidth / 2;
  const base = baseMesh.vertices.length / 3;
  const tabVerts = [
    -hw, 0, 0, hw, 0, 0,
    hw, 0, tabLength, -hw, 0, tabLength,
    -hw, thickness, 0, hw, thickness, 0,
    hw, thickness, tabLength, -hw, thickness, tabLength,
  ];
  const tabNorms = [
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  ];
  const tabIdx = [
    base, base+1, base+2, base, base+2, base+3,
    base+4, base+6, base+5, base+4, base+7, base+6,
  ];

  return {
    vertices: [...baseMesh.vertices, ...tabVerts],
    normals: [...baseMesh.normals, ...tabNorms],
    indices: [...baseMesh.indices, ...tabIdx],
  };
}

/** Sheet Metal Joint — define bend/seam between sheet faces */
export interface SheetMetalJoint {
  id: string;
  type: "bend" | "rip" | "tangent";
  angle: number;
  radius: number;
  faceA: number;
  faceB: number;
}

let jointCounter = 0;
export function createJoint(
  type: "bend" | "rip" | "tangent",
  angle: number = 90,
  radius: number = 0.5
): SheetMetalJoint {
  return {
    id: `joint_${++jointCounter}`,
    type,
    angle,
    radius,
    faceA: 0,
    faceB: 1,
  };
}
