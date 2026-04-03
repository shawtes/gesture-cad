/** Sketch entity types for 2D drawing on the XZ ground plane. */

/** Common properties shared by all sketch entities */
interface SketchEntityBase {
  id: string;
  /** If true, entity is a construction/reference line (dashed, not used for extrude profiles) */
  isConstruction?: boolean;
  /** Which plane this entity was drawn on — stored permanently so it doesn't move */
  plane?: "xz" | "xy" | "yz";
}

export interface SketchPoint extends SketchEntityBase {
  type: "point";
  x: number;
  z: number;
}

export interface SketchLine extends SketchEntityBase {
  type: "line";
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export interface SketchCircle extends SketchEntityBase {
  type: "circle";
  cx: number;
  cz: number;
  radius: number;
}

export interface SketchRect extends SketchEntityBase {
  type: "rect";
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export interface SketchArc extends SketchEntityBase {
  type: "arc";
  /** Start point */
  x1: number;
  z1: number;
  /** Mid point (defines curvature) */
  mx: number;
  mz: number;
  /** End point */
  x2: number;
  z2: number;
}

export interface SketchSpline extends SketchEntityBase {
  type: "spline";
  /** Control points [x, z, x, z, ...] */
  points: number[];
}

export interface SketchEllipse extends SketchEntityBase {
  type: "ellipse";
  cx: number;
  cz: number;
  /** Semi-axis along the X direction (before rotation) */
  radiusX: number;
  /** Semi-axis along the Z direction (before rotation) */
  radiusZ: number;
  /** Rotation angle in radians */
  rotation: number;
}

export interface SketchSlot extends SketchEntityBase {
  type: "slot";
  /** Center of first semicircle */
  x1: number;
  z1: number;
  /** Center of second semicircle */
  x2: number;
  z2: number;
  /** Half-width (radius of semicircular ends) */
  width: number;
}

export interface SketchPolygon extends SketchEntityBase {
  type: "polygon";
  /** Center of the polygon */
  cx: number;
  cz: number;
  /** Circumradius (center to vertex) */
  radius: number;
  /** Number of sides */
  sides: number;
  /** Rotation offset in radians */
  rotation: number;
}

export type SketchEntity =
  | SketchPoint
  | SketchLine
  | SketchCircle
  | SketchRect
  | SketchArc
  | SketchSpline
  | SketchEllipse
  | SketchSlot
  | SketchPolygon;

let counter = 0;
function nextId(prefix: string): string {
  return `${prefix}_${++counter}_${Date.now()}`;
}

export function createPoint(x: number, z: number): SketchPoint {
  return { id: nextId("pt"), type: "point", x, z };
}

export function createLine(x1: number, z1: number, x2: number, z2: number): SketchLine {
  return { id: nextId("ln"), type: "line", x1, z1, x2, z2 };
}

export function createCircle(cx: number, cz: number, radius: number): SketchCircle {
  return { id: nextId("cr"), type: "circle", cx, cz, radius };
}

export function createRect(x1: number, z1: number, x2: number, z2: number): SketchRect {
  return { id: nextId("rc"), type: "rect", x1, z1, x2, z2 };
}

export function createArc(
  x1: number, z1: number,
  mx: number, mz: number,
  x2: number, z2: number
): SketchArc {
  return { id: nextId("ar"), type: "arc", x1, z1, mx, mz, x2, z2 };
}

export function createSpline(points: number[]): SketchSpline {
  return { id: nextId("sp"), type: "spline", points };
}

export function createEllipse(
  cx: number, cz: number,
  radiusX: number, radiusZ: number,
  rotation: number = 0
): SketchEllipse {
  return { id: nextId("el"), type: "ellipse", cx, cz, radiusX, radiusZ, rotation };
}

export function createSlot(
  x1: number, z1: number,
  x2: number, z2: number,
  width: number
): SketchSlot {
  return { id: nextId("sl"), type: "slot", x1, z1, x2, z2, width };
}

export function createPolygon(
  cx: number, cz: number,
  radius: number, sides: number = 6,
  rotation: number = 0
): SketchPolygon {
  return { id: nextId("pg"), type: "polygon", cx, cz, radius, sides, rotation };
}
