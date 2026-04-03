/**
 * GD&T Symbol Library (ASME Y14.5 / ISO 1101)
 *
 * Geometric Dimensioning and Tolerancing symbols for engineering drawings.
 * 14 geometric characteristic symbols + datum references + feature control frames.
 *
 * References: ASME Y14.5-2018, ISO 1101:2017
 */

/** Geometric characteristic symbol categories */
export type GDTCategory = "form" | "orientation" | "location" | "runout" | "profile";

/** The 14 geometric characteristic symbols */
export type GDTSymbol =
  // Form (no datum reference required)
  | "flatness"
  | "straightness"
  | "circularity"
  | "cylindricity"
  // Orientation (datum required)
  | "perpendicularity"
  | "angularity"
  | "parallelism"
  // Location (datum required)
  | "position"
  | "concentricity"
  | "symmetry"
  // Runout (datum required)
  | "circular_runout"
  | "total_runout"
  // Profile
  | "profile_line"
  | "profile_surface";

/** Material condition modifiers */
export type MaterialCondition = "MMC" | "LMC" | "RFS";

/** Datum reference in a feature control frame */
export interface DatumReference {
  letter: string; // A, B, C, etc.
  materialCondition?: MaterialCondition;
}

/** Feature control frame: the annotation box on engineering drawings */
export interface FeatureControlFrame {
  id: string;
  symbol: GDTSymbol;
  toleranceValue: number;
  /** Diameter symbol prefix (for cylindrical tolerance zones) */
  diametral: boolean;
  materialCondition?: MaterialCondition;
  datumReferences: DatumReference[];
  /** Position on the drawing (in sheet coordinates) */
  position: { x: number; y: number };
}

/** GD&T symbol metadata */
export interface GDTSymbolInfo {
  symbol: GDTSymbol;
  category: GDTCategory;
  name: string;
  /** Unicode or ASCII representation */
  displayChar: string;
  /** SVG path for rendering */
  svgPath: string;
  requiresDatum: boolean;
  description: string;
}

/** Complete symbol library */
export const GDT_SYMBOLS: GDTSymbolInfo[] = [
  // Form tolerances (no datum)
  {
    symbol: "flatness", category: "form", name: "Flatness",
    displayChar: "\u23E5", svgPath: "M2,8 L14,8 L12,4 L0,4 Z",
    requiresDatum: false, description: "Surface must lie between two parallel planes"
  },
  {
    symbol: "straightness", category: "form", name: "Straightness",
    displayChar: "\u23E4", svgPath: "M2,6 L14,6",
    requiresDatum: false, description: "Line element must lie within a tolerance zone"
  },
  {
    symbol: "circularity", category: "form", name: "Circularity (Roundness)",
    displayChar: "\u25CB", svgPath: "M8,2 A6,6 0 1,1 8,14 A6,6 0 1,1 8,2",
    requiresDatum: false, description: "Circular cross-section within two concentric circles"
  },
  {
    symbol: "cylindricity", category: "form", name: "Cylindricity",
    displayChar: "\u232D", svgPath: "M4,2 L4,14 M12,2 L12,14 M4,2 A4,2 0 0,1 12,2 M4,14 A4,2 0 0,0 12,14",
    requiresDatum: false, description: "Surface within two coaxial cylinders"
  },
  // Orientation tolerances (datum required)
  {
    symbol: "perpendicularity", category: "orientation", name: "Perpendicularity",
    displayChar: "\u22A5", svgPath: "M8,2 L8,14 M2,14 L14,14",
    requiresDatum: true, description: "Feature perpendicular to datum within tolerance"
  },
  {
    symbol: "angularity", category: "orientation", name: "Angularity",
    displayChar: "\u2220", svgPath: "M2,14 L14,14 L8,2",
    requiresDatum: true, description: "Feature at specified angle to datum within tolerance"
  },
  {
    symbol: "parallelism", category: "orientation", name: "Parallelism",
    displayChar: "\u2225", svgPath: "M4,2 L4,14 M12,2 L12,14",
    requiresDatum: true, description: "Feature parallel to datum within tolerance"
  },
  // Location tolerances (datum required)
  {
    symbol: "position", category: "location", name: "Position",
    displayChar: "\u2316", svgPath: "M8,2 L8,14 M2,8 L14,8 M8,5 A3,3 0 1,1 8,11 A3,3 0 1,1 8,5",
    requiresDatum: true, description: "True position within cylindrical or parallel-plane zone"
  },
  {
    symbol: "concentricity", category: "location", name: "Concentricity",
    displayChar: "\u25CE", svgPath: "M8,3 A5,5 0 1,1 8,13 A5,5 0 1,1 8,3 M8,6 A2,2 0 1,1 8,10 A2,2 0 1,1 8,6",
    requiresDatum: true, description: "Median points within cylindrical zone about datum axis"
  },
  {
    symbol: "symmetry", category: "location", name: "Symmetry",
    displayChar: "\u232F", svgPath: "M2,4 L14,4 M2,8 L14,8 M2,12 L14,12",
    requiresDatum: true, description: "Median points within two parallel planes about datum"
  },
  // Runout tolerances (datum required)
  {
    symbol: "circular_runout", category: "runout", name: "Circular Runout",
    displayChar: "\u2197", svgPath: "M4,14 L12,2 M12,2 L12,8 M12,2 L8,2",
    requiresDatum: true, description: "Surface variation during one revolution about datum"
  },
  {
    symbol: "total_runout", category: "runout", name: "Total Runout",
    displayChar: "\u2197\u2197", svgPath: "M3,14 L9,2 M9,2 L9,8 M9,2 L5,2 M6,14 L12,2 M12,2 L12,8",
    requiresDatum: true, description: "Surface variation during full translation and rotation"
  },
  // Profile tolerances
  {
    symbol: "profile_line", category: "profile", name: "Profile of a Line",
    displayChar: "\u2312", svgPath: "M2,10 Q8,2 14,10",
    requiresDatum: false, description: "Line profile within bilateral or unilateral zone"
  },
  {
    symbol: "profile_surface", category: "profile", name: "Profile of a Surface",
    displayChar: "\u2313", svgPath: "M2,10 Q8,2 14,10 Z",
    requiresDatum: false, description: "Surface profile within bilateral or unilateral zone"
  },
];

