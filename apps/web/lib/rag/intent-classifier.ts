/**
 * Design Intent Classifier
 *
 * Analyzes user prompts to determine:
 * 1. What category of design they want (architecture, mechanical, furniture, etc.)
 * 2. Which RAG chunks are most relevant
 * 3. What coordinate templates and dimension standards to inject
 * 4. Whether a pre-built floor plan template can be used as a starting point
 *
 * This allows Claude to generate much better cad-commands by grounding
 * its output in real engineering data from the RAG knowledge base.
 */

import { retrieve, formatContext } from "./retriever";
import { generateFloorPlan, getFloorPlanTypes, type FloorPlanType } from "./floor-plan-generator";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface DesignIntent {
  /** Primary design category */
  category: DesignCategory;
  /** Confidence score 0-1 */
  confidence: number;
  /** Matched keywords from the prompt */
  matchedKeywords: string[];
  /** Specific sub-type if detected */
  subType: string | null;
  /** Floor plan type if architecture detected */
  floorPlanType: FloorPlanType | null;
}

export interface DesignContext {
  /** The classified intent */
  intent: DesignIntent;
  /** RAG chunks formatted as context string */
  ragContext: string;
  /** Dimension standards relevant to this design */
  dimensionStandards: string;
  /** Pre-built template commands if available */
  templateCommands: any[] | null;
  /** Modeling tips specific to this category */
  modelingTips: string;
}

export type DesignCategory =
  | "architecture"    // houses, buildings, rooms, floor plans
  | "mechanical"      // gears, bolts, bearings, assemblies
  | "furniture"       // tables, chairs, beds, cabinets
  | "character"       // 3D characters, figures, sculpting
  | "vehicle"         // cars, boats, aircraft
  | "electronics"     // enclosures, PCB mounts, connectors
  | "general";        // catch-all

// ═══════════════════════════════════════════
// Keyword patterns for classification
// ═══════════════════════════════════════════

interface CategoryPattern {
  category: DesignCategory;
  /** Keywords that strongly indicate this category */
  keywords: string[];
  /** Phrases with higher weight */
  phrases: string[];
  /** Weight multiplier */
  weight: number;
}

const PATTERNS: CategoryPattern[] = [
  {
    category: "architecture",
    keywords: [
      "house", "home", "building", "apartment", "room", "floor", "plan",
      "wall", "door", "window", "roof", "stair", "bathroom", "kitchen",
      "bedroom", "living", "garage", "patio", "balcony", "foundation",
      "residential", "commercial", "office", "corridor", "hallway",
      "ceiling", "attic", "basement", "story", "storey", "flat",
    ],
    phrases: [
      "floor plan", "house design", "building layout", "room layout",
      "1 bed", "2 bed", "3 bed", "1bed", "2bed", "3bed",
      "one bedroom", "two bedroom", "three bedroom",
      "interior design", "architectural",
    ],
    weight: 1.5,
  },
  {
    category: "mechanical",
    keywords: [
      "gear", "bolt", "screw", "nut", "bearing", "shaft", "coupling",
      "pulley", "clamp", "hinge", "spring", "bracket", "flange",
      "thread", "keyway", "bushing", "washer", "pin", "dowel",
      "motor", "piston", "cam", "valve", "nozzle", "manifold",
      "enclosure", "mount", "fixture", "jig", "housing",
      "mechanical", "machine", "engine", "part", "component",
    ],
    phrases: [
      "mechanical part", "spur gear", "worm gear", "ball bearing",
      "hex bolt", "motor mount", "shaft coupling", "press fit",
      "thread pitch", "bore hole",
    ],
    weight: 1.3,
  },
  {
    category: "furniture",
    keywords: [
      "table", "chair", "desk", "shelf", "bookcase", "cabinet",
      "wardrobe", "dresser", "bench", "stool", "sofa", "couch",
      "bed", "nightstand", "drawer", "rack", "stand", "counter",
      "vanity", "ottoman",
    ],
    phrases: [
      "dining table", "office desk", "book shelf", "tv stand",
      "coffee table", "side table", "bar stool", "kitchen cabinet",
    ],
    weight: 1.2,
  },
  {
    category: "character",
    keywords: [
      "character", "figure", "body", "head", "face", "arm", "leg",
      "hand", "foot", "torso", "humanoid", "robot", "creature",
      "sculpt", "model", "pose", "rig", "skeleton", "bone",
      "animate", "walk", "run", "avatar", "mannequin",
    ],
    phrases: [
      "3d character", "character model", "human figure", "low poly character",
      "game character", "animation rig",
    ],
    weight: 1.2,
  },
  {
    category: "vehicle",
    keywords: [
      "car", "truck", "bus", "motorcycle", "bicycle", "boat", "ship",
      "aircraft", "airplane", "drone", "helicopter", "wheel", "chassis",
      "body", "hood", "bumper", "fender", "wing", "fuselage",
      "propeller", "hull",
    ],
    phrases: [
      "car design", "vehicle body", "aircraft wing", "boat hull",
    ],
    weight: 1.1,
  },
  {
    category: "electronics",
    keywords: [
      "pcb", "board", "enclosure", "case", "box", "mount", "connector",
      "slot", "vent", "heat", "sink", "fan", "led", "button", "switch",
      "usb", "port", "raspberry", "arduino",
    ],
    phrases: [
      "electronics enclosure", "pcb mount", "project box", "heat sink",
      "raspberry pi case", "arduino case",
    ],
    weight: 1.0,
  },
];

