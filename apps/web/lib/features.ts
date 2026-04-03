/** Feature tree types for parametric modeling history. */

export type FeatureType =
  | "sketch"
  | "extrude"
  | "revolve"
  | "pocket"
  | "loft"
  | "sweep"
  | "fillet"
  | "chamfer"
  | "shell"
  | "boolean"
  | "linear_pattern"
  | "circular_pattern"
  | "draft" | "hole" | "rib" | "split" | "thicken" | "helix" | "curve_pattern"
  | "emboss";

export type FeatureStatus = "ready" | "computing" | "error";

export interface Feature {
  id: string;
  type: FeatureType;
  name: string;
  status: FeatureStatus;
  params: FeatureParams;
  /** Entity IDs this feature was created from */
  sourceEntityIds: string[];
  /** Mesh data if computed */
  mesh?: TessellatedMesh | null;
  visible: boolean;
}

export interface TessellatedMesh {
  vertices: number[]; // flat [x,y,z, x,y,z, ...]
  normals: number[];  // flat [nx,ny,nz, ...]
  indices: number[];  // triangle indices
}

export interface ExtrudeParams {
  distance: number;
  direction: "up" | "down" | "both";
}

export interface RevolveParams {
  angle: number; // degrees
  axis: "x" | "y" | "z";
}

export interface PocketParams {
  depth: number;
  direction: "up" | "down";
}

export interface LoftParams {
  /** IDs of sketch profiles to loft between */
  profileIds: string[];
  closed: boolean;
}

export interface SweepParams {
  /** ID of the sketch profile to sweep */
  profileId: string;
  /** ID of the path entity */
  pathId: string;
}

export interface FilletParams {
  radius: number;
  edgeIndices: number[];
}

export interface ChamferParams {
  distance: number;
  edgeIndices: number[];
}

export interface ShellParams {
  thickness: number;
  faceIndex: number;
}

export interface BooleanParams {
  operation: "union" | "subtract" | "intersect";
  /** ID of the other feature to combine with */
  targetFeatureId: string;
}

export interface LinearPatternParams {
  direction: [number, number, number];
  count: number;
  spacing: number;
}

export interface CircularPatternParams {
  axis: [number, number, number];
  center: [number, number, number];
  count: number;
  angle: number; // total angle in degrees
}

export interface DraftParams {
  /** Draft angle in degrees */
  angle: number;
  /** Pull direction vector */
  pullDirection: [number, number, number];
  /** Face indices to draft */
  faceIndices: number[];
  /** Neutral plane position along pull direction */
  neutralPlaneOffset: number;
}

export interface HoleParams {
  /** Hole center position */
  center: [number, number, number];
  /** Hole diameter */
  diameter: number;
  /** Hole depth (0 = through-all) */
  depth: number;
  /** Hole type */
  holeType: "simple" | "counterbore" | "countersink" | "tapped";
  /** Counterbore diameter (only for counterbore type) */
  cboreDiameter?: number;
  /** Counterbore depth */
  cboreDepth?: number;
  /** Countersink angle in degrees (typically 82 or 90) */
  csinkAngle?: number;
  /** Thread specification for tapped holes */
  threadSpec?: string;
}

export interface RibParams {
  /** Open profile entity IDs */
  profileIds: string[];
  /** Rib thickness */
  thickness: number;
  /** Direction: parallel or perpendicular to sketch */
  direction: "parallel" | "perpendicular";
}

export interface SplitParams {
  /** Splitting tool: sketch plane or surface */
  splitType: "plane" | "surface";
  /** Plane normal or surface feature ID */
  splitReference: [number, number, number] | string;
  /** Offset from reference */
  offset: number;
  /** Which side to keep */
  keepSide: "above" | "below" | "both";
}

export interface ThickenParams {
  /** Surface feature ID to thicken */
  surfaceId: string;
  /** Thickness value */
  thickness: number;
  /** Direction: inward, outward, or both */
  direction: "inward" | "outward" | "both";
}

