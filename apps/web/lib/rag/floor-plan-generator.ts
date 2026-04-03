/**
 * RAG-Driven Floor Plan Generator
 *
 * Reads floor plan schematics from the RAG knowledge base and converts them
 * into cad-commands arrays that the terminal can execute to build complete houses.
 *
 * Templates: 1-bedroom apartment, 2-bedroom house, 3-bedroom house
 * Each template generates: walls, doors, windows, furniture, and roof.
 *
 * The coordinates and dimensions come from the RAG FloorPlanCAD dataset
 * (chunks p3–p10), Architecture-Detailed, and Furniture-Standards sources.
 */

import { retrieve } from "./retriever";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export type FloorPlanType = "1bed" | "2bed" | "3bed";

export interface FloorPlanConfig {
  type: FloorPlanType;
  label: string;
  outerWidth: number;   // meters
  outerDepth: number;   // meters
  wallHeight: number;
  wallThickness: number;
  rooms: RoomConfig[];
  doors: OpeningConfig[];
  windows: OpeningConfig[];
  furniture: FurnitureConfig[];
  roof: RoofConfig;
}

interface RoomConfig {
  name: string;
  /** Interior wall lines: [x1, z1, x2, z2] on XZ plane */
  walls: [number, number, number, number][];
}

interface OpeningConfig {
  name: string;
  /** Face plane to cut on */
  plane: "xy" | "yz";
  /** Rectangle [x1, y1, x2, y2] on that plane */
  rect: [number, number, number, number];
  /** Depth to cut through */
  depth: number;
}

interface FurnitureConfig {
  name: string;
  /** XZ rect [x1, z1, x2, z2] */
  rect: [number, number, number, number];
  height: number;
}

interface RoofConfig {
  overhang: number;
  thickness: number;
}

// ═══════════════════════════════════════════
// Floor plan templates (derived from RAG FloorPlanCAD chunks)
// ═══════════════════════════════════════════

/**
 * 1-Bedroom Apartment (40-50 sqm)
 * Source: FloorPlanCAD p5 — 7m x 7m outer rectangle
 * Rooms: bedroom (3.5x4), bathroom (2x2.5), kitchen (2.5x3), living (3.5x4)
 */
const PLAN_1BED: FloorPlanConfig = {
  type: "1bed",
  label: "1-Bedroom Apartment (7m × 7m)",
  outerWidth: 7,
  outerDepth: 7,
  wallHeight: 3,
  wallThickness: 0.2,
  rooms: [
    {
      name: "Bedroom wall",
      walls: [[-3.5, 0.5, 0, 0.5]],  // horizontal wall separating bedroom
    },
    {
      name: "Bathroom wall (vertical)",
      walls: [[0, 0.5, 0, -1]],       // vertical wall for bathroom
    },
    {
      name: "Kitchen wall",
      walls: [[0, -1, 3.5, -1]],      // horizontal wall for kitchen
    },
  ],
  doors: [
    // Front entry door (front wall, center)
    { name: "Entry door", plane: "yz", rect: [-0.45, 0, 0.45, 2.1], depth: 0.25 },
    // Bedroom door
    { name: "Bedroom door", plane: "yz", rect: [-1.5, 0, -0.6, 2.1], depth: 0.15 },
    // Bathroom door
    { name: "Bathroom door", plane: "xy", rect: [0.8, 0, 1.6, 2.1], depth: 0.15 },
    // Kitchen door
    { name: "Kitchen door", plane: "xy", rect: [1.5, 0, 2.3, 2.1], depth: 0.15 },
  ],
  windows: [
    // Bedroom window (back wall)
    { name: "Bedroom window", plane: "yz", rect: [-2.5, 1, -1, 2], depth: 0.25 },
    // Living room window (front wall)
    { name: "Living room window", plane: "yz", rect: [1, 1, 2.5, 2], depth: 0.25 },
    // Kitchen window (side wall)
    { name: "Kitchen window", plane: "xy", rect: [2, 1, 3, 2], depth: 0.25 },
  ],
  furniture: [
    // Bedroom: bed (1.5m x 2m, height 0.5m)
    { name: "Bed", rect: [-2.5, 1.5, -1, 3.3], height: 0.5 },
    // Bedroom: wardrobe
    { name: "Wardrobe", rect: [-3.3, 0.7, -2.7, 2.5], height: 1.8 },
    // Living room: sofa (2.2m x 0.8m)
    { name: "Sofa", rect: [-2.5, -3, -0.3, -2.2], height: 0.45 },
    // Living room: coffee table
    { name: "Coffee table", rect: [-1.8, -2, -0.8, -1.4], height: 0.4 },
    // Kitchen: counter L-shape
    { name: "Kitchen counter", rect: [0.2, -3.3, 3.3, -2.7], height: 0.9 },
    // Bathroom: toilet
    { name: "Toilet", rect: [0.5, 1.5, 0.88, 2.2], height: 0.4 },
    // Bathroom: sink
    { name: "Sink", rect: [1.5, 2.5, 2, 2.9], height: 0.85 },
    // Dining table
    { name: "Dining table", rect: [-1.5, -1.8, -0.3, -1], height: 0.75 },
  ],
  roof: { overhang: 0.5, thickness: 0.3 },
};

