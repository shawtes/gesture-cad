/**
 * Assembly Manager — multi-body component management.
 *
 * Handles component insertion, transform stacking, mate application,
 * interference detection, and exploded view generation.
 */

import type { TessellatedMesh } from "../features";

export interface AssemblyComponent {
  id: string;
  name: string;
  /** Feature IDs that make up this component */
  featureIds: string[];
  /** Combined mesh of all features */
  mesh: TessellatedMesh | null;
  /** World position */
  position: [number, number, number];
  /** Euler rotation in radians */
  rotation: [number, number, number];
  /** Uniform scale */
  scale: number;
  /** Whether this component is locked in place */
  grounded: boolean;
  visible: boolean;
  /** Color for display */
  color: string;
}

/** Quaternion representation: [w, x, y, z] — avoids gimbal lock, enables SLERP */
export type Quaternion = [number, number, number, number];

/** Mate connector: local coordinate frame attached to geometry */
export interface MateConnector {
  id: string;
  /** Origin point in part-local space */
  origin: [number, number, number];
  /** Primary axis (Z) */
  primaryAxis: [number, number, number];
  /** Secondary axis (X) */
  secondaryAxis: [number, number, number];
  /** Component ID this connector belongs to */
  componentId: string;
}

export type MateType =
  | "coincident" | "concentric" | "distance" | "angle" | "tangent" | "lock"
  | "revolute" | "slider" | "cylindrical" | "planar" | "ball" | "pin_slot" | "gear";

export interface AssemblyMate {
  id: string;
  type: MateType;
  componentA: string;
  componentB: string;
  /** For distance/angle mates */
  value?: number;
  /** Which face/edge on each component */
  referenceA?: string;
  referenceB?: string;
  /** Degrees of freedom remaining after this mate */
  dofRemaining?: number;
}

export interface AssemblyState {
  components: AssemblyComponent[];
  mates: AssemblyMate[];
  activeComponentId: string | null;
}

let counter = 0;
function nextId(prefix: string): string {
  return `${prefix}_${++counter}_${Date.now()}`;
}

const COMPONENT_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#a855f7",
];

export function createComponent(
  name: string,
  featureIds: string[],
  mesh: TessellatedMesh | null,
  position: [number, number, number] = [0, 0, 0]
): AssemblyComponent {
  const id = nextId("comp");
  return {
    id,
    name,
    featureIds,
    mesh,
    position,
    rotation: [0, 0, 0],
    scale: 1,
    grounded: false,
    visible: true,
    color: COMPONENT_COLORS[counter % COMPONENT_COLORS.length],
  };
}

export function createMate(
  type: MateType,
  componentA: string,
  componentB: string,
  value?: number
): AssemblyMate {
  return { id: nextId("mate"), type, componentA, componentB, value };
}

/**
 * Apply a coincident mate — snap componentB's position to componentA's.
 * Simplified: moves B to A's position. Real solver would align faces.
 */
export function applyCoincidentMate(
  components: AssemblyComponent[],
  mate: AssemblyMate
): AssemblyComponent[] {
  return components.map((c) => {
    if (c.id === mate.componentB) {
      const a = components.find((x) => x.id === mate.componentA);
      if (a) {
        return { ...c, position: [...a.position] as [number, number, number] };
      }
    }
    return c;
  });
}

/**
 * Apply a distance mate — position componentB at a fixed distance from A.
 */
export function applyDistanceMate(
  components: AssemblyComponent[],
  mate: AssemblyMate
): AssemblyComponent[] {
  const dist = mate.value ?? 2;
  return components.map((c) => {
    if (c.id === mate.componentB) {
      const a = components.find((x) => x.id === mate.componentA);
      if (a) {
        return {
          ...c,
          position: [a.position[0] + dist, a.position[1], a.position[2]] as [number, number, number],
        };
      }
    }
    return c;
  });
}

/**
 * Check interference between two components using AABB overlap.
 */
export function checkInterference(a: AssemblyComponent, b: AssemblyComponent): boolean {
  if (!a.mesh || !b.mesh) return false;

  const bboxA = computeBBox(a.mesh.vertices, a.position);
  const bboxB = computeBBox(b.mesh.vertices, b.position);

  return (
    bboxA.min[0] <= bboxB.max[0] && bboxA.max[0] >= bboxB.min[0] &&
    bboxA.min[1] <= bboxB.max[1] && bboxA.max[1] >= bboxB.min[1] &&
    bboxA.min[2] <= bboxB.max[2] && bboxA.max[2] >= bboxB.min[2]
  );
}