export interface HelixParams {
  /** Base center position */
  center: [number, number, number];
  /** Helix radius */
  radius: number;
  /** Pitch (vertical distance per revolution) */
  pitch: number;
  /** Total height */
  height: number;
  /** Number of turns (alternative to height) */
  turns?: number;
  /** Taper angle in degrees (0 = cylindrical) */
  taperAngle: number;
  /** Direction: clockwise or counterclockwise */
  clockwise: boolean;
}

export interface CurvePatternParams {
  /** Path entity ID to pattern along */
  pathId: string;
  /** Number of copies */
  count: number;
  /** Whether to maintain original orientation */
  keepOrientation: boolean;
  /** Distance between copies (0 = evenly spaced) */
  spacing: number;
}

export interface EmbossParams {
  text: string;
  fontSize: number;
  depth: number;
  /** Whether to add or subtract material */
  mode: "add" | "remove";
  /** Face/surface to emboss on */
  faceIndex: number;
}

export type FeatureParams =
  | ExtrudeParams | RevolveParams | PocketParams | LoftParams | SweepParams
  | FilletParams | ChamferParams | ShellParams | BooleanParams
  | LinearPatternParams | CircularPatternParams
  | DraftParams | HoleParams | RibParams | SplitParams
  | ThickenParams | HelixParams | CurvePatternParams | EmbossParams
  | Record<string, unknown>;

let featureCounter = 0;
function nextFeatureId(): string {
  return `feat_${++featureCounter}_${Date.now()}`;
}

export function createExtrudeFeature(
  sourceEntityIds: string[],
  params: ExtrudeParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "extrude",
    name: `Extrude ${featureCounter}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds,
    mesh: mesh || null,
    visible: true,
  };
}

export function createRevolveFeature(
  sourceEntityIds: string[],
  params: RevolveParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "revolve",
    name: `Revolve ${featureCounter}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds,
    mesh: mesh || null,
    visible: true,
  };
}

export function createPocketFeature(
  sourceEntityIds: string[],
  params: PocketParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "pocket",
    name: `Pocket ${featureCounter}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds,
    mesh: mesh || null,
    visible: true,
  };
}

export function createBooleanFeature(
  sourceEntityIds: string[],
  params: BooleanParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "boolean",
    name: `${params.operation.charAt(0).toUpperCase() + params.operation.slice(1)} ${featureCounter}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds,
    mesh: mesh || null,
    visible: true,
  };
}

export function createLoftFeature(
  params: LoftParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "loft",
    name: `Loft ${featureCounter}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds: params.profileIds,
    mesh: mesh || null,
    visible: true,
  };
}

export function createSweepFeature(
  params: SweepParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "sweep",
    name: `Sweep ${featureCounter}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds: [params.profileId, params.pathId],
    mesh: mesh || null,
    visible: true,
  };
}