/**
 * 2-Bedroom House (80-100 sqm)
 * Source: FloorPlanCAD p6 — 10m x 8m outer rectangle
 */
const PLAN_2BED: FloorPlanConfig = {
  type: "2bed",
  label: "2-Bedroom House (10m × 8m)",
  outerWidth: 10,
  outerDepth: 8,
  wallHeight: 3,
  wallThickness: 0.2,
  rooms: [
    // Hallway center vertical wall
    { name: "Hallway wall left", walls: [[-0.75, -4, -0.75, 4]] },
    { name: "Hallway wall right", walls: [[0.75, -4, 0.75, 4]] },
    // Master bedroom back-left wall
    { name: "Master bedroom wall", walls: [[-5, 0, -0.75, 0]] },
    // Second bedroom back wall
    { name: "Bedroom 2 wall", walls: [[0.75, 0, 5, 0]] },
    // Bathroom wall
    { name: "Bathroom wall", walls: [[3, 0, 3, 4]] },
  ],
  doors: [
    { name: "Front door", plane: "yz", rect: [-0.45, 0, 0.45, 2.1], depth: 0.25 },
    { name: "Master bedroom door", plane: "xy", rect: [-2, 0, -1.1, 2.1], depth: 0.15 },
    { name: "Bedroom 2 door", plane: "xy", rect: [1.5, 0, 2.3, 2.1], depth: 0.15 },
    { name: "Bathroom door", plane: "xy", rect: [3.5, 0, 4.3, 2.1], depth: 0.15 },
    { name: "Kitchen door", plane: "yz", rect: [2, 0, 2.8, 2.1], depth: 0.15 },
  ],
  windows: [
    { name: "Living room window", plane: "yz", rect: [-3, 1, -1.5, 2.2], depth: 0.25 },
    { name: "Kitchen window", plane: "yz", rect: [2, 1, 3.5, 2.2], depth: 0.25 },
    { name: "Master bedroom window", plane: "yz", rect: [-3.5, 1, -2, 2], depth: 0.25 },
    { name: "Bedroom 2 window", plane: "yz", rect: [1.5, 1, 3, 2], depth: 0.25 },
    { name: "Side window", plane: "xy", rect: [-3, 1, -1.5, 2], depth: 0.25 },
  ],
  furniture: [
    // Master bedroom
    { name: "Master bed", rect: [-4, 1, -2, 3], height: 0.5 },
    { name: "Master wardrobe", rect: [-4.8, 0.2, -4.2, 2.5], height: 1.8 },
    // Bedroom 2
    { name: "Bed 2", rect: [1.5, 1, 3, 3], height: 0.5 },
    { name: "Wardrobe 2", rect: [1, 0.2, 1.5, 2], height: 1.8 },
    // Living room
    { name: "Sofa", rect: [-4, -3.5, -1.5, -2.7], height: 0.45 },
    { name: "TV stand", rect: [-4, -1, -3.5, -0.2], height: 0.5 },
    { name: "Living table", rect: [-3, -2.5, -2, -1.5], height: 0.4 },
    // Kitchen
    { name: "Kitchen counter", rect: [1, -3.5, 4.8, -2.8], height: 0.9 },
    { name: "Dining table", rect: [2, -2, 3.5, -1], height: 0.75 },
    // Bathroom
    { name: "Toilet", rect: [3.5, 1, 3.88, 1.7], height: 0.4 },
    { name: "Bathtub", rect: [3.2, 2.5, 4.8, 3.2], height: 0.5 },
    { name: "Bath sink", rect: [4, 1, 4.5, 1.4], height: 0.85 },
  ],
  roof: { overhang: 0.6, thickness: 0.3 },
};

