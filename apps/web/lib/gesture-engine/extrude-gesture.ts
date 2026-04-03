/**
 * Interactive Extrude Gesture — pinch on a sketch face, pull up/down to extrude.
 *
 * When the user pinches on a sketch entity (rect, circle, closed profile) and
 * pulls their hand vertically, this generates a real-time extrude preview mesh
 * that updates every frame based on hand displacement.
 */

import type { TessellatedMesh } from "../features";
import type { SketchEntity } from "../sketch-entities";

export interface ExtrudeGestureState {
  /** Whether an interactive extrude is in progress */
  active: boolean;
  /** The entity being extruded */
  sourceEntity: SketchEntity | null;
  /** Current extrude distance (world units) */
  distance: number;
  /** Direction: positive = up, negative = down */
  direction: "up" | "down";
  /** Preview mesh generated at current distance */
  previewMesh: TessellatedMesh | null;
  /** Screen Y position at gesture start */
  startY: number;
}

/** Scale factor: how many world units per normalized screen unit of hand movement */
const SCREEN_TO_WORLD_SCALE = 10;
/** Minimum extrude distance to show preview */
const MIN_DISTANCE = 0.05;

export class ExtrudeGestureHandler {
  private state: ExtrudeGestureState = {
    active: false,
    sourceEntity: null,
    distance: 0,
    direction: "up",
    previewMesh: null,
    startY: 0,
  };

  private listeners: ((state: ExtrudeGestureState) => void)[] = [];