function computeBBox(
  vertices: number[],
  offset: [number, number, number]
): { min: [number, number, number]; max: [number, number, number] } {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i] + offset[0];
    const y = vertices[i + 1] + offset[1];
    const z = vertices[i + 2] + offset[2];
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }

  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

/**
 * Generate exploded view positions — move components apart along assembly vectors.
 */
export function computeExplodedPositions(
  components: AssemblyComponent[],
  explosionFactor: number = 2.0
): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>();

  // Center of all components
  let cx = 0, cy = 0, cz = 0;
  for (const c of components) {
    cx += c.position[0]; cy += c.position[1]; cz += c.position[2];
  }
  cx /= components.length || 1;
  cy /= components.length || 1;
  cz /= components.length || 1;

  for (const c of components) {
    if (c.grounded) {
      positions.set(c.id, [...c.position]);
      continue;
    }
    const dx = c.position[0] - cx;
    const dy = c.position[1] - cy;
    const dz = c.position[2] - cz;
    positions.set(c.id, [
      c.position[0] + dx * explosionFactor,
      c.position[1] + dy * explosionFactor,
      c.position[2] + dz * explosionFactor,
    ]);
  }

  return positions;
}

/**
 * Generate a Bill of Materials from assembly components.
 */
export function generateBOM(
  components: AssemblyComponent[]
): { name: string; quantity: number; id: string }[] {
  const counts = new Map<string, { name: string; quantity: number; id: string }>();
  for (const c of components) {
    const existing = counts.get(c.name);
    if (existing) {
      existing.quantity++;
    } else {
      counts.set(c.name, { name: c.name, quantity: 1, id: c.id });
    }
  }
  return Array.from(counts.values());
}

// ═══════════════════════════════════════════
// Quaternion Mathematics
// ═══════════════════════════════════════════

export function quaternionIdentity(): Quaternion {
  return [1, 0, 0, 0];
}

export function quaternionFromAxisAngle(axis: [number, number, number], angle: number): Quaternion {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const halfAngle = angle / 2;
  const s = Math.sin(halfAngle);
  return [
    Math.cos(halfAngle),
    (axis[0] / len) * s,
    (axis[1] / len) * s,
    (axis[2] / len) * s,
  ];
}

export function quaternionMultiply(a: Quaternion, b: Quaternion): Quaternion {
  return [
    a[0]*b[0] - a[1]*b[1] - a[2]*b[2] - a[3]*b[3],
    a[0]*b[1] + a[1]*b[0] + a[2]*b[3] - a[3]*b[2],
    a[0]*b[2] - a[1]*b[3] + a[2]*b[0] + a[3]*b[1],
    a[0]*b[3] + a[1]*b[2] - a[2]*b[1] + a[3]*b[0],
  ];
}

export function quaternionInverse(q: Quaternion): Quaternion {
  const norm2 = q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3];
  return [q[0]/norm2, -q[1]/norm2, -q[2]/norm2, -q[3]/norm2];
}

export function quaternionToMatrix(q: Quaternion): number[] {
  const [w, x, y, z] = q;
  return [
    1 - 2*(y*y + z*z),  2*(x*y - w*z),      2*(x*z + w*y),      0,
    2*(x*y + w*z),      1 - 2*(x*x + z*z),  2*(y*z - w*x),      0,
    2*(x*z - w*y),      2*(y*z + w*x),      1 - 2*(x*x + y*y),  0,
    0, 0, 0, 1,
  ];
}

/** Spherical linear interpolation for smooth transitions */
export function slerp(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
  let dot = q1[0]*q2[0] + q1[1]*q2[1] + q1[2]*q2[2] + q1[3]*q2[3];

  // Handle negative dot (shortest path)
  let b = [...q2] as Quaternion;
  if (dot < 0) {
    dot = -dot;
    b = [-q2[0], -q2[1], -q2[2], -q2[3]];
  }

  if (dot > 0.9995) {
    // Linear interpolation for very close quaternions
    return [
      q1[0] + t * (b[0] - q1[0]),
      q1[1] + t * (b[1] - q1[1]),
      q1[2] + t * (b[2] - q1[2]),
      q1[3] + t * (b[3] - q1[3]),
    ];
  }

  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sinTheta;
  const w2 = Math.sin(t * theta) / sinTheta;

  return [
    w1 * q1[0] + w2 * b[0],
    w1 * q1[1] + w2 * b[1],
    w1 * q1[2] + w2 * b[2],
    w1 * q1[3] + w2 * b[3],
  ];
}