/** Welding symbol types (AWS A2.4) */
export type WeldingSymbol =
  | "fillet" | "groove_v" | "groove_bevel" | "groove_u" | "groove_j"
  | "groove_square" | "plug_slot" | "spot" | "seam" | "bead";

/** Surface finish symbol types (ISO 1302) */
export type SurfaceFinishSymbol =
  | "machined" | "ground" | "lapped" | "honed" | "polished"
  | "cast" | "forged" | "rolled" | "hammered" | "chipped";

export interface SurfaceFinishAnnotation {
  id: string;
  type: SurfaceFinishSymbol;
  /** Ra value in micrometers */
  roughnessRa?: number;
  /** Rz value in micrometers */
  roughnessRz?: number;
  /** Machining allowance */
  allowance?: number;
  position: { x: number; y: number };
}

/**
 * Create a feature control frame for GD&T annotation.
 */
let fcfCounter = 0;
export function createFeatureControlFrame(
  symbol: GDTSymbol,
  toleranceValue: number,
  datums: string[] = [],
  diametral: boolean = false,
  materialCondition?: MaterialCondition
): FeatureControlFrame {
  return {
    id: `fcf_${++fcfCounter}`,
    symbol,
    toleranceValue,
    diametral,
    materialCondition,
    datumReferences: datums.map((letter) => ({ letter })),
    position: { x: 0, y: 0 },
  };
}

/**
 * Render a feature control frame to canvas.
 */
export function renderFeatureControlFrame(
  ctx: CanvasRenderingContext2D,
  fcf: FeatureControlFrame,
  x: number,
  y: number,
  height: number = 16
): void {
  const symbolInfo = GDT_SYMBOLS.find((s) => s.symbol === fcf.symbol);
  if (!symbolInfo) return;

  ctx.save();
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  ctx.lineWidth = 0.5;
  ctx.font = `${height * 0.7}px Arial`;

  let cx = x;

  // Symbol compartment
  ctx.strokeRect(cx, y, height, height);
  ctx.fillText(symbolInfo.displayChar, cx + 2, y + height * 0.75);
  cx += height;

  // Tolerance compartment
  let tolText = "";
  if (fcf.diametral) tolText += "\u2300";
  tolText += fcf.toleranceValue.toFixed(3);
  if (fcf.materialCondition) {
    tolText += fcf.materialCondition === "MMC" ? "\u24C2" : fcf.materialCondition === "LMC" ? "\u24C1" : "";
  }
  const tolWidth = ctx.measureText(tolText).width + 6;
  ctx.strokeRect(cx, y, tolWidth, height);
  ctx.fillText(tolText, cx + 3, y + height * 0.75);
  cx += tolWidth;

  // Datum compartments
  for (const datum of fcf.datumReferences) {
    let datumText = datum.letter;
    if (datum.materialCondition) {
      datumText += datum.materialCondition === "MMC" ? "\u24C2" : datum.materialCondition === "LMC" ? "\u24C1" : "";
    }
    const dWidth = ctx.measureText(datumText).width + 6;
    ctx.strokeRect(cx, y, dWidth, height);
    ctx.fillText(datumText, cx + 3, y + height * 0.75);
    cx += dWidth;
  }

  ctx.restore();
}

