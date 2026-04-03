/**
 * Projection Engine — generates 2D orthographic views from 3D mesh data.
 *
 * Projects 3D vertices onto 2D planes for technical drawing generation.
 * Supports front, top, right, and isometric views.
 */

import type { TessellatedMesh } from "../features";

export type ViewDirection = "front" | "top" | "right" | "back" | "bottom" | "left" | "isometric";

export interface ProjectedEdge {
  x1: number; y1: number;
  x2: number; y2: number;
  visible: boolean; // false = hidden line
}

export interface ProjectedView {
  direction: ViewDirection;
  edges: ProjectedEdge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Position on the drawing sheet */
  sheetX: number;
  sheetY: number;
  scale: number;
}

/**
 * Project 3D mesh to 2D edges for a given view direction.
 */
export function projectMesh(
  mesh: TessellatedMesh,
  direction: ViewDirection,
  scale: number = 1
): ProjectedView {
  const edges: ProjectedEdge[] = [];
  const project = getProjectionFn(direction);

  // Extract edges from triangles
  const edgeSet = new Set<string>();

  for (let i = 0; i < mesh.indices.length; i += 3) {
    const tri = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];

    for (let j = 0; j < 3; j++) {
      const a = tri[j];
      const b = tri[(j + 1) % 3];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);

      const ax = mesh.vertices[a * 3], ay = mesh.vertices[a * 3 + 1], az = mesh.vertices[a * 3 + 2];
      const bx = mesh.vertices[b * 3], by = mesh.vertices[b * 3 + 1], bz = mesh.vertices[b * 3 + 2];

      const p1 = project(ax, ay, az);
      const p2 = project(bx, by, bz);

      edges.push({
        x1: p1.x * scale, y1: p1.y * scale,
        x2: p2.x * scale, y2: p2.y * scale,
        visible: true, // Simplified: all edges visible (HLR would require depth sorting)
      });
    }
  }

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of edges) {
    minX = Math.min(minX, e.x1, e.x2);
    minY = Math.min(minY, e.y1, e.y2);
    maxX = Math.max(maxX, e.x1, e.x2);
    maxY = Math.max(maxY, e.y1, e.y2);
  }

  return {
    direction,
    edges,
    bounds: { minX, minY, maxX, maxY },
    sheetX: 0,
    sheetY: 0,
    scale,
  };
}

/**
 * Generate standard 3-view layout: front, top, right + isometric.
 */
export function generateStandard3View(
  mesh: TessellatedMesh,
  scale: number = 30
): ProjectedView[] {
  const front = projectMesh(mesh, "front", scale);
  const top = projectMesh(mesh, "top", scale);
  const right = projectMesh(mesh, "right", scale);
  const iso = projectMesh(mesh, "isometric", scale * 0.7);

  // Layout positions (standard engineering drawing arrangement)
  front.sheetX = 100; front.sheetY = 300;
  top.sheetX = 100; top.sheetY = 100;
  right.sheetX = 350; right.sheetY = 300;
  iso.sheetX = 400; iso.sheetY = 80;

  return [front, top, right, iso];
}

// ═══════════════════════════════════════════
// Hidden Line Removal (Appel's Algorithm)
// ═══════════════════════════════════════════

/**
 * Apply Appel's quantitative invisibility algorithm.
 * Process edges and compute visibility based on face occlusion.
 *
 * Reference: Appel (1967) "The Notion of Quantitative Invisibility"
 */