/** Rotate a 3D point by a quaternion */
export function rotatePoint(point: [number, number, number], q: Quaternion): [number, number, number] {
  const [w, x, y, z] = q;
  const [px, py, pz] = point;

  // q * p * q^-1 (optimized)
  const ix = w * px + y * pz - z * py;
  const iy = w * py + z * px - x * pz;
  const iz = w * pz + x * py - y * px;
  const iw = -x * px - y * py - z * pz;

  return [
    ix * w + iw * (-x) + iy * (-z) - iz * (-y),
    iy * w + iw * (-y) + iz * (-x) - ix * (-z),
    iz * w + iw * (-z) + ix * (-y) - iy * (-x),
  ];
}

// ═══════════════════════════════════════════
// New Mate Solvers
// ═══════════════════════════════════════════

/** DOF table per mate type (from Onshape research) */
export const MATE_DOF_TABLE: Record<MateType, { removed: number; remaining: number; description: string }> = {
  lock:        { removed: 6, remaining: 0, description: "Fully fixed relative position" },
  coincident:  { removed: 6, remaining: 0, description: "Coincident (simplified as lock)" },
  concentric:  { removed: 4, remaining: 2, description: "Shared axis, free rotation + translation" },
  revolute:    { removed: 5, remaining: 1, description: "Rotation about one axis" },
  slider:      { removed: 5, remaining: 1, description: "Translation along one axis" },
  cylindrical: { removed: 4, remaining: 2, description: "Rotation + translation on same axis" },
  planar:      { removed: 3, remaining: 3, description: "Contact on a plane" },
  ball:        { removed: 3, remaining: 3, description: "Rotation about a point" },
  pin_slot:    { removed: 4, remaining: 2, description: "Rotation + translation on different axes" },
  distance:    { removed: 1, remaining: 5, description: "Fixed distance between elements" },
  angle:       { removed: 1, remaining: 5, description: "Fixed angle between elements" },
  tangent:     { removed: 1, remaining: 5, description: "Surface contact" },
  gear:        { removed: 4, remaining: 2, description: "Synchronized rotation with gear ratio" },
};

/** Apply revolute mate: free rotation about shared Z axis */
export function applyRevoluteMate(
  components: AssemblyComponent[],
  mate: AssemblyMate,
  angle: number = 0
): AssemblyComponent[] {
  return components.map((c) => {
    if (c.id === mate.componentB) {
      const a = components.find((x) => x.id === mate.componentA);
      if (a) {
        return { ...c, position: [...a.position] as [number, number, number], rotation: [0, angle, 0] as [number, number, number] };
      }
    }
    return c;
  });
}

/** Apply slider mate: free translation along Z axis */
export function applySliderMate(
  components: AssemblyComponent[],
  mate: AssemblyMate,
  distance: number = 0
): AssemblyComponent[] {
  return components.map((c) => {
    if (c.id === mate.componentB) {
      const a = components.find((x) => x.id === mate.componentA);
      if (a) {
        return { ...c, position: [a.position[0], a.position[1] + distance, a.position[2]] as [number, number, number] };
      }
    }
    return c;
  });
}

/** Apply cylindrical mate: free rotation + translation on same axis */
export function applyCylindricalMate(
  components: AssemblyComponent[],
  mate: AssemblyMate,
  angle: number = 0,
  distance: number = 0
): AssemblyComponent[] {
  return components.map((c) => {
    if (c.id === mate.componentB) {
      const a = components.find((x) => x.id === mate.componentA);
      if (a) {
        return {
          ...c,
          position: [a.position[0], a.position[1] + distance, a.position[2]] as [number, number, number],
          rotation: [0, angle, 0] as [number, number, number],
        };
      }
    }
    return c;
  });
}

/** Apply planar mate: contact on a plane (3 DOF remaining) */
export function applyPlanarMate(
  components: AssemblyComponent[],
  mate: AssemblyMate
): AssemblyComponent[] {
  return components.map((c) => {
    if (c.id === mate.componentB) {
      const a = components.find((x) => x.id === mate.componentA);
      if (a) {
        // Constrain Y position to match (planar contact)
        return { ...c, position: [c.position[0], a.position[1], c.position[2]] as [number, number, number] };
      }
    }
    return c;
  });
}