/**
 * Get symbols by category for toolbar/palette UI.
 */
export function getSymbolsByCategory(category: GDTCategory): GDTSymbolInfo[] {
  return GDT_SYMBOLS.filter((s) => s.category === category);
}

// ═══════════════════════════════════════════
// Interactive Tolerance Editing
// ═══════════════════════════════════════════

export interface ToleranceAnnotation {
  id: string;
  /** The feature control frame */
  fcf: FeatureControlFrame;
  /** Leader line from feature to annotation */
  leaderLine: { fromX: number; fromY: number; toX: number; toY: number };
  /** Whether this annotation is selected for editing */
  selected: boolean;
}

let toleranceCounter = 0;

export function createToleranceAnnotation(
  symbol: GDTSymbol,
  toleranceValue: number,
  datums: string[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  diametral: boolean = false
): ToleranceAnnotation {
  const fcf = createFeatureControlFrame(symbol, toleranceValue, datums, diametral);
  fcf.position = { x: toX, y: toY };
  return {
    id: `tol_${++toleranceCounter}`,
    fcf,
    leaderLine: { fromX, fromY, toX, toY },
    selected: false,
  };
}

/** Update tolerance value on an existing annotation */
export function updateToleranceValue(
  annotation: ToleranceAnnotation,
  newValue: number
): ToleranceAnnotation {
  return {
    ...annotation,
    fcf: { ...annotation.fcf, toleranceValue: newValue },
  };
}

/** Move a tolerance annotation to a new position */
export function moveToleranceAnnotation(
  annotation: ToleranceAnnotation,
  dx: number,
  dy: number
): ToleranceAnnotation {
  return {
    ...annotation,
    fcf: {
      ...annotation.fcf,
      position: {
        x: annotation.fcf.position.x + dx,
        y: annotation.fcf.position.y + dy,
      },
    },
    leaderLine: {
      ...annotation.leaderLine,
      toX: annotation.leaderLine.toX + dx,
      toY: annotation.leaderLine.toY + dy,
    },
  };
}

/** Render a tolerance annotation with leader line to canvas */
export function renderToleranceAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: ToleranceAnnotation
): void {
  const { leaderLine, fcf, selected } = annotation;

  // Draw leader line
  ctx.save();
  ctx.strokeStyle = selected ? "#3b82f6" : "#000";
  ctx.lineWidth = selected ? 1.5 : 0.5;
  ctx.beginPath();
  ctx.moveTo(leaderLine.fromX, leaderLine.fromY);
  ctx.lineTo(leaderLine.toX, leaderLine.toY);
  ctx.stroke();

  // Draw arrowhead at start
  const angle = Math.atan2(leaderLine.toY - leaderLine.fromY, leaderLine.toX - leaderLine.fromX);
  const arrowLen = 6;
  ctx.beginPath();
  ctx.moveTo(leaderLine.fromX, leaderLine.fromY);
  ctx.lineTo(
    leaderLine.fromX + arrowLen * Math.cos(angle + 0.4),
    leaderLine.fromY + arrowLen * Math.sin(angle + 0.4)
  );
  ctx.moveTo(leaderLine.fromX, leaderLine.fromY);
  ctx.lineTo(
    leaderLine.fromX + arrowLen * Math.cos(angle - 0.4),
    leaderLine.fromY + arrowLen * Math.sin(angle - 0.4)
  );
  ctx.stroke();
  ctx.restore();

  // Draw FCF box
  renderFeatureControlFrame(ctx, fcf, leaderLine.toX, leaderLine.toY - 8);
}