// ═══════════════════════════════════════════
// Dimension standards per category
// ═══════════════════════════════════════════

const DIMENSION_STANDARDS: Record<DesignCategory, string> = {
  architecture: `ARCHITECTURAL DIMENSION STANDARDS (from RAG FloorPlanCAD + ArchCAD):
- Exterior walls: 200-300mm thick. Interior walls: 100-150mm
- Door openings: single 900×2100mm, double 1600×2100mm
- Windows: sill height 900mm from floor, standard 1200×1000mm
- Ceiling height: 2700mm minimum residential
- Room minimums: bedroom 7sqm, bathroom 4sqm, kitchen 5sqm
- Corridors: minimum 1200mm wide
- Stairs: rise 150-200mm, run 250-300mm, width 900mm min
- Roof overhang: 300-600mm

COORDINATE SYSTEM: XZ plane = floor plan (top view). Y axis = height.
Use meters. Origin = center of design. Typical house footprint: ±5 to ±6 range.`,

  mechanical: `MECHANICAL DIMENSION STANDARDS (from RAG Mechanical-Parts):
- Metric bolts: M3(3mm shaft), M4(4mm), M5(5mm), M6(6mm), M8(8mm), M10(10mm)
- Thread pitch: M3=0.5, M4=0.7, M5=0.8, M6=1.0, M8=1.25, M10=1.5
- Bearings: 608(8×22×7mm), 6001(12×28×8mm), 6201(12×32×10mm)
- Press fit: shaft h6, housing H7
- Gear module = ref diameter / teeth. Addendum = module. Dedendum = 1.25×module
- Fillet radii: 0.5-2mm typical for stress relief
- Wall thickness: minimum 1mm for 3D printing, 2mm for machining

COORDINATE SYSTEM: Use millimeters. Parts centered at origin. Typical range: ±50mm.
Build sequence: base shape → holes → patterns → fillets LAST.`,

  furniture: `FURNITURE DIMENSION STANDARDS (from RAG Furniture-Standards):
- Beds: Single 900×2000mm, Double 1400×2000mm, Queen 1500×2000mm, King 1800×2000mm
- Desk: 1200×600×750mm. Office chair: 600×600×900-1100mm
- Dining table: 1500×900×750mm (6-seat). Dining chair: 450×450×900mm
- Kitchen base cabinet: 600mm deep, 870mm high. Wall cabinet: 300mm deep
- Countertop: 600mm deep, 900mm from floor
- Toilet: 380×700mm, 400mm high. Bathtub: 1700×700mm
- Clearance: 600mm around furniture for movement

COORDINATE SYSTEM: Use meters. Item centered at origin. Height = Y axis.`,

  character: `CHARACTER MODELING STANDARDS:
- Human proportions: ~7.5 heads tall. Head = 1 unit
- Shoulder width: ~2 head widths. Hip width: ~1.5 heads
- Arm length (shoulder to wrist): ~3 heads
- Leg length (hip to sole): ~4 heads
- Start with a box/cylinder base, use subdivision + sculpting
- Build in T-pose for rigging. Mirror along X axis
- Low-poly game character: 500-5000 triangles
- High-poly sculpt: 50k-500k polygons

COORDINATE SYSTEM: Y-up. Character centered at origin, feet at Y=0.
Use units where 1 unit = 1 meter.`,

  vehicle: `VEHICLE MODELING STANDARDS:
- Car: ~4.5m long, ~1.8m wide, ~1.5m tall
- Wheel diameter: 600-700mm. Tire width: 195-255mm
- Wheelbase: 2.5-2.9m. Track width: 1.5-1.6m
- Ground clearance: 150-200mm
- Start with side profile silhouette, then top profile, then cross sections

COORDINATE SYSTEM: X = width, Y = height, Z = length. Origin at center of wheelbase.`,

  electronics: `ELECTRONICS ENCLOSURE STANDARDS:
- PCB clearance: 3-5mm from walls. Standoff height: 5-10mm
- Vent slots: 1-2mm wide, 10-20mm long
- Wall thickness: 2-3mm for plastic enclosures
- Screw bosses: ID=screw diameter, OD=2×screw diameter
- USB port cutout: 12×5mm (Type-A), 9×3.2mm (Type-C)
- Snap-fit: deflection 0.5-1mm, wall thickness 1.5-2mm

COORDINATE SYSTEM: Use millimeters. Origin at center of base.`,

  general: `GENERAL CAD STANDARDS:
- Use component-by-component approach: 1 sketch + 1 extrude per component
- Feature order: base shape → cuts → holes → patterns → fillets/chamfers LAST
- Dimensions depend on the type of object being designed
- XZ plane = top/ground view, XY = front view, YZ = side view

COORDINATE SYSTEM: Origin at center. Scale depends on object type.`,
};