/** Apply ball/spherical mate: rotation about a point (3 DOF remaining) */
export function applyBallMate(
  components: AssemblyComponent[],
  mate: AssemblyMate
): AssemblyComponent[] {
  return applyCoincidentMate(components, mate); // Same position, free rotation
}

// ═══════════════════════════════════════════
// GJK Narrow Phase Interference Detection
// ═══════════════════════════════════════════

interface GJKSupport {
  vertices: [number, number, number][];
}

/** Support function: find the point farthest in a given direction */
function support(shape: GJKSupport, direction: [number, number, number]): [number, number, number] {
  let maxDot = -Infinity;
  let best: [number, number, number] = [0, 0, 0];

  for (const v of shape.vertices) {
    const dot = v[0] * direction[0] + v[1] * direction[1] + v[2] * direction[2];
    if (dot > maxDot) {
      maxDot = dot;
      best = v;
    }
  }
  return best;
}

/** Minkowski difference support */
function minkowskiSupport(
  a: GJKSupport, b: GJKSupport,
  direction: [number, number, number]
): [number, number, number] {
  const sa = support(a, direction);
  const sb = support(b, [-direction[0], -direction[1], -direction[2]]);
  return [sa[0] - sb[0], sa[1] - sb[1], sa[2] - sb[2]];
}

/**
 * GJK Algorithm — determine if two convex shapes intersect.
 * Returns true if the Minkowski difference contains the origin.
 */
export function gjkIntersect(a: GJKSupport, b: GJKSupport): boolean {
  let direction: [number, number, number] = [1, 0, 0];
  const simplex: [number, number, number][] = [];

  // Initial support point
  const initial = minkowskiSupport(a, b, direction);
  simplex.push(initial);
  direction = [-initial[0], -initial[1], -initial[2]];

  for (let iter = 0; iter < 64; iter++) {
    const newPoint = minkowskiSupport(a, b, direction);
    const dot = newPoint[0] * direction[0] + newPoint[1] * direction[1] + newPoint[2] * direction[2];

    if (dot < 0) return false; // No intersection

    simplex.push(newPoint);

    if (simplex.length === 2) {
      // Line case
      const [b0, a0] = simplex;
      const ab: [number, number, number] = [b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2]];
      const ao: [number, number, number] = [-a0[0], -a0[1], -a0[2]];
      // Triple cross product: AB × AO × AB
      const abxao = [
        ab[1] * ao[2] - ab[2] * ao[1],
        ab[2] * ao[0] - ab[0] * ao[2],
        ab[0] * ao[1] - ab[1] * ao[0],
      ] as [number, number, number];
      direction = [
        abxao[1] * ab[2] - abxao[2] * ab[1],
        abxao[2] * ab[0] - abxao[0] * ab[2],
        abxao[0] * ab[1] - abxao[1] * ab[0],
      ];

      if (Math.hypot(...direction) < 1e-10) return true;
    } else if (simplex.length === 3) {
      // Triangle case — check if origin is inside
      const [c0, b0, a0] = simplex;
      const ab: [number, number, number] = [b0[0]-a0[0], b0[1]-a0[1], b0[2]-a0[2]];
      const ac: [number, number, number] = [c0[0]-a0[0], c0[1]-a0[1], c0[2]-a0[2]];
      const ao: [number, number, number] = [-a0[0], -a0[1], -a0[2]];
      const normal: [number, number, number] = [
        ab[1]*ac[2]-ab[2]*ac[1],
        ab[2]*ac[0]-ab[0]*ac[2],
        ab[0]*ac[1]-ab[1]*ac[0],
      ];
      direction = (normal[0]*ao[0]+normal[1]*ao[1]+normal[2]*ao[2]) > 0
        ? normal
        : [-normal[0], -normal[1], -normal[2]];
    } else if (simplex.length === 4) {
      // Tetrahedron — origin may be inside
      return true; // Simplified: if we have 4 points, assume intersection
    }
  }

  return false;
}

/** Convert mesh vertices to GJK-compatible format */
export function meshToConvexHull(vertices: number[], offset: [number, number, number]): GJKSupport {
  const points: [number, number, number][] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    points.push([
      vertices[i] + offset[0],
      vertices[i + 1] + offset[1],
      vertices[i + 2] + offset[2],
    ]);
  }
  return { vertices: points };
}

