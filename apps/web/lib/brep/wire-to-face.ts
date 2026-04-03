/**
 * Wire-to-Face Conversion (Profile Detection)
 *
 * Converts a collection of 2D sketch curves into closed profiles (faces)
 * for use by extrude, revolve, and other profile-based features.
 *
 * Algorithm:
 * 1. Build a planar graph from sketch entities
 * 2. Find intersection points (Bentley-Ottmann sweep simplified)
 * 3. Split curves at intersections
 * 4. Extract minimal enclosed regions via half-edge traversal
 * 5. Determine orientation (CCW = outer, CW = hole)
 * 6. Build containment tree
 *
 * References:
 * - de Berg et al. (2008) "Computational Geometry"
 * - Mantyla (1988) "An Introduction to Solid Modeling"
 */

import type { SketchEntity } from "../sketch-entities";

export interface Point2D {
  x: number;
  z: number;
}

export interface WireEdge {
  id: string;
  start: Point2D;
  end: Point2D;
  /** Original entity ID */
  entityId: string;
  /** Parameter range on original entity */
  tStart: number;
  tEnd: number;
}

export interface DetectedProfile {
  id: string;
  /** Ordered list of edge IDs forming the boundary */
  edgeIds: string[];
  /** Vertices of the profile in order */
  vertices: Point2D[];
  /** Signed area: positive = CCW (outer), negative = CW (hole) */
  signedArea: number;
  /** Whether this is an outer boundary or a hole */
  isOuter: boolean;
  /** ID of the parent profile (if this is a hole) */
  parentId?: string;
}

/**
 * Compute signed area of a polygon.
 * Positive = CCW (outer boundary), Negative = CW (hole)
 * Formula: A = 1/2 * sum(xi * zi+1 - xi+1 * zi)
 */
export function computeSignedArea(vertices: Point2D[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].z;
    area -= vertices[j].x * vertices[i].z;
  }
  return area / 2;
}

/**
 * Find intersection of two line segments.
 */
function lineLineIntersection(
  a1: Point2D, a2: Point2D,
  b1: Point2D, b2: Point2D
): Point2D | null {
  const dx1 = a2.x - a1.x, dz1 = a2.z - a1.z;
  const dx2 = b2.x - b1.x, dz2 = b2.z - b1.z;
  const denom = dx1 * dz2 - dz1 * dx2;

  if (Math.abs(denom) < 1e-10) return null; // Parallel

  const t = ((b1.x - a1.x) * dz2 - (b1.z - a1.z) * dx2) / denom;
  const u = ((b1.x - a1.x) * dz1 - (b1.z - a1.z) * dx1) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: a1.x + t * dx1,
      z: a1.z + t * dz1,
    };
  }
  return null;
}

/**
 * Point-in-polygon test using ray casting.
 */