/**
 * 3-Bedroom House (120-150 sqm)
 * Source: FloorPlanCAD p7 — spread layout ~12m x 10m
 */
const PLAN_3BED: FloorPlanConfig = {
  type: "3bed",
  label: "3-Bedroom House (12m × 10m)",
  outerWidth: 12,
  outerDepth: 10,
  wallHeight: 3,
  wallThickness: 0.2,
  rooms: [
    // Entry hall + hallway
    { name: "Hallway", walls: [[-1, -5, -1, 5]] },
    // Kitchen / dining divide
    { name: "Kitchen wall", walls: [[2, -5, 2, -1]] },
    // Back bedroom dividers
    { name: "Bedroom divider 1", walls: [[-1, 1.5, 6, 1.5]] },
    { name: "Bedroom divider 2", walls: [[2, 1.5, 2, 5]] },
    // Bathroom walls
    { name: "Bathroom wall", walls: [[-6, 1.5, -1, 1.5]] },
    { name: "En-suite wall", walls: [[-3.5, 1.5, -3.5, 5]] },
    // Living/dining separator
    { name: "Living wall", walls: [[-1, -1, 6, -1]] },
  ],
  doors: [
    { name: "Front door", plane: "yz", rect: [-0.8, 0, 0, 2.1], depth: 0.25 },
    { name: "Living door", plane: "xy", rect: [-3, 0, -2.1, 2.1], depth: 0.15 },
    { name: "Kitchen door", plane: "xy", rect: [3, 0, 3.8, 2.1], depth: 0.15 },
    { name: "Master BR door", plane: "yz", rect: [-4, 0, -3.1, 2.1], depth: 0.15 },
    { name: "Bedroom 2 door", plane: "yz", rect: [0, 0, 0.8, 2.1], depth: 0.15 },
    { name: "Bedroom 3 door", plane: "yz", rect: [3, 0, 3.8, 2.1], depth: 0.15 },
    { name: "Bathroom door", plane: "xy", rect: [-2.5, 0, -1.7, 2.1], depth: 0.15 },
    { name: "En-suite door", plane: "xy", rect: [-5, 0, -4.2, 2.1], depth: 0.15 },
  ],
  windows: [
    { name: "Living window 1", plane: "yz", rect: [-4, 1, -2, 2.2], depth: 0.25 },
    { name: "Living window 2", plane: "xy", rect: [-4, 1, -2.5, 2.2], depth: 0.25 },
    { name: "Kitchen window", plane: "yz", rect: [3, 1, 5, 2.2], depth: 0.25 },
    { name: "Master BR window", plane: "yz", rect: [-5, 1, -3.5, 2], depth: 0.25 },
    { name: "Bedroom 2 window", plane: "yz", rect: [0, 1, 1.5, 2], depth: 0.25 },
    { name: "Bedroom 3 window", plane: "yz", rect: [3.5, 1, 5, 2], depth: 0.25 },
  ],
  furniture: [
    // Living room
    { name: "Sofa", rect: [-5, -4, -2, -3.2], height: 0.45 },
    { name: "Coffee table", rect: [-4, -3, -3, -2.2], height: 0.4 },
    { name: "TV unit", rect: [-5.5, -2, -5, -0.5], height: 0.5 },
    // Kitchen
    { name: "Kitchen counter", rect: [2.2, -4.5, 5.5, -3.8], height: 0.9 },
    { name: "Fridge", rect: [5, -3.5, 5.5, -2.5], height: 1.8 },
    // Dining
    { name: "Dining table", rect: [-0.5, -3.5, 1.5, -2], height: 0.75 },
    // Master bedroom
    { name: "Master bed", rect: [-5, 2.5, -3.7, 4.5], height: 0.5 },
    { name: "Master wardrobe", rect: [-5.8, 1.7, -5.2, 3.5], height: 1.8 },
    // Bedroom 2
    { name: "Bed 2", rect: [-0.5, 2.5, 1.5, 4], height: 0.5 },
    { name: "Wardrobe 2", rect: [-0.8, 1.7, -0.2, 3.2], height: 1.8 },
    // Bedroom 3
    { name: "Bed 3", rect: [2.5, 2.5, 4, 4], height: 0.5 },
    { name: "Wardrobe 3", rect: [2.2, 1.7, 2.8, 3.2], height: 1.8 },
    // Bathroom
    { name: "Toilet", rect: [-2, 2, -1.62, 2.7], height: 0.4 },
    { name: "Bath sink", rect: [-2.8, 2, -2.3, 2.4], height: 0.85 },
    { name: "Shower", rect: [-3, 3.5, -2.1, 4.5], height: 0.1 },
    // En-suite
    { name: "En-suite toilet", rect: [-5, 2, -4.62, 2.7], height: 0.4 },
    { name: "En-suite sink", rect: [-4.5, 2, -4, 2.4], height: 0.85 },
  ],
  roof: { overhang: 0.6, thickness: 0.4 },
};