/** Full interference check: broad phase (AABB) + narrow phase (GJK) */
export function checkInterferenceGJK(a: AssemblyComponent, b: AssemblyComponent): boolean {
  // Broad phase: AABB
  if (!checkInterference(a, b)) return false;

  // Narrow phase: GJK
  if (!a.mesh || !b.mesh) return false;
  const hullA = meshToConvexHull(a.mesh.vertices, a.position);
  const hullB = meshToConvexHull(b.mesh.vertices, b.position);
  return gjkIntersect(hullA, hullB);
}

// ═══════════════════════════════════════════
// Configuration System
// ═══════════════════════════════════════════

export interface ConfigurationVariable {
  id: string;
  name: string;
  type: "number" | "boolean" | "enum";
  value: number | boolean | string;
  options?: string[]; // For enum type
  min?: number;
  max?: number;
}

export interface Configuration {
  id: string;
  name: string;
  variables: Record<string, number | boolean | string>;
}

export interface ConfigurationTable {
  variables: ConfigurationVariable[];
  configurations: Configuration[];
  activeConfigId: string | null;
}

export function createConfigurationTable(): ConfigurationTable {
  return {
    variables: [],
    configurations: [],
    activeConfigId: null,
  };
}

export function addConfigVariable(
  table: ConfigurationTable,
  name: string,
  type: "number" | "boolean" | "enum",
  defaultValue: number | boolean | string,
  options?: string[]
): ConfigurationTable {
  const variable: ConfigurationVariable = {
    id: nextId("cfgvar"),
    name,
    type,
    value: defaultValue,
    options,
  };
  return { ...table, variables: [...table.variables, variable] };
}

export function addConfiguration(
  table: ConfigurationTable,
  name: string,
  values: Record<string, number | boolean | string>
): ConfigurationTable {
  const config: Configuration = {
    id: nextId("cfg"),
    name,
    variables: values,
  };
  return { ...table, configurations: [...table.configurations, config] };
}

export function activateConfiguration(
  table: ConfigurationTable,
  configId: string
): ConfigurationTable {
  const config = table.configurations.find((c) => c.id === configId);
  if (!config) return table;

  const updatedVars = table.variables.map((v) => ({
    ...v,
    value: config.variables[v.name] ?? v.value,
  }));

  return { ...table, variables: updatedVars, activeConfigId: configId };
}

// ═══════════════════════════════════════════
// Snap Mode
// ═══════════════════════════════════════════

/** Find the nearest mate connector within snap distance */
export function findNearestMateConnector(
  connectors: MateConnector[],
  targetPoint: [number, number, number],
  snapDistance: number = 0.5
): MateConnector | null {
  let best: MateConnector | null = null;
  let bestDist = snapDistance;

  for (const mc of connectors) {
    const d = Math.hypot(
      mc.origin[0] - targetPoint[0],
      mc.origin[1] - targetPoint[1],
      mc.origin[2] - targetPoint[2]
    );
    if (d < bestDist) {
      bestDist = d;
      best = mc;
    }
  }
  return best;
}

/** Auto-snap a component to the nearest mate connector */
export function snapComponent(
  component: AssemblyComponent,
  targetConnector: MateConnector
): AssemblyComponent {
  return {
    ...component,
    position: [...targetConnector.origin] as [number, number, number],
  };
}

/** Generate mate connectors for a component (face centers, edge midpoints) */
export function autoGenerateMateConnectors(
  component: AssemblyComponent
): MateConnector[] {
  const connectors: MateConnector[] = [];
  if (!component.mesh) return connectors;

  const verts = component.mesh.vertices;
  const pos = component.position;

  // Generate connectors at vertex extremes (simplified)
  let minY = Infinity, maxY = -Infinity;
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < verts.length; i += 3) {
    minX = Math.min(minX, verts[i]); maxX = Math.max(maxX, verts[i]);
    minY = Math.min(minY, verts[i+1]); maxY = Math.max(maxY, verts[i+1]);
    minZ = Math.min(minZ, verts[i+2]); maxZ = Math.max(maxZ, verts[i+2]);
  }

  const cx = (minX + maxX) / 2 + pos[0];
  const cy = (minY + maxY) / 2 + pos[1];
  const cz = (minZ + maxZ) / 2 + pos[2];

  // Center connector
  connectors.push({ id: `mc_${component.id}_center`, origin: [cx, cy, cz], primaryAxis: [0,1,0], secondaryAxis: [1,0,0], componentId: component.id });
  // Top face
  connectors.push({ id: `mc_${component.id}_top`, origin: [cx, maxY + pos[1], cz], primaryAxis: [0,1,0], secondaryAxis: [1,0,0], componentId: component.id });
  // Bottom face
  connectors.push({ id: `mc_${component.id}_bottom`, origin: [cx, minY + pos[1], cz], primaryAxis: [0,-1,0], secondaryAxis: [1,0,0], componentId: component.id });
  // Front face
  connectors.push({ id: `mc_${component.id}_front`, origin: [cx, cy, maxZ + pos[2]], primaryAxis: [0,0,1], secondaryAxis: [1,0,0], componentId: component.id });

  return connectors;
}