// ═══════════════════════════════════════════
// Modeling tips per category
// ═══════════════════════════════════════════

const MODELING_TIPS: Record<DesignCategory, string> = {
  architecture: `ARCHITECTURE MODELING TIPS:
1. Start with outer walls as rect on XZ plane → extrude to wall height (3m)
2. Add interior walls as thin rects (0.15m thick) → extrude same height
3. Switch to XY or YZ plane for door/window cutouts → extrude through wall
4. Add furniture as rects on XZ → extrude to item height
5. Roof goes last — slightly larger rect → extrude 0.3-0.4m
6. Use the 'generate' command for pre-built templates: generate 1bed, generate 2bed, generate 3bed
7. After generating, ask Claude to modify specific rooms or add features`,

  mechanical: `MECHANICAL PART MODELING TIPS:
1. Start with the main body (rect or circle on XZ) → extrude
2. Add secondary features (bosses, pockets) one at a time
3. Add holes using circle → extrude or the hole feature
4. Apply patterns (linear/circular) for repeated features
5. Fillets and chamfers go LAST — they must be applied to existing 3D geometry
6. For gears: use polygon entity with tooth count as sides
7. For threads: use helix feature after creating the cylinder`,

  furniture: `FURNITURE MODELING TIPS:
1. Build the main structure first (tabletop, seat, frame)
2. Add legs/supports as separate extrusions
3. Use thin rects for panels and shelves
4. Round edges with fillet for finished look
5. Standard heights: table 750mm, desk 750mm, chair seat 450mm, counter 900mm`,

  character: `CHARACTER MODELING TIPS:
1. Start in Object mode — create base mesh from primitives
2. Switch to Edit mode for vertex/edge/face manipulation
3. Use subdivision surface for smooth organic shapes
4. Use Mirror modifier for symmetry (build half, mirror the rest)
5. Sculpt mode for organic details (grab, smooth, inflate brushes)
6. Keep topology clean — quads for animation, no n-gons
7. Add armature in Object mode, then weight paint for skinning`,

  vehicle: `VEHICLE MODELING TIPS:
1. Start with side profile silhouette as a sketch
2. Extrude and shape the body in Edit mode
3. Add wheel wells as boolean subtracts
4. Wheels: cylinder + torus for tire
5. Use mirror for symmetry (only model one side)`,

  electronics: `ELECTRONICS ENCLOSURE TIPS:
1. Start with outer box → shell to create hollow enclosure
2. Add standoffs as small cylinders inside
3. Cut port openings with rects on wall planes
4. Add vent patterns with linear pattern of slots
5. Design lid as separate component with snap-fit or screw holes`,

  general: `GENERAL MODELING TIPS:
1. Build component by component — one sketch + one extrude each
2. Use the right plane: XZ for top-down, XY for front, YZ for side
3. Keep each component simple: 1-3 entities max before extruding
4. Label components with comment actions
5. Fillets and chamfers always go last`,
};

// ═══════════════════════════════════════════
// Classifier
// ═══════════════════════════════════════════

/**
 * Classify the design intent from a user prompt.
 */