const PLANS: Record<FloorPlanType, FloorPlanConfig> = {
  "1bed": PLAN_1BED,
  "2bed": PLAN_2BED,
  "3bed": PLAN_3BED,
};

// ═══════════════════════════════════════════
// Generator — converts FloorPlanConfig → cad-commands
// ═══════════════════════════════════════════

/**
 * Generate cad-commands for a floor plan type.
 * Enriches commands with RAG context for the AI to reference.
 */
export function generateFloorPlan(type: FloorPlanType): {
  commands: any[];
  plan: FloorPlanConfig;
  ragContext: string;
} {
  const plan = PLANS[type];
  if (!plan) throw new Error(`Unknown floor plan type: ${type}. Use: 1bed, 2bed, 3bed`);

  // Pull relevant RAG context
  const ragResult = retrieve("floor plan design rules walls doors windows furniture roof", 8, "architecture");
  const ragContext = ragResult.chunks.map(c => `[${c.source}] ${c.text}`).join("\n");

  const commands = buildCommands(plan);

  return { commands, plan, ragContext };
}

/**
 * Get available floor plan types with descriptions.
 */
export function getFloorPlanTypes(): { type: FloorPlanType; label: string }[] {
  return Object.entries(PLANS).map(([type, plan]) => ({
    type: type as FloorPlanType,
    label: plan.label,
  }));
}

/**
 * Build cad-commands array from a floor plan config.
 * Follows the component-by-component pattern:
 *   1. Outer walls (rect → extrude)
 *   2. Interior walls (lines → extrude)
 *   3. Doors (rect on wall face → extrude-remove)
 *   4. Windows (rect on wall face → extrude-remove)
 *   5. Furniture (rect → extrude to height)
 *   6. Roof (rect → extrude)
 */
