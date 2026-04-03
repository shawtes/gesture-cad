/**
 * Shared sketch coordinate utilities.
 * Single source of truth for plane→3D conversion, colors, and constants.
 */

import type { SketchPlaneId } from "./store";

/** Elevation offset to prevent z-fighting with grid */
export const SKETCH_OFFSET = 0.01;

/** Convert sketch 2D coords to 3D world coords based on plane */
export function sketchTo3D(sx: number, sz: number, plane: SketchPlaneId): [number, number, number] {
  switch (plane) {
    case "xz": return [sx, SKETCH_OFFSET, sz];
    case "xy": return [sx, sz, SKETCH_OFFSET];
    case "yz": return [SKETCH_OFFSET, sz, sx];
    default:   return [sx, SKETCH_OFFSET, sz];
  }
}

/** Get color for sketch plane */
export function getPlaneColor(plane: SketchPlaneId): string {
  switch (plane) {
    case "xz": return "#22c55e";
    case "xy": return "#ef4444";
    case "yz": return "#3b82f6";
    default:   return "#f59e0b";
  }
}

/** Get rotation to orient geometry on plane */
export function getPlaneRotation(plane: SketchPlaneId): [number, number, number] {
  switch (plane) {
    case "xz": return [0, 0, 0];
    case "xy": return [-Math.PI / 2, 0, 0];
    case "yz": return [0, 0, -Math.PI / 2];
    default:   return [0, 0, 0];
  }
}

/** Sketch entity colors */
export const ENTITY_COLORS = {
  point: "#22c55e",
  line: "#3b82f6",
  circle: "#3b82f6",
  rect: "#3b82f6",
  arc: "#8b5cf6",
  spline: "#f59e0b",
  ellipse: "#06b6d4",
  slot: "#14b8a6",
  polygon: "#a855f7",
  hover: "#fbbf24",
  selected: "#f97316",
  construction: "#6366f1",
} as const;

/** Common tessellation segment counts */
export const SEGMENTS = {
  circle: 32,
  arc: 24,
  slot: 16,
  polygon: 1, // uses sides count
  ellipse: 32,
} as const;

/** Axis selection options reusable across parameter dialogs */
export const AXIS_OPTIONS = [
  { value: "x", label: "X Axis" },
  { value: "y", label: "Y Axis" },
  { value: "z", label: "Z Axis" },
] as const;

export const PLANE_OPTIONS = [
  { value: "x", label: "YZ Plane (X normal)" },
  { value: "y", label: "XZ Plane (Y normal)" },
  { value: "z", label: "XY Plane (Z normal)" },
] as const;

/** Convert axis string to unit vector */
export function axisToVector(axis: string): [number, number, number] {
  return axis === "x" ? [1, 0, 0] : axis === "z" ? [0, 0, 1] : [0, 1, 0];
}

/** Compute centroid of a vertex array */
export function meshCentroid(vertices: number[]): [number, number, number] {
  let cx = 0, cy = 0, cz = 0;
  const count = vertices.length / 3;
  for (let i = 0; i < vertices.length; i += 3) {
    cx += vertices[i]; cy += vertices[i + 1]; cz += vertices[i + 2];
  }
  return count > 0 ? [cx / count, cy / count, cz / count] : [0, 0, 0];
}