export function createFilletFeature(
  sourceFeatureId: string,
  params: FilletParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "fillet",
    name: `Fillet R${params.radius}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds: [sourceFeatureId],
    mesh: mesh || null,
    visible: true,
  };
}

export function createChamferFeature(
  sourceFeatureId: string,
  params: ChamferParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "chamfer",
    name: `Chamfer D${params.distance}`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds: [sourceFeatureId],
    mesh: mesh || null,
    visible: true,
  };
}

/**
 * Extrude ANY sketch entity into a 3D mesh.
 * This replaces the old type-specific logic with a universal extruder.
 */
export function extrudeEntityToMesh(entity: any, distance: number): TessellatedMesh | null {
  // Generate mesh in canonical XZ-plane orientation (Y = up/extrude direction)
  let mesh: TessellatedMesh | null = null;

  switch (entity.type) {
    case "rect":
      mesh = generateExtrudePreviewMesh(entity.x1, entity.z1, entity.x2, entity.z2, distance);
      break;
    case "circle":
      mesh = generateCylinderMesh(entity.cx, entity.cz, entity.radius, distance);
      break;
    case "ellipse":
      mesh = generateEllipsoidExtrudeMesh(entity.cx, entity.cz, entity.radiusX, entity.radiusZ, entity.rotation, distance);
      break;
    case "polygon":
      mesh = generatePolygonExtrudeMesh(entity.cx, entity.cz, entity.radius, entity.sides, entity.rotation, distance);
      break;
    case "slot":
      mesh = generateSlotExtrudeMesh(entity.x1, entity.z1, entity.x2, entity.z2, entity.width, distance);
      break;
    case "line":
      mesh = generateLineExtrudeMesh(entity.x1, entity.z1, entity.x2, entity.z2, distance, 0.05);
      break;
    case "arc":
      mesh = generateArcExtrudeMesh(entity.x1, entity.z1, entity.mx, entity.mz, entity.x2, entity.z2, distance);
      break;
    case "spline":
      mesh = generateSplineExtrudeMesh(entity.points, distance);
      break;
    default:
      return null;
  }

  if (!mesh) return null;

  // Transform mesh based on which plane the entity was drawn on.
  // Canonical generation uses XZ plane with Y as extrude direction.
  // For XY plane: extrude along Z → rotate -90° around X (swap Y↔Z)
  // For YZ plane: extrude along X → rotate 90° around Z (swap X↔Y)
  const plane = entity.plane || "xz";

  if (plane === "xy") {
    // Rotate: (x, y, z) → (x, z, -y) — extrude goes along Z instead of Y
    const v = mesh.vertices;
    const n = mesh.normals;
    for (let i = 0; i < v.length; i += 3) {
      const oy = v[i + 1], oz = v[i + 2];
      v[i + 1] = oz;
      v[i + 2] = -oy;
    }
    for (let i = 0; i < n.length; i += 3) {
      const oy = n[i + 1], oz = n[i + 2];
      n[i + 1] = oz;
      n[i + 2] = -oy;
    }
  } else if (plane === "yz") {
    // Rotate: (x, y, z) → (-y, x, z) — extrude goes along X instead of Y
    const v = mesh.vertices;
    const n = mesh.normals;
    for (let i = 0; i < v.length; i += 3) {
      const ox = v[i], oy = v[i + 1];
      v[i] = -oy;
      v[i + 1] = ox;
    }
    for (let i = 0; i < n.length; i += 3) {
      const ox = n[i], oy = n[i + 1];
      n[i] = -oy;
      n[i + 1] = ox;
    }
  }
  // "xz" and "3d" use canonical Y-up, no transform needed

  return mesh;
}

/** Generate a cylinder mesh (for circle extrude) */
function generateCylinderMesh(cx: number, cz: number, radius: number, height: number, segments: number = 32): TessellatedMesh {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Side walls
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const nx = Math.cos(angle), nz = Math.sin(angle);
    const x = cx + nx * radius, z = cz + nz * radius;
    vertices.push(x, 0, z); normals.push(nx, 0, nz);
    vertices.push(x, height, z); normals.push(nx, 0, nz);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  // Top cap
  const topCenter = vertices.length / 3;
  vertices.push(cx, height, cz); normals.push(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push(cx + Math.cos(angle) * radius, height, cz + Math.sin(angle) * radius);
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(topCenter, topCenter + 1 + i, topCenter + 2 + i);
  }

  // Bottom cap
  const botCenter = vertices.length / 3;
  vertices.push(cx, 0, cz); normals.push(0, -1, 0);
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push(cx + Math.cos(angle) * radius, 0, cz + Math.sin(angle) * radius);
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(botCenter, botCenter + 2 + i, botCenter + 1 + i);
  }

  return { vertices, normals, indices };
}

/** Extrude a polygon (N-sided prism) */
function generatePolygonExtrudeMesh(cx: number, cz: number, radius: number, sides: number, rotation: number, height: number): TessellatedMesh {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Generate bottom and top vertices
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    const x = cx + radius * Math.cos(angle);
    const z = cz + radius * Math.sin(angle);
    vertices.push(x, 0, z); // bottom
    vertices.push(x, height, z); // top
    normals.push(0, -1, 0); normals.push(0, 1, 0); // placeholder, recalculated per face
  }

  // Side faces
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    const b0 = i * 2, b1 = next * 2, t0 = i * 2 + 1, t1 = next * 2 + 1;
    // Calculate face normal
    const ax = vertices[b1 * 3] - vertices[b0 * 3], az = vertices[b1 * 3 + 2] - vertices[b0 * 3 + 2];
    const len = Math.hypot(ax, az) || 1;
    const nx = az / len, nz = -ax / len;

    const base = vertices.length / 3;
    // 4 verts for this side face
    vertices.push(vertices[b0*3], 0, vertices[b0*3+2]); normals.push(nx, 0, nz);
    vertices.push(vertices[b1*3], 0, vertices[b1*3+2]); normals.push(nx, 0, nz);
    vertices.push(vertices[b1*3], height, vertices[b1*3+2]); normals.push(nx, 0, nz);
    vertices.push(vertices[b0*3], height, vertices[b0*3+2]); normals.push(nx, 0, nz);
    indices.push(base, base+1, base+2, base, base+2, base+3);
  }

  // Top face (fan triangulation)
  const topBase = vertices.length / 3;
  vertices.push(cx, height, cz); normals.push(0, 1, 0);
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    vertices.push(cx + radius * Math.cos(angle), height, cz + radius * Math.sin(angle));
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < sides; i++) {
    indices.push(topBase, topBase + 1 + i, topBase + 1 + ((i + 1) % sides));
  }

  // Bottom face
  const botBase = vertices.length / 3;
  vertices.push(cx, 0, cz); normals.push(0, -1, 0);
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    vertices.push(cx + radius * Math.cos(angle), 0, cz + radius * Math.sin(angle));
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < sides; i++) {
    indices.push(botBase, botBase + 1 + ((i + 1) % sides), botBase + 1 + i);
  }

  return { vertices, normals, indices };
}

/** Extrude an ellipse into an elliptical cylinder */
function generateEllipsoidExtrudeMesh(cx: number, cz: number, rx: number, rz: number, rotation: number, height: number, segments: number = 32): TessellatedMesh {
  const cosR = Math.cos(rotation), sinR = Math.sin(rotation);
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const lx = rx * Math.cos(a), lz = rz * Math.sin(a);
    const x = cx + lx * cosR - lz * sinR;
    const z = cz + lx * sinR + lz * cosR;
    const nx = Math.cos(a), nz = Math.sin(a);
    vertices.push(x, 0, z); normals.push(nx, 0, nz);
    vertices.push(x, height, z); normals.push(nx, 0, nz);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  // Top/bottom caps (simplified as fan)
  const tc = vertices.length / 3;
  vertices.push(cx, height, cz); normals.push(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const lx = rx * Math.cos(a), lz = rz * Math.sin(a);
    vertices.push(cx + lx * cosR - lz * sinR, height, cz + lx * sinR + lz * cosR);
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < segments; i++) indices.push(tc, tc + 1 + i, tc + 2 + i);

  const bc = vertices.length / 3;
  vertices.push(cx, 0, cz); normals.push(0, -1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const lx = rx * Math.cos(a), lz = rz * Math.sin(a);
    vertices.push(cx + lx * cosR - lz * sinR, 0, cz + lx * sinR + lz * cosR);
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < segments; i++) indices.push(bc, bc + 2 + i, bc + 1 + i);

  return { vertices, normals, indices };
}

/** Extrude a slot (stadium shape = rect + semicircle ends) */
function generateSlotExtrudeMesh(x1: number, z1: number, x2: number, z2: number, width: number, height: number, segments: number = 16): TessellatedMesh {
  // Build 2D profile: two semicircles + two straight lines
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz) || 1;
  const nx = -dz / len, nz = dx / len;
  const profile: { x: number; z: number }[] = [];

  // Semicircle around point 2
  for (let i = 0; i <= segments; i++) {
    const a = Math.atan2(nz, nx) + (i / segments) * Math.PI;
    profile.push({ x: x2 + Math.cos(a) * width, z: z2 + Math.sin(a) * width });
  }
  // Semicircle around point 1
  for (let i = 0; i <= segments; i++) {
    const a = Math.atan2(nz, nx) + Math.PI + (i / segments) * Math.PI;
    profile.push({ x: x1 + Math.cos(a) * width, z: z1 + Math.sin(a) * width });
  }

  return extrudeProfile(profile, height);
}

/** Extrude a line into a thin wall */
function generateLineExtrudeMesh(x1: number, z1: number, x2: number, z2: number, height: number, thickness: number): TessellatedMesh {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * thickness, nz = (dx / len) * thickness;

  const profile = [
    { x: x1 + nx, z: z1 + nz },
    { x: x2 + nx, z: z2 + nz },
    { x: x2 - nx, z: z2 - nz },
    { x: x1 - nx, z: z1 - nz },
  ];
  return extrudeProfile(profile, height);
}

/** Extrude an arc into a curved wall */
function generateArcExtrudeMesh(x1: number, z1: number, mx: number, mz: number, x2: number, z2: number, height: number): TessellatedMesh {
  // Find arc center from 3 points
  const ax = (x1 + mx) / 2, az = (z1 + mz) / 2;
  const bx = (mx + x2) / 2, bz = (mz + z2) / 2;
  const d1x = -(mz - z1), d1z = mx - x1;
  const d2x = -(z2 - mz), d2z = x2 - mx;
  const denom = d1x * d2z - d1z * d2x;

  if (Math.abs(denom) < 1e-10) {
    // Degenerate arc — treat as line
    return generateLineExtrudeMesh(x1, z1, x2, z2, height, 0.05);
  }

  const t = ((bx - ax) * d2z - (bz - az) * d2x) / denom;
  const cx = ax + t * d1x, cz = az + t * d1z;
  const r = Math.hypot(x1 - cx, z1 - cz);
  const startAngle = Math.atan2(z1 - cz, x1 - cx);
  const endAngle = Math.atan2(z2 - cz, x2 - cx);
  let sweep = endAngle - startAngle;
  if (sweep < 0) sweep += Math.PI * 2;

  // Generate thick arc profile
  const segments = 24;
  const profile: { x: number; z: number }[] = [];
  const thickness = r * 0.08;
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + (i / segments) * sweep;
    profile.push({ x: cx + (r + thickness) * Math.cos(a), z: cz + (r + thickness) * Math.sin(a) });
  }
  for (let i = segments; i >= 0; i--) {
    const a = startAngle + (i / segments) * sweep;
    profile.push({ x: cx + (r - thickness) * Math.cos(a), z: cz + (r - thickness) * Math.sin(a) });
  }
  return extrudeProfile(profile, height);
}

/** Extrude a spline into a curved wall */
function generateSplineExtrudeMesh(points: number[], height: number): TessellatedMesh {
  const thickness = 0.05;
  const profile: { x: number; z: number }[] = [];

  // Forward pass (outer edge)
  for (let i = 0; i < points.length; i += 2) {
    profile.push({ x: points[i] + thickness, z: points[i + 1] + thickness });
  }
  // Reverse pass (inner edge)
  for (let i = points.length - 2; i >= 0; i -= 2) {
    profile.push({ x: points[i] - thickness, z: points[i + 1] - thickness });
  }
  return extrudeProfile(profile, height);
}

/**
 * Generic profile extruder — takes a 2D closed profile and extrudes it to height.
 * Creates side walls + top/bottom caps.
 */
function extrudeProfile(profile: { x: number; z: number }[], height: number): TessellatedMesh {
  const n = profile.length;
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Side walls
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const p0 = profile[i], p1 = profile[next];
    const dx = p1.x - p0.x, dz = p1.z - p0.z;
    const len = Math.hypot(dx, dz) || 1;
    const fnx = dz / len, fnz = -dx / len; // face normal

    const base = vertices.length / 3;
    vertices.push(p0.x, 0, p0.z); normals.push(fnx, 0, fnz);
    vertices.push(p1.x, 0, p1.z); normals.push(fnx, 0, fnz);
    vertices.push(p1.x, height, p1.z); normals.push(fnx, 0, fnz);
    vertices.push(p0.x, height, p0.z); normals.push(fnx, 0, fnz);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  // Top cap (fan triangulation)
  if (n >= 3) {
    const cx = profile.reduce((s, p) => s + p.x, 0) / n;
    const cz = profile.reduce((s, p) => s + p.z, 0) / n;
    const topCenter = vertices.length / 3;
    vertices.push(cx, height, cz); normals.push(0, 1, 0);
    for (const p of profile) { vertices.push(p.x, height, p.z); normals.push(0, 1, 0); }
    for (let i = 0; i < n; i++) {
      indices.push(topCenter, topCenter + 1 + i, topCenter + 1 + ((i + 1) % n));
    }

    // Bottom cap
    const botCenter = vertices.length / 3;
    vertices.push(cx, 0, cz); normals.push(0, -1, 0);
    for (const p of profile) { vertices.push(p.x, 0, p.z); normals.push(0, -1, 0); }
    for (let i = 0; i < n; i++) {
      indices.push(botCenter, botCenter + 1 + ((i + 1) % n), botCenter + 1 + i);
    }
  }

  return { vertices, normals, indices };
}

/** Generate a simple box mesh from extrude params (client-side preview). */
export function generateExtrudePreviewMesh(
  x1: number, z1: number, x2: number, z2: number,
  distance: number
): TessellatedMesh {
  const y0 = 0;
  const y1 = distance;
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);

  // 8 corners of the box
  const v = [
    minX, y0, minZ,  maxX, y0, minZ,  maxX, y0, maxZ,  minX, y0, maxZ, // bottom
    minX, y1, minZ,  maxX, y1, minZ,  maxX, y1, maxZ,  minX, y1, maxZ, // top
  ];

  // 6 faces × 2 triangles × 3 vertices
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const faces = [
    // bottom (y=0, normal -Y)
    [0,1,2, 0,2,3], [0,-1,0],
    // top (y=distance, normal +Y)
    [4,6,5, 4,7,6], [0,1,0],
    // front (z=maxZ, normal +Z)
    [3,2,6, 3,6,7], [0,0,1],
    // back (z=minZ, normal -Z)
    [0,5,1, 0,4,5], [0,0,-1],
    // right (x=maxX, normal +X)
    [1,5,6, 1,6,2], [1,0,0],
    // left (x=minX, normal -X)
    [0,3,7, 0,7,4], [-1,0,0],
  ];

  let idx = 0;
  for (let f = 0; f < faces.length; f += 2) {
    const faceIndices = faces[f] as number[];
    const normal = faces[f + 1] as number[];
    for (const vi of faceIndices) {
      vertices.push(v[vi * 3], v[vi * 3 + 1], v[vi * 3 + 2]);
      normals.push(normal[0], normal[1], normal[2]);
      indices.push(idx++);
    }
  }

  return { vertices, normals, indices };
}

/** Generate a cylinder mesh from revolve params (client-side preview). */
export function generateRevolvePreviewMesh(
  cx: number, cz: number, radius: number,
  height: number, segments: number = 24
): TessellatedMesh {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Side vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    const x = cx + nx * radius;
    const z = cz + nz * radius;

    // Bottom vertex
    vertices.push(x, 0, z);
    normals.push(nx, 0, nz);
    // Top vertex
    vertices.push(x, height, z);
    normals.push(nx, 0, nz);
  }

  // Side indices
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  return { vertices, normals, indices };
}

export function createDraftFeature(sourceEntityIds: string[], params: DraftParams, mesh?: TessellatedMesh): Feature {
  return { id: nextFeatureId(), type: "draft", name: `Draft ${params.angle}°`, status: mesh ? "ready" : "computing", params, sourceEntityIds, mesh: mesh || null, visible: true };
}

export function createHoleFeature(sourceEntityIds: string[], params: HoleParams, mesh?: TessellatedMesh): Feature {
  return { id: nextFeatureId(), type: "hole", name: `Hole ⌀${params.diameter}`, status: mesh ? "ready" : "computing", params, sourceEntityIds, mesh: mesh || null, visible: true };
}

export function createRibFeature(sourceEntityIds: string[], params: RibParams, mesh?: TessellatedMesh): Feature {
  return { id: nextFeatureId(), type: "rib", name: `Rib T${params.thickness}`, status: mesh ? "ready" : "computing", params, sourceEntityIds, mesh: mesh || null, visible: true };
}

export function createSplitFeature(sourceEntityIds: string[], params: SplitParams, mesh?: TessellatedMesh): Feature {
  return { id: nextFeatureId(), type: "split", name: `Split ${featureCounter}`, status: mesh ? "ready" : "computing", params, sourceEntityIds, mesh: mesh || null, visible: true };
}

export function createThickenFeature(sourceEntityIds: string[], params: ThickenParams, mesh?: TessellatedMesh): Feature {
  return { id: nextFeatureId(), type: "thicken", name: `Thicken ${params.thickness}`, status: mesh ? "ready" : "computing", params, sourceEntityIds, mesh: mesh || null, visible: true };
}

export function createHelixFeature(params: HelixParams, mesh?: TessellatedMesh): Feature {
  return { id: nextFeatureId(), type: "helix", name: `Helix P${params.pitch}`, status: mesh ? "ready" : "computing", params, sourceEntityIds: [], mesh: mesh || null, visible: true };
}

export function createCurvePatternFeature(sourceEntityIds: string[], params: CurvePatternParams, mesh?: TessellatedMesh): Feature {
  return { id: nextFeatureId(), type: "curve_pattern", name: `Curve Pattern ×${params.count}`, status: mesh ? "ready" : "computing", params, sourceEntityIds, mesh: mesh || null, visible: true };
}

/** Generate a hole preview mesh (cylinder subtraction preview). */
export function generateHolePreviewMesh(
  cx: number, cy: number, cz: number,
  diameter: number, depth: number,
  holeType: "simple" | "counterbore" | "countersink" | "tapped" = "simple",
  segments: number = 24
): TessellatedMesh {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const r = diameter / 2;
  const h = depth || 10; // through-all approximation

  // Cylinder body
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const nx = Math.cos(angle);
    const nz = Math.sin(angle);
    vertices.push(cx + nx * r, cy, cz + nz * r);
    normals.push(nx, 0, nz);
    vertices.push(cx + nx * r, cy - h, cz + nz * r);
    normals.push(nx, 0, nz);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  // Counterbore: add wider cylinder at top
  if (holeType === "counterbore") {
    const cboreR = r * 1.5;
    const cboreD = h * 0.3;
    const offset = vertices.length / 3;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nx = Math.cos(angle), nz = Math.sin(angle);
      vertices.push(cx + nx * cboreR, cy, cz + nz * cboreR);
      normals.push(nx, 0, nz);
      vertices.push(cx + nx * cboreR, cy - cboreD, cz + nz * cboreR);
      normals.push(nx, 0, nz);
    }
    for (let i = 0; i < segments; i++) {
      const a = offset + i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Countersink: add cone at top
  if (holeType === "countersink") {
    const csinkR = r * 1.8;
    const offset = vertices.length / 3;
    // Cone apex at hole entrance, base wider
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nx = Math.cos(angle), nz = Math.sin(angle);
      vertices.push(cx + nx * csinkR, cy, cz + nz * csinkR);
      normals.push(nx, 0.5, nz);
      vertices.push(cx + nx * r, cy - r * 0.6, cz + nz * r);
      normals.push(nx, 0.5, nz);
    }
    for (let i = 0; i < segments; i++) {
      const a = offset + i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  return { vertices, normals, indices };
}

/** Generate a helix curve mesh (tube along helical path). */
export function generateHelixMesh(
  params: HelixParams,
  tubeRadius: number = 0.05,
  segments: number = 200,
  tubeSegments: number = 8
): TessellatedMesh {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const totalTurns = params.turns ?? (params.height / params.pitch);
  const totalAngle = totalTurns * Math.PI * 2;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = totalAngle * t * (params.clockwise ? -1 : 1);
    const currentRadius = params.radius + (params.taperAngle ? t * params.height * Math.tan(params.taperAngle * Math.PI / 180) : 0);
    const cx = params.center[0] + currentRadius * Math.cos(angle);
    const cy = params.center[1] + t * params.height;
    const cz = params.center[2] + currentRadius * Math.sin(angle);

    // Tangent vector for Frenet frame
    const nextT = Math.min(t + 0.001, 1);
    const nextAngle = totalAngle * nextT * (params.clockwise ? -1 : 1);
    const nextR = params.radius + (params.taperAngle ? nextT * params.height * Math.tan(params.taperAngle * Math.PI / 180) : 0);
    const tx = nextR * Math.cos(nextAngle) - currentRadius * Math.cos(angle);
    const ty = 0.001 * params.height;
    const tz = nextR * Math.sin(nextAngle) - currentRadius * Math.sin(angle);
    const tLen = Math.hypot(tx, ty, tz) || 1;

    // Create tube cross-section
    for (let j = 0; j <= tubeSegments; j++) {
      const phi = (j / tubeSegments) * Math.PI * 2;
      // Approximate normal/binormal
      const nx = Math.cos(angle + Math.PI / 2) * Math.cos(phi);
      const ny = Math.sin(phi);
      const nz = Math.sin(angle + Math.PI / 2) * Math.cos(phi);
      vertices.push(cx + nx * tubeRadius, cy + ny * tubeRadius, cz + nz * tubeRadius);
      normals.push(nx, ny, nz);
    }
  }

  // Connect tube segments
  const ringSize = tubeSegments + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < tubeSegments; j++) {
      const a = i * ringSize + j;
      const b = a + ringSize;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return { vertices, normals, indices };
}

export function createEmbossFeature(
  sourceEntityIds: string[],
  params: EmbossParams,
  mesh?: TessellatedMesh
): Feature {
  return {
    id: nextFeatureId(),
    type: "emboss",
    name: `Emboss "${params.text}"`,
    status: mesh ? "ready" : "computing",
    params,
    sourceEntityIds,
    mesh: mesh || null,
    visible: true,
  };
}

/** Generate embossed text mesh (simplified: creates raised rectangular blocks per character). */
export function generateEmbossPreviewMesh(
  text: string,
  fontSize: number,
  depth: number,
  startX: number = 0,
  startY: number = 0,
  startZ: number = 0
): TessellatedMesh {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const charWidth = fontSize * 0.6;
  const charHeight = fontSize;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") continue;
    const cx = startX + i * charWidth;
    const x0 = cx, x1 = cx + charWidth * 0.8;
    const y0 = startY, y1 = startY + charHeight;
    const z0 = startZ, z1 = startZ + depth;

    const base = vertices.length / 3;
    // Front face
    vertices.push(x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1);
    normals.push(0,0,1, 0,0,1, 0,0,1, 0,0,1);
    indices.push(base,base+1,base+2, base,base+2,base+3);
    // Top face
    const t = base + 4;
    vertices.push(x0,y1,z0, x1,y1,z0, x1,y1,z1, x0,y1,z1);
    normals.push(0,1,0, 0,1,0, 0,1,0, 0,1,0);
    indices.push(t,t+1,t+2, t,t+2,t+3);
    // Right face
    const r = base + 8;
    vertices.push(x1,y0,z0, x1,y0,z1, x1,y1,z1, x1,y1,z0);
    normals.push(1,0,0, 1,0,0, 1,0,0, 1,0,0);
    indices.push(r,r+1,r+2, r,r+2,r+3);
  }
  return { vertices, normals, indices };
}