function buildCommands(plan: FloorPlanConfig): any[] {
  const cmds: any[] = [];
  const hw = plan.outerWidth / 2;
  const hd = plan.outerDepth / 2;

  // ─── 1. Outer walls ───
  cmds.push({ action: "comment", text: `═══ ${plan.label} ═══` });
  cmds.push({ action: "comment", text: "--- Outer Walls ---" });
  cmds.push({ action: "set_plane", plane: "xz" });
  cmds.push({
    action: "add_entity",
    type: "rect",
    params: { x1: -hw, z1: -hd, x2: hw, z2: hd },
  });
  cmds.push({ action: "extrude_last", distance: plan.wallHeight });

  // ─── 2. Interior walls ───
  for (const room of plan.rooms) {
    cmds.push({ action: "comment", text: `--- ${room.name} ---` });
    cmds.push({ action: "set_plane", plane: "xz" });
    for (const [x1, z1, x2, z2] of room.walls) {
      // Model interior walls as thin rectangles
      const dx = x2 - x1;
      const dz = z2 - z1;
      const t = plan.wallThickness / 2;

      if (Math.abs(dx) > Math.abs(dz)) {
        // Horizontal wall
        cmds.push({
          action: "add_entity",
          type: "rect",
          params: { x1, z1: z1 - t, x2, z2: z1 + t },
        });
      } else {
        // Vertical wall
        cmds.push({
          action: "add_entity",
          type: "rect",
          params: { x1: x1 - t, z1, x2: x1 + t, z2 },
        });
      }
      cmds.push({ action: "extrude_last", distance: plan.wallHeight });
    }
  }

  // ─── 3. Doors (openings in walls) ───
  cmds.push({ action: "comment", text: "--- Doors ---" });
  for (const door of plan.doors) {
    cmds.push({ action: "comment", text: `  ${door.name}` });
    cmds.push({ action: "set_plane", plane: door.plane });
    cmds.push({
      action: "add_entity",
      type: "rect",
      params: { x1: door.rect[0], z1: door.rect[1], x2: door.rect[2], z2: door.rect[3] },
    });
    cmds.push({ action: "extrude_last", distance: door.depth });
  }

  // ─── 4. Windows (openings in walls) ───
  cmds.push({ action: "comment", text: "--- Windows ---" });
  for (const win of plan.windows) {
    cmds.push({ action: "comment", text: `  ${win.name}` });
    cmds.push({ action: "set_plane", plane: win.plane });
    cmds.push({
      action: "add_entity",
      type: "rect",
      params: { x1: win.rect[0], z1: win.rect[1], x2: win.rect[2], z2: win.rect[3] },
    });
    cmds.push({ action: "extrude_last", distance: win.depth });
  }

  // ─── 5. Furniture ───
  cmds.push({ action: "comment", text: "--- Furniture ---" });
  cmds.push({ action: "set_plane", plane: "xz" });
  for (const item of plan.furniture) {
    cmds.push({ action: "comment", text: `  ${item.name}` });
    cmds.push({
      action: "add_entity",
      type: "rect",
      params: { x1: item.rect[0], z1: item.rect[1], x2: item.rect[2], z2: item.rect[3] },
    });
    cmds.push({ action: "extrude_last", distance: item.height });
  }

  // ─── 6. Roof ───
  const ov = plan.roof.overhang;
  cmds.push({ action: "comment", text: "--- Roof ---" });
  cmds.push({ action: "set_plane", plane: "xz" });
  cmds.push({
    action: "add_entity",
    type: "rect",
    params: { x1: -hw - ov, z1: -hd - ov, x2: hw + ov, z2: hd + ov },
  });
  cmds.push({ action: "extrude_last", distance: plan.roof.thickness });

  cmds.push({ action: "comment", text: `═══ Complete: ${plan.label} ═══` });

  return cmds;
}

/**
 * Adjust a generated plan by modifying parameters.
 * Returns a new set of commands with the adjustments applied.
 */
export function adjustFloorPlan(
  type: FloorPlanType,
  adjustments: {
    scale?: number;           // Scale all dimensions
    wallHeight?: number;      // Override wall height
    includeFurniture?: boolean; // Whether to include furniture (default true)
    includeRoof?: boolean;    // Whether to include roof (default true)
  }
): { commands: any[]; plan: FloorPlanConfig } {
  const basePlan = { ...PLANS[type] };
  if (!basePlan) throw new Error(`Unknown floor plan type: ${type}`);

  const scale = adjustments.scale || 1;
  const includeFurniture = adjustments.includeFurniture !== false;
  const includeRoof = adjustments.includeRoof !== false;

  // Apply scale
  const plan: FloorPlanConfig = {
    ...basePlan,
    outerWidth: basePlan.outerWidth * scale,
    outerDepth: basePlan.outerDepth * scale,
    wallHeight: adjustments.wallHeight || basePlan.wallHeight,
    rooms: basePlan.rooms.map(r => ({
      ...r,
      walls: r.walls.map(([x1, z1, x2, z2]) =>
        [x1 * scale, z1 * scale, x2 * scale, z2 * scale] as [number, number, number, number]
      ),
    })),
    doors: basePlan.doors.map(d => ({
      ...d,
      rect: d.rect.map(v => v * scale) as [number, number, number, number],
    })),
    windows: basePlan.windows.map(w => ({
      ...w,
      rect: w.rect.map(v => v * scale) as [number, number, number, number],
    })),
    furniture: includeFurniture ? basePlan.furniture.map(f => ({
      ...f,
      rect: f.rect.map(v => v * scale) as [number, number, number, number],
      height: f.height * scale,
    })) : [],
    roof: includeRoof ? {
      overhang: basePlan.roof.overhang * scale,
      thickness: basePlan.roof.thickness,
    } : { overhang: 0, thickness: 0 },
  };

  const commands = buildCommands(plan);

  // Remove furniture/roof commands if excluded
  const filtered = commands.filter(cmd => {
    if (!includeFurniture && cmd.action === "comment" && cmd.text?.includes("Furniture")) return false;
    if (!includeRoof && cmd.action === "comment" && cmd.text?.includes("Roof")) return false;
    return true;
  });

  return { commands: filtered, plan };
}
