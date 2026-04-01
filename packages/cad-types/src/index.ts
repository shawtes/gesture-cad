/** Core geometry types shared between frontend and backend. */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GeometryData {
  id: string;
  type: PrimitiveType;
  vertices: Float32Array | number[];
  indices: Uint32Array | number[];
  normals: Float32Array | number[];
}

export type PrimitiveType =
  | "box"
  | "sphere"
  | "cylinder"
  | "cone"
  | "torus";

export interface FeatureNode {
  id: string;
  type: string;
  name: string;
  params: Record<string, unknown>;
  children: string[];
  suppressed: boolean;
}

export interface FeatureTree {
  root: string;
  nodes: Record<string, FeatureNode>;
  order: string[];
}

export type ConstraintType =
  | "coincident"
  | "horizontal"
  | "vertical"
  | "parallel"
  | "perpendicular"
  | "tangent"
  | "equal"
  | "symmetric"
  | "concentric"
  | "midpoint"
  | "distance"
  | "angle"
  | "radius"
  | "diameter";

export interface Constraint {
  id: string;
  type: ConstraintType;
  entities: string[];
  value?: number;
}