export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, zi = polygon[i].z;
    const xj = polygon[j].x, zj = polygon[j].z;

    if (
      zi > point.z !== zj > point.z &&
      point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Extract line segments from sketch entities.
 */
function entityToEdges(entity: SketchEntity): WireEdge[] {
  const edges: WireEdge[] = [];

  switch (entity.type) {
    case "line":
      edges.push({
        id: `we_${entity.id}_0`,
        start: { x: entity.x1, z: entity.z1 },
        end: { x: entity.x2, z: entity.z2 },
        entityId: entity.id,
        tStart: 0,
        tEnd: 1,
      });
      break;

    case "rect": {
      const { x1, z1, x2, z2 } = entity;
      const corners: Point2D[] = [
        { x: x1, z: z1 }, { x: x2, z: z1 },
        { x: x2, z: z2 }, { x: x1, z: z2 },
      ];
      for (let i = 0; i < 4; i++) {
        edges.push({
          id: `we_${entity.id}_${i}`,
          start: corners[i],
          end: corners[(i + 1) % 4],
          entityId: entity.id,
          tStart: i / 4,
          tEnd: (i + 1) / 4,
        });
      }
      break;
    }

    case "circle": {
      const segments = 32;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        edges.push({
          id: `we_${entity.id}_${i}`,
          start: {
            x: entity.cx + entity.radius * Math.cos(a1),
            z: entity.cz + entity.radius * Math.sin(a1),
          },
          end: {
            x: entity.cx + entity.radius * Math.cos(a2),
            z: entity.cz + entity.radius * Math.sin(a2),
          },
          entityId: entity.id,
          tStart: i / segments,
          tEnd: (i + 1) / segments,
        });
      }
      break;
    }

    case "arc": {
      // Convert 3-point arc to segments
      const segments = 16;
      const { x1, z1, mx, mz, x2, z2 } = entity;
      // Find arc center from 3 points
      const ax = (x1 + mx) / 2, az = (z1 + mz) / 2;
      const bx = (mx + x2) / 2, bz = (mz + z2) / 2;
      const d1x = -(mz - z1), d1z = mx - x1;
      const d2x = -(z2 - mz), d2z = x2 - mx;
      const denom = d1x * d2z - d1z * d2x;

      if (Math.abs(denom) > 1e-10) {
        const t = ((bx - ax) * d2z - (bz - az) * d2x) / denom;
        const cx = ax + t * d1x;
        const cz = az + t * d1z;
        const r = Math.hypot(x1 - cx, z1 - cz);
        const startAngle = Math.atan2(z1 - cz, x1 - cx);
        const endAngle = Math.atan2(z2 - cz, x2 - cx);
        let sweep = endAngle - startAngle;
        if (sweep < 0) sweep += Math.PI * 2;

        for (let i = 0; i < segments; i++) {
          const a1 = startAngle + (i / segments) * sweep;
          const a2 = startAngle + ((i + 1) / segments) * sweep;
          edges.push({
            id: `we_${entity.id}_${i}`,
            start: { x: cx + r * Math.cos(a1), z: cz + r * Math.sin(a1) },
            end: { x: cx + r * Math.cos(a2), z: cz + r * Math.sin(a2) },
            entityId: entity.id,
            tStart: i / segments,
            tEnd: (i + 1) / segments,
          });
        }
      }
      break;
    }

    case "ellipse": {
      const segments = 32;
      const { cx, cz, radiusX, radiusZ, rotation } = entity;
      const cos = Math.cos(rotation), sin = Math.sin(rotation);
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        const px1 = radiusX * Math.cos(a1), pz1 = radiusZ * Math.sin(a1);
        const px2 = radiusX * Math.cos(a2), pz2 = radiusZ * Math.sin(a2);
        edges.push({
          id: `we_${entity.id}_${i}`,
          start: { x: cx + px1 * cos - pz1 * sin, z: cz + px1 * sin + pz1 * cos },
          end: { x: cx + px2 * cos - pz2 * sin, z: cz + px2 * sin + pz2 * cos },
          entityId: entity.id,
          tStart: i / segments,
          tEnd: (i + 1) / segments,
        });
      }
      break;
    }

    case "spline": {
      const pts = entity.points;
      for (let i = 0; i < pts.length - 2; i += 2) {
        edges.push({
          id: `we_${entity.id}_${i / 2}`,
          start: { x: pts[i], z: pts[i + 1] },
          end: { x: pts[i + 2], z: pts[i + 3] },
          entityId: entity.id,
          tStart: i / (pts.length - 2),
          tEnd: (i + 2) / (pts.length - 2),
        });
      }
      break;
    }
  }

  return edges;
}

/**
 * Find connected chains of edges that form closed loops.
 */
function findClosedLoops(edges: WireEdge[], tolerance: number = 0.01): WireEdge[][] {
  const loops: WireEdge[][] = [];
  const used = new Set<string>();

  for (const startEdge of edges) {
    if (used.has(startEdge.id)) continue;

    const chain: WireEdge[] = [startEdge];
    used.add(startEdge.id);
    let current = startEdge.end;
    let closed = false;

    while (!closed) {
      const next = edges.find(
        (e) =>
          !used.has(e.id) &&
          Math.hypot(e.start.x - current.x, e.start.z - current.z) < tolerance
      );

      if (!next) break;

      chain.push(next);
      used.add(next.id);
      current = next.end;

      // Check if we've closed the loop
      if (Math.hypot(current.x - startEdge.start.x, current.z - startEdge.start.z) < tolerance) {
        closed = true;
      }
    }

    if (closed && chain.length >= 3) {
      loops.push(chain);
    }
  }

  return loops;
}

