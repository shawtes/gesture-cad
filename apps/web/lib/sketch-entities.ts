/** Sketch entity types for 2D drawing on the XZ ground plane. */

export interface SketchPoint {
  id: string;
  type: "point";
  x: number;
  z: number;
}

export interface SketchLine {
  id: string;
  type: "line";
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export interface SketchCircle {
  id: string;
  type: "circle";
  cx: number;
  cz: number;
  radius: number;
}

export interface SketchRect {
  id: string;
  type: "rect";
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export type SketchEntity = SketchPoint | SketchLine | SketchCircle | SketchRect;

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