export function classifyIntent(prompt: string): DesignIntent {
  const lower = prompt.toLowerCase();
  const scores: Map<DesignCategory, { score: number; matches: string[] }> = new Map();

  for (const pattern of PATTERNS) {
    let score = 0;
    const matches: string[] = [];

    // Check phrases first (higher weight)
    for (const phrase of pattern.phrases) {
      if (lower.includes(phrase)) {
        score += 3 * pattern.weight;
        matches.push(phrase);
      }
    }

    // Check individual keywords
    for (const kw of pattern.keywords) {
      // Word boundary check to avoid partial matches
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      if (regex.test(lower)) {
        score += 1 * pattern.weight;
        matches.push(kw);
      }
    }

    if (score > 0) {
      scores.set(pattern.category, { score, matches });
    }
  }

  // Find the highest scoring category
  let bestCategory: DesignCategory = "general";
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const [cat, { score, matches }] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
      bestMatches = matches;
    }
  }

  // Detect floor plan type
  let floorPlanType: FloorPlanType | null = null;
  if (bestCategory === "architecture") {
    if (/\b(1[\s-]?bed|one[\s-]?bed|studio|1bed)\b/i.test(prompt)) {
      floorPlanType = "1bed";
    } else if (/\b(2[\s-]?bed|two[\s-]?bed|2bed)\b/i.test(prompt)) {
      floorPlanType = "2bed";
    } else if (/\b(3[\s-]?bed|three[\s-]?bed|3bed)\b/i.test(prompt)) {
      floorPlanType = "3bed";
    } else if (/\b(house|home|apartment|flat)\b/i.test(prompt) && !floorPlanType) {
      floorPlanType = "2bed"; // Default to 2-bed for generic "house" requests
    }
  }

  // Detect sub-type
  let subType: string | null = null;
  if (bestCategory === "mechanical") {
    if (/gear/i.test(prompt)) subType = "gear";
    else if (/bolt|screw/i.test(prompt)) subType = "fastener";
    else if (/bearing/i.test(prompt)) subType = "bearing";
    else if (/bracket|mount/i.test(prompt)) subType = "bracket";
    else if (/spring/i.test(prompt)) subType = "spring";
  } else if (bestCategory === "furniture") {
    if (/table/i.test(prompt)) subType = "table";
    else if (/chair|stool/i.test(prompt)) subType = "chair";
    else if (/shelf|bookcase/i.test(prompt)) subType = "shelf";
    else if (/cabinet/i.test(prompt)) subType = "cabinet";
  }

  const maxPossible = Math.max(...PATTERNS.map(p => (p.keywords.length + p.phrases.length * 3) * p.weight));
  const confidence = Math.min(1, bestScore / (maxPossible * 0.15));

  return {
    category: bestCategory,
    confidence,
    matchedKeywords: [...new Set(bestMatches)],
    subType,
    floorPlanType,
  };
}

// ═══════════════════════════════════════════
// Context Builder
// ═══════════════════════════════════════════

/**
 * Build full design context for Claude based on classified intent.
 * This is injected into the Claude prompt to ground its output in real data.
 */
export function buildDesignContext(prompt: string): DesignContext {
  const intent = classifyIntent(prompt);

  // Get category-specific RAG context (more chunks for higher confidence)
  const topK = intent.confidence > 0.5 ? 8 : 5;
  const ragCategory = intent.category === "general" ? undefined
    : intent.category === "architecture" ? "architecture"
    : intent.category === "mechanical" ? "modeling"
    : intent.category === "furniture" ? "modeling"
    : undefined;

  // Multi-query RAG: search with both the original prompt AND category-specific terms
  const ragContext1 = formatContext(prompt, topK, ragCategory);
  const ragContext2 = intent.subType
    ? formatContext(`${intent.subType} dimensions standards CAD`, 3, ragCategory)
    : "";
  const ragContext = ragContext1 + ragContext2;

  // Get dimension standards
  const dimensionStandards = DIMENSION_STANDARDS[intent.category];

  // Get pre-built template if available
  let templateCommands: any[] | null = null;
  if (intent.floorPlanType) {
    try {
      const result = generateFloorPlan(intent.floorPlanType);
      templateCommands = result.commands;
    } catch { /* no template available */ }
  }

  // Get modeling tips
  const modelingTips = MODELING_TIPS[intent.category];

  return {
    intent,
    ragContext,
    dimensionStandards,
    templateCommands,
    modelingTips,
  };
}

/**
 * Format the full design context as a string for injection into the Claude prompt.
 */
export function formatDesignContext(ctx: DesignContext): string {
  let result = "";

  result += `\n\nDESIGN INTENT DETECTED: ${ctx.intent.category.toUpperCase()}`;
  if (ctx.intent.subType) result += ` (${ctx.intent.subType})`;
  result += ` — confidence: ${(ctx.intent.confidence * 100).toFixed(0)}%`;
  result += `\nMatched: ${ctx.intent.matchedKeywords.join(", ")}`;

  result += `\n\n${ctx.dimensionStandards}`;
  result += `\n\n${ctx.modelingTips}`;

  if (ctx.templateCommands) {
    result += `\n\nPRE-BUILT TEMPLATE AVAILABLE (${ctx.intent.floorPlanType} floor plan):`;
    result += `\nA complete ${ctx.intent.floorPlanType} template with ${ctx.templateCommands.length} commands is ready.`;
    result += `\nYou can use this as a starting point and modify it, or build from scratch.`;
    result += `\nTo use the template, output exactly: \`\`\`use-template\n${ctx.intent.floorPlanType}\n\`\`\``;
    result += `\nThen add any modifications as additional cad-commands blocks.`;
  }

  result += ctx.ragContext;

  return result;
}