/**
 * Main function: detect closed profiles from sketch entities.
 *
 * This is the core algorithm that converts a sketch into the input
 * needed by extrude, revolve, and other profile-based features.
 */
export function detectProfiles(
  entities: SketchEntity[],
  tolerance: number = 0.01
): DetectedProfile[] {
  // Filter out construction entities
  const nonConstruction = entities.filter((e) => !e.isConstruction);

  // 1. Convert entities to wire edges
  const allEdges: WireEdge[] = [];
  for (const entity of nonConstruction) {
    allEdges.push(...entityToEdges(entity));
  }

  // 2. Find intersections and split edges (simplified Bentley-Ottmann)
  const splitEdges: WireEdge[] = [];
  for (const edge of allEdges) {
    let segments: WireEdge[] = [edge];

    for (const other of allEdges) {
      if (other.id === edge.id) continue;
      const intersection = lineLineIntersection(edge.start, edge.end, other.start, other.end);
      if (intersection) {
        // Split edge at intersection point
        const newSegments: WireEdge[] = [];
        for (const seg of segments) {
          const d1 = Math.hypot(intersection.x - seg.start.x, intersection.z - seg.start.z);
          const d2 = Math.hypot(intersection.x - seg.end.x, intersection.z - seg.end.z);
          const segLen = Math.hypot(seg.end.x - seg.start.x, seg.end.z - seg.start.z);

          if (d1 > tolerance && d2 > tolerance && d1 < segLen && d2 < segLen) {
            newSegments.push(
              { ...seg, id: seg.id + "_a", end: intersection, tEnd: (seg.tStart + seg.tEnd) / 2 },
              { ...seg, id: seg.id + "_b", start: intersection, tStart: (seg.tStart + seg.tEnd) / 2 }
            );
          } else {
            newSegments.push(seg);
          }
        }
        segments = newSegments;
      }
    }
    splitEdges.push(...segments);
  }

  // 3. Find closed loops
  const loops = findClosedLoops(splitEdges.length > 0 ? splitEdges : allEdges, tolerance);

  // 4. Convert loops to profiles
  const profiles: DetectedProfile[] = [];
  let profileCounter = 0;

  for (const loop of loops) {
    const vertices = loop.map((e) => e.start);
    const signedArea = computeSignedArea(vertices);

    profiles.push({
      id: `profile_${++profileCounter}`,
      edgeIds: loop.map((e) => e.id),
      vertices,
      signedArea,
      isOuter: signedArea > 0,
    });
  }

  // 5. Build containment tree (determine which holes belong to which outer profiles)
  const outers = profiles.filter((p) => p.isOuter);
  const inners = profiles.filter((p) => !p.isOuter);

  for (const inner of inners) {
    // Find the smallest outer profile that contains this inner profile
    let bestOuter: DetectedProfile | null = null;
    let bestArea = Infinity;

    for (const outer of outers) {
      if (
        pointInPolygon(inner.vertices[0], outer.vertices) &&
        Math.abs(outer.signedArea) < bestArea
      ) {
        bestOuter = outer;
        bestArea = Math.abs(outer.signedArea);
      }
    }

    if (bestOuter) {
      inner.parentId = bestOuter.id;
    }
  }

  return profiles;
}

/**
 * Get the bounding box of a profile.
 */
export function profileBounds(profile: DetectedProfile): {
  minX: number; minZ: number; maxX: number; maxZ: number;
} {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const v of profile.vertices) {
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
    minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
  }
  return { minX, minZ, maxX, maxZ };
}