export function applyHiddenLineRemoval(
  mesh: { vertices: number[]; normals: number[]; indices: number[] },
  view: ProjectedView,
  viewDir: [number, number, number] = [0, 0, 1]
): ProjectedView {
  const edges = [...view.edges];

  // Classify faces as front-facing or back-facing
  const faceVisibility: boolean[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const i0 = mesh.indices[i], i1 = mesh.indices[i + 1], i2 = mesh.indices[i + 2];
    // Compute face normal
    const ax = mesh.vertices[i1 * 3] - mesh.vertices[i0 * 3];
    const ay = mesh.vertices[i1 * 3 + 1] - mesh.vertices[i0 * 3 + 1];
    const az = mesh.vertices[i1 * 3 + 2] - mesh.vertices[i0 * 3 + 2];
    const bx = mesh.vertices[i2 * 3] - mesh.vertices[i0 * 3];
    const by = mesh.vertices[i2 * 3 + 1] - mesh.vertices[i0 * 3 + 1];
    const bz = mesh.vertices[i2 * 3 + 2] - mesh.vertices[i0 * 3 + 2];
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;

    // Dot with view direction
    const dot = nx * viewDir[0] + ny * viewDir[1] + nz * viewDir[2];
    faceVisibility.push(dot < 0); // Front-facing if normal points toward viewer
  }

  // For each edge, count how many back-facing triangles are in front of it
  // (simplified depth-based approach)
  for (let e = 0; e < edges.length; e++) {
    const edge = edges[e];
    const midX = (edge.x1 + edge.x2) / 2;
    const midY = (edge.y1 + edge.y2) / 2;

    let occluderCount = 0;
    // Check if edge midpoint is inside any front-facing face projection
    for (let f = 0; f < faceVisibility.length; f++) {
      if (!faceVisibility[f]) continue; // Skip back-facing

      const i0 = mesh.indices[f * 3], i1 = mesh.indices[f * 3 + 1], i2 = mesh.indices[f * 3 + 2];
      const project = getProjectionFn(view.direction);
      const p0 = project(mesh.vertices[i0*3], mesh.vertices[i0*3+1], mesh.vertices[i0*3+2]);
      const p1 = project(mesh.vertices[i1*3], mesh.vertices[i1*3+1], mesh.vertices[i1*3+2]);
      const p2 = project(mesh.vertices[i2*3], mesh.vertices[i2*3+1], mesh.vertices[i2*3+2]);

      if (pointInTriangle2D(midX, midY,
        p0.x * view.scale, p0.y * view.scale,
        p1.x * view.scale, p1.y * view.scale,
        p2.x * view.scale, p2.y * view.scale)) {
        occluderCount++;
      }
    }

    // Edge is hidden if occluded by one or more faces (quantitative invisibility > 0)
    edges[e] = { ...edge, visible: occluderCount <= 1 };
  }

  return { ...view, edges };
}

/** Point-in-triangle test using barycentric coordinates */
function pointInTriangle2D(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number
): boolean {
  const v0x = cx - ax, v0y = cy - ay;
  const v1x = bx - ax, v1y = by - ay;
  const v2x = px - ax, v2y = py - ay;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const inv = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * inv;
  const v = (dot00 * dot12 - dot01 * dot02) * inv;

  return u >= 0 && v >= 0 && u + v <= 1;
}

// ═══════════════════════════════════════════
// Section Views
// ═══════════════════════════════════════════

export interface SectionLine {
  /** Start and end points of the cutting plane on the drawing */
  start: { x: number; y: number };
  end: { x: number; y: number };
  /** Section label (e.g., "A-A") */
  label: string;
}

export interface SectionView extends ProjectedView {
  sectionLabel: string;
  /** Cross-section hatching lines */
  hatchLines: { x1: number; y1: number; x2: number; y2: number }[];
}

/**
 * Generate a section view by cutting the model with a plane.
 */
export function generateSectionView(
  mesh: { vertices: number[]; indices: number[] },
  cuttingPlaneNormal: [number, number, number],
  cuttingPlaneOffset: number,
  viewDirection: ViewDirection,
  scale: number = 30,
  label: string = "A-A"
): SectionView {
  const project = getProjectionFn(viewDirection);
  const [nx, ny, nz] = cuttingPlaneNormal;

  const edges: ProjectedEdge[] = [];
  const crossSectionPoints: { x: number; y: number }[] = [];

  // For each triangle, find intersection with cutting plane
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const idx = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
    const verts = idx.map((j) => ({
      x: mesh.vertices[j * 3],
      y: mesh.vertices[j * 3 + 1],
      z: mesh.vertices[j * 3 + 2],
    }));

    // Classify vertices relative to plane
    const dists = verts.map((v) => v.x * nx + v.y * ny + v.z * nz - cuttingPlaneOffset);

    // Find edge-plane intersections
    const intersections: { x: number; y: number; z: number }[] = [];
    for (let j = 0; j < 3; j++) {
      const k = (j + 1) % 3;
      if (dists[j] * dists[k] < 0) {
        const t = dists[j] / (dists[j] - dists[k]);
        intersections.push({
          x: verts[j].x + t * (verts[k].x - verts[j].x),
          y: verts[j].y + t * (verts[k].y - verts[j].y),
          z: verts[j].z + t * (verts[k].z - verts[j].z),
        });
      }
    }

    // If we have 2 intersection points, that's a cross-section edge
    if (intersections.length === 2) {
      const p1 = project(intersections[0].x, intersections[0].y, intersections[0].z);
      const p2 = project(intersections[1].x, intersections[1].y, intersections[1].z);
      edges.push({
        x1: p1.x * scale, y1: p1.y * scale,
        x2: p2.x * scale, y2: p2.y * scale,
        visible: true,
      });
      crossSectionPoints.push(
        { x: p1.x * scale, y: p1.y * scale },
        { x: p2.x * scale, y: p2.y * scale }
      );
    }

    // Keep visible geometry behind cutting plane
    const behind = verts.filter((_, j) => dists[j] <= 0);
    if (behind.length >= 2) {
      for (let j = 0; j < behind.length - 1; j++) {
        const p1 = project(behind[j].x, behind[j].y, behind[j].z);
        const p2 = project(behind[j + 1].x, behind[j + 1].y, behind[j + 1].z);
        edges.push({
          x1: p1.x * scale, y1: p1.y * scale,
          x2: p2.x * scale, y2: p2.y * scale,
          visible: true,
        });
      }
    }
  }

  // Generate 45° hatching lines within the cross-section bounds
  const hatchLines = generateHatching(crossSectionPoints, 3);

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of edges) {
    minX = Math.min(minX, e.x1, e.x2); maxX = Math.max(maxX, e.x1, e.x2);
    minY = Math.min(minY, e.y1, e.y2); maxY = Math.max(maxY, e.y1, e.y2);
  }

  return {
    direction: viewDirection,
    edges,
    bounds: { minX, minY, maxX, maxY },
    sheetX: 0, sheetY: 0,
    scale,
    sectionLabel: label,
    hatchLines,
  };
}

