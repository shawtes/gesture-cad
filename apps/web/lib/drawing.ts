/** 2D Drawing generation: orthographic views, dimensions, annotations, BOM. */

export type ViewType = "front" | "top" | "right" | "isometric" | "section" | "detail";

export interface DrawingView {
  id: string;
  type: ViewType;
  scale: number;
  position: { x: number; y: number }; // on sheet
  width: number;
  height: number;
}

export interface Dimension {
  id: string;
  type: "linear" | "angular" | "radial" | "diametral";
  value: number;
  position: { x: number; y: number };
  text?: string; // override display text
}

export interface Annotation {
  id: string;
  type: "note" | "leader" | "gdt" | "surface_finish";
  text: string;
  position: { x: number; y: number };
}

export interface BOMEntry {
  itemNumber: number;
  partName: string;
  quantity: number;
  material: string;
  description: string;
}

export interface DrawingSheet {
  id: string;
  name: string;
  size: "A4" | "A3" | "A2" | "A1" | "A0" | "Letter" | "ANSI_D";
  views: DrawingView[];
  dimensions: Dimension[];
  annotations: Annotation[];
  bom: BOMEntry[];
}

let drawingCounter = 0;

export function createDrawingSheet(
  name: string = "Sheet 1",
  size: DrawingSheet["size"] = "A3"
): DrawingSheet {
  return {
    id: `sheet_${++drawingCounter}`,
    name,
    size,
    views: [],
    dimensions: [],
    annotations: [],
    bom: [],
  };
}

/** Generate a standard 3-view layout (front, top, right + isometric). */
export function createStandard3View(sheet: DrawingSheet): DrawingSheet {
  return {
    ...sheet,
    views: [
      { id: "v_front", type: "front", scale: 1.0, position: { x: 150, y: 200 }, width: 200, height: 150 },
      { id: "v_top", type: "top", scale: 1.0, position: { x: 150, y: 50 }, width: 200, height: 100 },
      { id: "v_right", type: "right", scale: 1.0, position: { x: 400, y: 200 }, width: 150, height: 150 },
      { id: "v_iso", type: "isometric", scale: 0.7, position: { x: 450, y: 50 }, width: 150, height: 120 },
    ],
  };
}