/** Apply gear relation: synchronized rotation with ratio */
export function applyGearMate(
  components: AssemblyComponent[],
  mate: AssemblyMate,
  inputAngle: number,
  gearRatio: number = 2
): AssemblyComponent[] {
  const outputAngle = inputAngle * gearRatio;
  return components.map((c) => {
    if (c.id === mate.componentA) {
      return { ...c, rotation: [0, inputAngle, 0] as [number, number, number] };
    }
    if (c.id === mate.componentB) {
      return { ...c, rotation: [0, -outputAngle, 0] as [number, number, number] };
    }
    return c;
  });
}

// ═══════════════════════════════════════════
// Mate Animation
// ═══════════════════════════════════════════

export interface MateAnimation {
  mateId: string;
  type: "revolute" | "slider";
  startValue: number;
  endValue: number;
  duration: number; // ms
  loop: boolean;
}

/** Compute animation value at a given time */
export function animateMateValue(anim: MateAnimation, timeMs: number): number {
  const t = anim.loop
    ? (timeMs % anim.duration) / anim.duration
    : Math.min(timeMs / anim.duration, 1);
  // Ease in-out
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return anim.startValue + (anim.endValue - anim.startValue) * ease;
}

/** Apply animated mate value to components */
export function applyAnimatedMate(
  components: AssemblyComponent[],
  mate: AssemblyMate,
  animValue: number
): AssemblyComponent[] {
  switch (mate.type) {
    case "revolute":
      return applyRevoluteMate(components, mate, animValue);
    case "slider":
      return applySliderMate(components, mate, animValue);
    default:
      return components;
  }
}

// ═══════════════════════════════════════════
// Fastener Replication
// ═══════════════════════════════════════════

/** Replicate a component at multiple positions (for fasteners/hardware) */
export function replicateComponent(
  component: AssemblyComponent,
  positions: [number, number, number][]
): AssemblyComponent[] {
  return positions.map((pos, i) => ({
    ...component,
    id: `${component.id}_rep_${i}`,
    name: `${component.name} (${i + 1})`,
    position: pos,
  }));
}

/** Generate positions for fastener replication along a circular pattern */
export function generateFastenerPositions(
  center: [number, number, number],
  radius: number,
  count: number,
  startAngle: number = 0
): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i / count) * Math.PI * 2;
    positions.push([
      center[0] + radius * Math.cos(angle),
      center[1],
      center[2] + radius * Math.sin(angle),
    ]);
  }
  return positions;
}

// ═══════════════════════════════════════════
// Assembly Grouping
// ═══════════════════════════════════════════

export interface AssemblyGroup {
  id: string;
  name: string;
  componentIds: string[];
  collapsed: boolean;
  color?: string;
}

let groupCounter = 0;

export function createAssemblyGroup(
  name: string,
  componentIds: string[]
): AssemblyGroup {
  return {
    id: `group_${++groupCounter}_${Date.now()}`,
    name,
    componentIds,
    collapsed: false,
  };
}

/** Move components as a group (applies same delta to all) */
export function moveGroup(
  components: AssemblyComponent[],
  group: AssemblyGroup,
  delta: [number, number, number]
): AssemblyComponent[] {
  return components.map((c) => {
    if (group.componentIds.includes(c.id)) {
      return {
        ...c,
        position: [
          c.position[0] + delta[0],
          c.position[1] + delta[1],
          c.position[2] + delta[2],
        ] as [number, number, number],
      };
    }
    return c;
  });
}

/** Toggle group collapse */
export function toggleGroupCollapse(group: AssemblyGroup): AssemblyGroup {
  return { ...group, collapsed: !group.collapsed };
}