  onStateChange(listener: (state: ExtrudeGestureState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Start an interactive extrude on a sketch entity */
  start(entity: SketchEntity, screenY: number): void {
    this.state = {
      active: true,
      sourceEntity: entity,
      distance: 0,
      direction: "up",
      previewMesh: null,
      startY: screenY,
    };
    this.emit();
  }

  /** Update with new hand position during drag */
  updateDrag(screenY: number): void {
    if (!this.state.active || !this.state.sourceEntity) return;

    // Calculate distance from start position
    // Screen Y decreases as hand moves up, so negate
    const rawDelta = -(screenY - this.state.startY);
    const distance = Math.abs(rawDelta) * SCREEN_TO_WORLD_SCALE;
    const direction: "up" | "down" = rawDelta >= 0 ? "up" : "down";

    if (distance < MIN_DISTANCE) {
      this.state.distance = 0;
      this.state.previewMesh = null;
      this.emit();
      return;
    }

    this.state.distance = distance;
    this.state.direction = direction;

    // Generate preview mesh based on entity type
    this.state.previewMesh = this.generatePreview(
      this.state.sourceEntity,
      direction === "down" ? -distance : distance
    );

    this.emit();
  }

  /** Complete the extrude and return final parameters */
  complete(): { entity: SketchEntity; distance: number; direction: "up" | "down"; mesh: TessellatedMesh } | null {
    if (!this.state.active || !this.state.sourceEntity || !this.state.previewMesh) {
      this.cancel();
      return null;
    }

    const result = {
      entity: this.state.sourceEntity,
      distance: this.state.distance,
      direction: this.state.direction,
      mesh: this.state.previewMesh,
    };

    this.reset();
    return result;
  }

  /** Cancel the interactive extrude */
  cancel(): void {
    this.reset();
  }

  get isActive(): boolean {
    return this.state.active;
  }

  get currentState(): Readonly<ExtrudeGestureState> {
    return this.state;
  }

  destroy(): void {
    this.listeners = [];
    this.reset();
  }

  // ---------- Private ----------

  private generatePreview(entity: SketchEntity, signedDistance: number): TessellatedMesh {
    switch (entity.type) {
      case "rect":
        return generateBoxPreview(
          entity.x1, entity.z1, entity.x2, entity.z2, signedDistance
        );
      case "circle":
        return generateCylinderPreview(
          entity.cx, entity.cz, entity.radius, signedDistance
        );
      default:
        // For other entity types, generate a rough bounding box extrusion
        const bounds = getEntityBounds(entity);
        if (!bounds) return { vertices: [], normals: [], indices: [] };
        return generateBoxPreview(
          bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ, signedDistance
        );
    }
  }

  private reset(): void {
    this.state = {
      active: false,
      sourceEntity: null,
      distance: 0,
      direction: "up",
      previewMesh: null,
      startY: 0,
    };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }
}

/** Generate a box extrusion preview */
function generateBoxPreview(
  x1: number, z1: number, x2: number, z2: number,
  height: number
): TessellatedMesh {
  const y0 = height >= 0 ? 0 : height;
  const y1 = height >= 0 ? height : 0;
  const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
  const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);

  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const v = [
    minX, y0, minZ, maxX, y0, minZ, maxX, y0, maxZ, minX, y0, maxZ,
    minX, y1, minZ, maxX, y1, minZ, maxX, y1, maxZ, minX, y1, maxZ,
  ];

  const faces: [number[], number[]][] = [
    [[0,1,2, 0,2,3], [0,-1,0]],   // bottom
    [[4,6,5, 4,7,6], [0,1,0]],    // top
    [[3,2,6, 3,6,7], [0,0,1]],    // front
    [[0,5,1, 0,4,5], [0,0,-1]],   // back
    [[1,5,6, 1,6,2], [1,0,0]],    // right
    [[0,3,7, 0,7,4], [-1,0,0]],   // left
  ];

  let idx = 0;
  for (const [faceIndices, normal] of faces) {
    for (const vi of faceIndices) {
      vertices.push(v[vi * 3], v[vi * 3 + 1], v[vi * 3 + 2]);
      normals.push(normal[0], normal[1], normal[2]);
      indices.push(idx++);
    }
  }

  return { vertices, normals, indices };
}

/** Generate a cylinder extrusion preview */
function generateCylinderPreview(
  cx: number, cz: number, radius: number, height: number
): TessellatedMesh {
  const segments = 24;
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const y0 = height >= 0 ? 0 : height;
  const y1 = height >= 0 ? height : 0;

  // Side vertices
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const nx = Math.cos(a), nz = Math.sin(a);
    vertices.push(cx + nx * radius, y0, cz + nz * radius);
    normals.push(nx, 0, nz);
    vertices.push(cx + nx * radius, y1, cz + nz * radius);
    normals.push(nx, 0, nz);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  // Top cap
  const topCenter = vertices.length / 3;
  vertices.push(cx, y1, cz);
  normals.push(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push(cx + Math.cos(a) * radius, y1, cz + Math.sin(a) * radius);
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(topCenter, topCenter + 1 + i, topCenter + 2 + i);
  }

  // Bottom cap
  const botCenter = vertices.length / 3;
  vertices.push(cx, y0, cz);
  normals.push(0, -1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push(cx + Math.cos(a) * radius, y0, cz + Math.sin(a) * radius);
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(botCenter, botCenter + 2 + i, botCenter + 1 + i);
  }

  return { vertices, normals, indices };
}

/** Get bounding box of a sketch entity */
function getEntityBounds(entity: SketchEntity): { minX: number; minZ: number; maxX: number; maxZ: number } | null {
  switch (entity.type) {
    case "point":
      return { minX: entity.x - 0.1, minZ: entity.z - 0.1, maxX: entity.x + 0.1, maxZ: entity.z + 0.1 };
    case "line":
      return {
        minX: Math.min(entity.x1, entity.x2),
        minZ: Math.min(entity.z1, entity.z2),
        maxX: Math.max(entity.x1, entity.x2),
        maxZ: Math.max(entity.z1, entity.z2),
      };
    case "circle":
      return {
        minX: entity.cx - entity.radius,
        minZ: entity.cz - entity.radius,
        maxX: entity.cx + entity.radius,
        maxZ: entity.cz + entity.radius,
      };
    case "rect":
      return {
        minX: Math.min(entity.x1, entity.x2),
        minZ: Math.min(entity.z1, entity.z2),
        maxX: Math.max(entity.x1, entity.x2),
        maxZ: Math.max(entity.z1, entity.z2),
      };
    case "arc":
      return {
        minX: Math.min(entity.x1, entity.mx, entity.x2),
        minZ: Math.min(entity.z1, entity.mz, entity.z2),
        maxX: Math.max(entity.x1, entity.mx, entity.x2),
        maxZ: Math.max(entity.z1, entity.mz, entity.z2),
      };
    case "spline": {
      if (entity.points.length < 2) return null;
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < entity.points.length; i += 2) {
        minX = Math.min(minX, entity.points[i]);
        maxX = Math.max(maxX, entity.points[i]);
        minZ = Math.min(minZ, entity.points[i + 1]);
        maxZ = Math.max(maxZ, entity.points[i + 1]);
      }
      return { minX, minZ, maxX, maxZ };
    }
    case "ellipse":
      return {
        minX: entity.cx - entity.radiusX,
        minZ: entity.cz - entity.radiusZ,
        maxX: entity.cx + entity.radiusX,
        maxZ: entity.cz + entity.radiusZ,
      };
    default:
      return null;
  }
}