/** Generate 45° hatching lines within a bounding region */
function generateHatching(
  points: { x: number; y: number }[],
  spacing: number = 3
): { x1: number; y1: number; x2: number; y2: number }[] {
  if (points.length === 0) return [];

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const diag = Math.hypot(maxX - minX, maxY - minY);

  for (let d = -diag; d < diag; d += spacing) {
    // 45° lines: y = x + d (shifted)
    const x1 = minX;
    const y1 = minX + d + minY;
    const x2 = maxX;
    const y2 = maxX + d + minY;

    // Clip to bounds
    if (y1 <= maxY && y2 >= minY) {
      lines.push({
        x1: Math.max(minX, x1),
        y1: Math.max(minY, Math.min(maxY, y1)),
        x2: Math.min(maxX, x2),
        y2: Math.max(minY, Math.min(maxY, y2)),
      });
    }
  }

  return lines;
}

// ═══════════════════════════════════════════
// Detail Views
// ═══════════════════════════════════════════

export interface DetailView extends ProjectedView {
  /** Label for the detail (e.g., "B") */
  detailLabel: string;
  /** Magnification factor */
  magnification: number;
  /** Source circle on parent view */
  sourceCircle: { cx: number; cy: number; radius: number };
}

/**
 * Extract a detail view: magnified region from a parent view.
 */
export function generateDetailView(
  parentView: ProjectedView,
  centerX: number,
  centerY: number,
  radius: number,
  magnification: number = 2,
  label: string = "B"
): DetailView {
  // Filter edges within the detail circle
  const detailEdges: ProjectedEdge[] = [];

  for (const edge of parentView.edges) {
    const mx = (edge.x1 + edge.x2) / 2;
    const my = (edge.y1 + edge.y2) / 2;
    const dist = Math.hypot(mx - centerX, my - centerY);

    if (dist <= radius * 1.5) {
      // Magnify and re-center
      detailEdges.push({
        x1: (edge.x1 - centerX) * magnification,
        y1: (edge.y1 - centerY) * magnification,
        x2: (edge.x2 - centerX) * magnification,
        y2: (edge.y2 - centerY) * magnification,
        visible: edge.visible,
      });
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of detailEdges) {
    minX = Math.min(minX, e.x1, e.x2); maxX = Math.max(maxX, e.x1, e.x2);
    minY = Math.min(minY, e.y1, e.y2); maxY = Math.max(maxY, e.y1, e.y2);
  }

  return {
    direction: parentView.direction,
    edges: detailEdges,
    bounds: { minX, minY, maxX, maxY },
    sheetX: 0,
    sheetY: 0,
    scale: parentView.scale * magnification,
    detailLabel: label,
    magnification,
    sourceCircle: { cx: centerX, cy: centerY, radius },
  };
}

/** Get projection function for a view direction */
function getProjectionFn(dir: ViewDirection): (x: number, y: number, z: number) => { x: number; y: number } {
  switch (dir) {
    case "front":  return (x, y, _z) => ({ x, y });
    case "back":   return (x, y, _z) => ({ x: -x, y });
    case "top":    return (x, _y, z) => ({ x, y: -z });
    case "bottom": return (x, _y, z) => ({ x, y: z });
    case "right":  return (_x, y, z) => ({ x: -z, y });
    case "left":   return (_x, y, z) => ({ x: z, y });
    case "isometric": {
      // Standard isometric: rotate 45° around Y then ~35.26° around X
      const cos30 = Math.cos(Math.PI / 6);
      const sin30 = Math.sin(Math.PI / 6);
      return (x, y, z) => ({
        x: (x - z) * cos30,
        y: y - (x + z) * sin30 * 0.5,
      });
    }
  }
}
