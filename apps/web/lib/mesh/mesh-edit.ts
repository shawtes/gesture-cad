/**
 * Blender-style Mesh Editing Operations
 *
 * All operations mutate the HalfEdgeMesh in-place and return info about
 * newly created topology (vertex IDs, face IDs, etc.).
 *
 * Pure math -- no Three.js imports.
 */

import type { HEHalfEdge } from './half-edge';
import { HalfEdgeMesh } from './half-edge';

// ─── Vec3 Helpers (inline, no deps) ─────────────────────────

type V3 = [number, number, number];

function v3Add(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function v3Sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function v3Scale(a: V3, s: number): V3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function v3Lerp(a: V3, b: V3, t: number): V3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function v3Dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function v3Cross(a: V3, b: V3): V3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function v3Len(a: V3): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

function v3Normalize(a: V3): V3 {
  const l = v3Len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

function v3Dist(a: V3, b: V3): number {
  return v3Len(v3Sub(a, b));
}

function v3Avg(vecs: V3[]): V3 {
  const sum: V3 = [0, 0, 0];
  for (const v of vecs) {
    sum[0] += v[0];
    sum[1] += v[1];
    sum[2] += v[2];
  }
  const n = vecs.length || 1;
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

// ─── 1. Extrude Faces ───────────────────────────────────────

export interface ExtrudeFacesResult {
  /** Newly created "top" face IDs (duplicates of originals, offset along normal) */
  topFaceIds: number[];
  /** Side quad face IDs connecting original boundary to new faces */
  sideFaceIds: number[];
  /** New vertex IDs created on the extruded cap */
  newVertexIds: number[];
}

/**
 * Duplicate selected faces, offset along their normals, and connect
 * original boundary edges to new faces with side quads.
 */
export function extrudeFaces(
  mesh: HalfEdgeMesh,
  faceIds: number[],
  offset = 0.5,
): ExtrudeFacesResult {
  if (faceIds.length === 0) {
    return { topFaceIds: [], sideFaceIds: [], newVertexIds: [] };
  }

  const faceSet = new Set(faceIds);
  const newVertexIds: number[] = [];
  const topFaceIds: number[] = [];
  const sideFaceIds: number[] = [];

  // Map from old vertex ID -> new (extruded) vertex ID
  const vertexCloneMap = new Map<number, number>();

  // Collect all vertices used by the selected faces and compute per-vertex
  // average normal from selected face normals
  const vertexNormals = new Map<number, V3>();
  for (const fid of faceIds) {
    const face = mesh.faces.get(fid);
    if (!face) continue;
    const verts = mesh.faceVertices(fid);
    const normal: V3 = [...face.normal];
    for (const v of verts) {
      const prev = vertexNormals.get(v.id) ?? [0, 0, 0] as V3;
      vertexNormals.set(v.id, v3Add(prev, normal));
    }
  }

  // Normalize the accumulated normals
  for (const [vid, n] of vertexNormals) {
    vertexNormals.set(vid, v3Normalize(n));
  }

  // Create clone vertices offset along averaged normal
  for (const [vid, normal] of vertexNormals) {
    const orig = mesh.vertices.get(vid);
    if (!orig) continue;
    const pos = v3Add(orig.position as V3, v3Scale(normal, offset));
    const nv = mesh.addVertex(pos[0], pos[1], pos[2]);
    nv.normal = [...normal];
    if ((orig as any).uv) (nv as any).uv = [...(orig as any).uv];
    vertexCloneMap.set(vid, nv.id);
    newVertexIds.push(nv.id);
  }

  // Collect boundary edges of the selected face region: edges whose twin
  // face is NOT in the selection (or has no twin).
  interface BoundaryEdgeInfo {
    originId: number;
    targetId: number;
    halfEdge: HEHalfEdge;
  }
  const boundaryEdges: BoundaryEdgeInfo[] = [];

  for (const fid of faceIds) {
    const hes = mesh.faceHalfEdges(fid);
    for (const he of hes) {
      const originId = mesh.getOriginVertex(he);
      let isBoundary = false;
      if (he.twin === null) {
        isBoundary = true;
      } else {
        const twin = mesh.halfEdges.get(he.twin)!;
        if (twin.face === null || !faceSet.has(twin.face)) {
          isBoundary = true;
        }
      }
      if (isBoundary) {
        boundaryEdges.push({ originId, targetId: he.vertex, halfEdge: he });
      }
    }
  }

  // Create top faces using cloned vertices (same winding as originals)
  for (const fid of faceIds) {
    const verts = mesh.faceVertices(fid);
    const newFaceVerts = verts.map((v) => vertexCloneMap.get(v.id)!);
    const topFace = mesh.addFace(newFaceVerts);
    if (topFace) topFaceIds.push(topFace.id);
  }

  // Create side quads: for each boundary edge, connect old edge to new edge
  for (const { originId, targetId } of boundaryEdges) {
    const newOrigin = vertexCloneMap.get(originId);
    const newTarget = vertexCloneMap.get(targetId);
    if (newOrigin === undefined || newTarget === undefined) continue;

    // Quad: oldOrigin -> oldTarget -> newTarget -> newOrigin
    const sideFace = mesh.addFace([originId, targetId, newTarget, newOrigin]);
    if (sideFace) sideFaceIds.push(sideFace.id);
  }

  // Delete original faces (they are now "interior" and replaced by the top)
  for (const fid of faceIds) {
    deleteFace(mesh, fid);
  }

  mesh.computeVertexNormals();

  return { topFaceIds, sideFaceIds, newVertexIds };
}

// ─── 2. Extrude Edges ───────────────────────────────────────

export interface ExtrudeEdgesResult {
  newFaceIds: number[];
  newVertexIds: number[];
}

/**
 * Extrude boundary edges outward, creating new quads.
 * Each edge's two endpoints are duplicated and offset along the
 * average boundary-vertex normal.
 */
export function extrudeEdges(
  mesh: HalfEdgeMesh,
  edgeIds: number[],
  offset = 0.5,
): ExtrudeEdgesResult {
  if (edgeIds.length === 0) {
    return { newFaceIds: [], newVertexIds: [] };
  }

  const vertexCloneMap = new Map<number, number>();
  const newFaceIds: number[] = [];
  const newVertexIds: number[] = [];

  for (const eid of edgeIds) {
    const he = mesh.halfEdges.get(eid);
    if (!he) continue;

    const originId = mesh.getOriginVertex(he);
    const targetId = he.vertex;
    const origin = mesh.vertices.get(originId);
    const target = mesh.vertices.get(targetId);
    if (!origin || !target) continue;

    // Compute extrusion direction: if edge has a face, use face normal;
    // otherwise use the edge perpendicular in the Y-up plane.
    let normal: V3;
    if (he.face !== null) {
      const face = mesh.faces.get(he.face)!;
      normal = [...face.normal] as V3;
    } else {
      const dir = v3Normalize(v3Sub(target.position as V3, origin.position as V3));
      // Perpendicular in the plane containing world up
      const up: V3 = [0, 1, 0];
      normal = v3Normalize(v3Cross(dir, up));
      if (v3Len(normal) < 0.001) {
        normal = v3Normalize(v3Cross(dir, [1, 0, 0]));
      }
    }

    // Clone vertices (reuse if already cloned from a shared edge)
    if (!vertexCloneMap.has(originId)) {
      const pos = v3Add(origin.position as V3, v3Scale(normal, offset));
      const nv = mesh.addVertex(pos[0], pos[1], pos[2]);
      vertexCloneMap.set(originId, nv.id);
      newVertexIds.push(nv.id);
    }
    if (!vertexCloneMap.has(targetId)) {
      const pos = v3Add(target.position as V3, v3Scale(normal, offset));
      const nv = mesh.addVertex(pos[0], pos[1], pos[2]);
      vertexCloneMap.set(targetId, nv.id);
      newVertexIds.push(nv.id);
    }

    const newOrigin = vertexCloneMap.get(originId)!;
    const newTarget = vertexCloneMap.get(targetId)!;

    const face = mesh.addFace([originId, targetId, newTarget, newOrigin]);
    if (face) newFaceIds.push(face.id);
  }

  mesh.computeVertexNormals();
  return { newFaceIds, newVertexIds };
}

// ─── 3. Subdivide Faces ─────────────────────────────────────

export interface SubdivideFacesResult {
  newVertexIds: number[];
  newFaceIds: number[];
  removedFaceIds: number[];
}

/**
 * Subdivide each selected face by inserting midpoints on every edge
 * and a centroid vertex, then connecting them into smaller faces.
 * If no faceIds provided, subdivides all faces.
 */
export function subdivideFaces(
  mesh: HalfEdgeMesh,
  faceIds?: number[],
): SubdivideFacesResult {
  const targetFaceIds = faceIds ?? [...mesh.faces.keys()];
  if (targetFaceIds.length === 0) {
    return { newVertexIds: [], newFaceIds: [], removedFaceIds: [] };
  }

  const newVertexIds: number[] = [];
  const newFaceIds: number[] = [];
  const removedFaceIds: number[] = [];

  // Edge midpoint cache: canonical edge key -> midpoint vertex ID
  const edgeMidpoints = new Map<string, number>();

  function edgeKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  function getOrCreateMidpoint(vA: number, vB: number): number {
    const key = edgeKey(vA, vB);
    const existing = edgeMidpoints.get(key);
    if (existing !== undefined) return existing;

    const a = mesh.vertices.get(vA);
    const b = mesh.vertices.get(vB);
    if (!a || !b) return -1;
    const mid = mesh.addVertex(
      (a.position[0] + b.position[0]) / 2,
      (a.position[1] + b.position[1]) / 2,
      (a.position[2] + b.position[2]) / 2,
    );
    edgeMidpoints.set(key, mid.id);
    newVertexIds.push(mid.id);
    return mid.id;
  }

  // Snapshot the faces to subdivide (we'll delete them and add new ones)
  const faceSnapshots: Array<{ fid: number; vertIds: number[] }> = [];
  for (const fid of targetFaceIds) {
    const verts = mesh.faceVertices(fid);
    if (verts.length < 3) continue;
    faceSnapshots.push({ fid, vertIds: verts.map((v) => v.id) });
  }

  // Remove original faces
  for (const { fid } of faceSnapshots) {
    deleteFace(mesh, fid);
    removedFaceIds.push(fid);
  }

  // Create subdivided faces
  for (const { vertIds } of faceSnapshots) {
    const n = vertIds.length;

    // Create centroid vertex
    const positions = vertIds.map((vid) => {
      const v = mesh.vertices.get(vid);
      return v ? v.position as V3 : [0, 0, 0] as V3;
    });
    const centroid = v3Avg(positions);
    const centerVert = mesh.addVertex(centroid[0], centroid[1], centroid[2]);
    newVertexIds.push(centerVert.id);

    // Create midpoint on each edge
    const midIds: number[] = [];
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      midIds.push(getOrCreateMidpoint(vertIds[i], vertIds[next]));
    }

    // For each original vertex, create a quad:
    // corner -> edgeMid_after -> center -> edgeMid_before
    for (let i = 0; i < n; i++) {
      const prev = (i - 1 + n) % n;
      const face = mesh.addFace([
        vertIds[i],
        midIds[i],
        centerVert.id,
        midIds[prev],
      ]);
      if (face) newFaceIds.push(face.id);
    }
  }

  mesh.computeVertexNormals();
  return { newVertexIds, newFaceIds, removedFaceIds };
}

// ─── 4. Loop Cut ─────────────────────────────────────────────

export interface LoopCutResult {
  /** New vertex IDs inserted along the loop */
  newVertexIds: number[];
  /** New face IDs created by the cuts */
  newFaceIds: number[];
}

/**
 * Insert edge loops perpendicular to the given edge, slicing through
 * adjacent quads. Uses mesh.edgeLoop() to find the loop path.
 */
export function loopCut(
  mesh: HalfEdgeMesh,
  edgeId: number,
  cuts = 1,
): LoopCutResult {
  const allNewVertexIds: number[] = [];
  const allNewFaceIds: number[] = [];

  const loopEdgeIds = mesh.edgeLoop(edgeId);
  if (loopEdgeIds.length === 0) {
    return { newVertexIds: [], newFaceIds: [] };
  }

  for (let cut = 0; cut < cuts; cut++) {
    const t = (cut + 1) / (cuts + 1);

    // For each edge in the loop, find the face it belongs to and split it
    // by inserting a vertex at parameter t along the edge and its opposite.
    const facesToSplit: Array<{
      faceId: number;
      edgeHe: HEHalfEdge;
    }> = [];

    for (const eid of loopEdgeIds) {
      const he = mesh.halfEdges.get(eid);
      if (!he || he.face === null) continue;
      facesToSplit.push({ faceId: he.face, edgeHe: he });
    }

    // Collect unique faces to avoid double-processing
    const processedFaces = new Set<number>();
    const faceSnapshots: Array<{
      fid: number;
      vertIds: number[];
      splitEdgeOrigin: number;
      splitEdgeTarget: number;
    }> = [];

    for (const { faceId, edgeHe } of facesToSplit) {
      if (processedFaces.has(faceId)) continue;
      processedFaces.add(faceId);

      const verts = mesh.faceVertices(faceId);
      if (verts.length < 4) continue; // Loop cuts work best on quads

      const originId = mesh.getOriginVertex(edgeHe);
      faceSnapshots.push({
        fid: faceId,
        vertIds: verts.map((v) => v.id),
        splitEdgeOrigin: originId,
        splitEdgeTarget: edgeHe.vertex,
      });
    }

    // Now split each face
    for (const { fid, vertIds, splitEdgeOrigin, splitEdgeTarget } of faceSnapshots) {
      const n = vertIds.length;
      if (n < 4) continue;

      // Find the index of the split edge in the vertex ring
      let edgeIdx = -1;
      for (let i = 0; i < n; i++) {
        if (vertIds[i] === splitEdgeOrigin && vertIds[(i + 1) % n] === splitEdgeTarget) {
          edgeIdx = i;
          break;
        }
      }
      if (edgeIdx === -1) continue;

      // The "opposite" edge in a quad is at edgeIdx + 2
      const oppIdx = (edgeIdx + 2) % n;

      // Insert midpoint on the split edge
      const originV = mesh.vertices.get(splitEdgeOrigin)!;
      const targetV = mesh.vertices.get(splitEdgeTarget)!;
      const midPos = v3Lerp(originV.position as V3, targetV.position as V3, t);
      const midVert1 = mesh.addVertex(midPos[0], midPos[1], midPos[2]);
      allNewVertexIds.push(midVert1.id);

      // Insert midpoint on the opposite edge
      const oppOrigin = vertIds[oppIdx];
      const oppTarget = vertIds[(oppIdx + 1) % n];
      const oppOriginV = mesh.vertices.get(oppOrigin)!;
      const oppTargetV = mesh.vertices.get(oppTarget)!;
      const oppMidPos = v3Lerp(oppOriginV.position as V3, oppTargetV.position as V3, 1 - t);
      const midVert2 = mesh.addVertex(oppMidPos[0], oppMidPos[1], oppMidPos[2]);
      allNewVertexIds.push(midVert2.id);

      // Delete original face
      deleteFace(mesh, fid);

      // Create two new faces split by the new edge
      // Face 1: from splitEdgeOrigin -> midVert1 -> midVert2 -> ... (vertices on one side)
      // Face 2: from midVert1 -> splitEdgeTarget -> ... -> midVert2
      const side1: number[] = [];
      const side2: number[] = [];

      // Walk from edgeIdx+1 to oppIdx (exclusive), those go in side2
      // Walk from oppIdx+1 to edgeIdx (exclusive), those go in side1
      // Side 1: splitEdgeOrigin, ..., oppTarget-side verts, midVert2, midVert1
      // Side 2: midVert1, splitEdgeTarget, ..., oppOrigin, midVert2

      // Build side 1: starts at midVert1, goes backward around to midVert2
      side1.push(midVert1.id);
      // From splitEdgeTarget around to oppOrigin
      let idx = (edgeIdx + 1) % n;
      while (idx !== (oppIdx + 1) % n) {
        side2.push(vertIds[idx]);
        idx = (idx + 1) % n;
      }
      // side2 gets midVert2 at end
      side2.unshift(midVert1.id);
      side2.push(midVert2.id);

      // side1: midVert2, then from oppTarget-side around to splitEdgeOrigin, then midVert1
      side1.length = 0;
      side1.push(midVert2.id);
      idx = (oppIdx + 1) % n;
      while (idx !== (edgeIdx + 1) % n) {
        side1.push(vertIds[idx]);
        idx = (idx + 1) % n;
      }
      side1.push(midVert1.id);

      if (side1.length >= 3) {
        const f1 = mesh.addFace(side1);
        if (f1) allNewFaceIds.push(f1.id);
      }
      if (side2.length >= 3) {
        const f2 = mesh.addFace(side2);
        if (f2) allNewFaceIds.push(f2.id);
      }
    }
  }

  mesh.computeVertexNormals();
  return { newVertexIds: allNewVertexIds, newFaceIds: allNewFaceIds };
}

// ─── 5. Knife Cut ────────────────────────────────────────────

export interface KnifeCutResult {
  /** The two new face IDs */
  newFaceIds: [number, number] | null;
  /** The two new vertex IDs on the face boundary */
  newVertexIds: number[];
}

/**
 * Insert an edge across a face between two points, splitting the face
 * into two. The points are projected onto the nearest face edges.
 */
export function knifeCut(
  mesh: HalfEdgeMesh,
  faceId: number,
  point1: V3,
  point2: V3,
): KnifeCutResult {
  const face = mesh.faces.get(faceId);
  if (!face) return { newFaceIds: null, newVertexIds: [] };

  const verts = mesh.faceVertices(faceId);
  const vertIds = verts.map((v) => v.id);
  const n = vertIds.length;
  if (n < 3) return { newFaceIds: null, newVertexIds: [] };

  // Find the closest point on each edge to point1 and point2
  function closestPointOnSegment(p: V3, a: V3, b: V3): { t: number; dist: number } {
    const ab = v3Sub(b, a);
    const ap = v3Sub(p, a);
    const abLen2 = v3Dot(ab, ab);
    if (abLen2 < 1e-12) return { t: 0, dist: v3Dist(p, a) };
    let t = v3Dot(ap, ab) / abLen2;
    t = Math.max(0, Math.min(1, t));
    const proj = v3Add(a, v3Scale(ab, t));
    return { t, dist: v3Dist(p, proj) };
  }

  // For each cut point, find the best edge and parameter
  function findBestEdge(point: V3): { edgeIdx: number; t: number } {
    let bestDist = Infinity;
    let bestIdx = 0;
    let bestT = 0.5;
    for (let i = 0; i < n; i++) {
      const a = verts[i].position as V3;
      const b = verts[(i + 1) % n].position as V3;
      const { t, dist } = closestPointOnSegment(point, a, b);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
        bestT = t;
      }
    }
    return { edgeIdx: bestIdx, t: bestT };
  }

  const edge1 = findBestEdge(point1);
  const edge2 = findBestEdge(point2);

  // Must cut across different edges
  if (edge1.edgeIdx === edge2.edgeIdx) {
    return { newFaceIds: null, newVertexIds: [] };
  }

  // Create new vertices on the two edges
  const a1 = verts[edge1.edgeIdx].position as V3;
  const b1 = verts[(edge1.edgeIdx + 1) % n].position as V3;
  const pos1 = v3Lerp(a1, b1, edge1.t);
  const nv1 = mesh.addVertex(pos1[0], pos1[1], pos1[2]);

  const a2 = verts[edge2.edgeIdx].position as V3;
  const b2 = verts[(edge2.edgeIdx + 1) % n].position as V3;
  const pos2 = v3Lerp(a2, b2, edge2.t);
  const nv2 = mesh.addVertex(pos2[0], pos2[1], pos2[2]);

  // Delete original face
  deleteFace(mesh, faceId);

  // Build the two new face vertex loops
  // Ensure edge1 comes before edge2 in winding order
  let e1 = edge1.edgeIdx;
  let e2 = edge2.edgeIdx;
  if (e1 > e2) {
    [e1, e2] = [e2, e1];
    // Swap the new vertices too
  }
  const nv1Id = e1 === edge1.edgeIdx ? nv1.id : nv2.id;
  const nv2Id = e1 === edge1.edgeIdx ? nv2.id : nv1.id;

  // Face A: vertices from e1+1 to e2, then nv2, then nv1
  const faceAVerts: number[] = [nv1Id];
  for (let i = e1 + 1; i <= e2; i++) {
    faceAVerts.push(vertIds[i]);
  }
  faceAVerts.push(nv2Id);

  // Face B: vertices from e2+1 to e1, then nv1, then nv2
  const faceBVerts: number[] = [nv2Id];
  for (let i = e2 + 1; i < n; i++) {
    faceBVerts.push(vertIds[i]);
  }
  for (let i = 0; i <= e1; i++) {
    faceBVerts.push(vertIds[i]);
  }
  faceBVerts.push(nv1Id);

  const newVertexIds = [nv1.id, nv2.id];
  const faceA = faceAVerts.length >= 3 ? mesh.addFace(faceAVerts) : null;
  const faceB = faceBVerts.length >= 3 ? mesh.addFace(faceBVerts) : null;

  mesh.computeVertexNormals();

  if (faceA && faceB) {
    return { newFaceIds: [faceA.id, faceB.id], newVertexIds };
  }
  return { newFaceIds: null, newVertexIds };
}

// ─── 6. Inset Faces ─────────────────────────────────────────

export interface InsetFacesResult {
  /** Inner (inset) face IDs */
  innerFaceIds: number[];
  /** Border quad face IDs */
  borderFaceIds: number[];
  /** New vertex IDs (the inset ring) */
  newVertexIds: number[];
}

/**
 * Scale each face inward toward its centroid by `amount` (0..1),
 * creating border quads between the original boundary and the inset face.
 */
export function insetFaces(
  mesh: HalfEdgeMesh,
  faceIds: number[],
  amount: number,
): InsetFacesResult {
  if (faceIds.length === 0 || amount <= 0) {
    return { innerFaceIds: [], borderFaceIds: [], newVertexIds: [] };
  }

  const clampedAmount = Math.min(Math.max(amount, 0), 1);
  const innerFaceIds: number[] = [];
  const borderFaceIds: number[] = [];
  const newVertexIds: number[] = [];

  // Snapshot faces before modifying
  const snapshots: Array<{ fid: number; vertIds: number[] }> = [];
  for (const fid of faceIds) {
    const verts = mesh.faceVertices(fid);
    if (verts.length < 3) continue;
    snapshots.push({ fid, vertIds: verts.map((v) => v.id) });
  }

  for (const { fid, vertIds } of snapshots) {
    const n = vertIds.length;
    const centroid = mesh.faceCentroid(fid);

    // Create inset vertices
    const insetVertIds: number[] = [];
    for (const vid of vertIds) {
      const v = mesh.vertices.get(vid)!;
      const pos = v3Lerp(v.position as V3, centroid, clampedAmount);
      const nv = mesh.addVertex(pos[0], pos[1], pos[2]);
      insetVertIds.push(nv.id);
      newVertexIds.push(nv.id);
    }

    // Delete original face
    deleteFace(mesh, fid);

    // Create inner face
    const innerFace = mesh.addFace(insetVertIds);
    if (innerFace) innerFaceIds.push(innerFace.id);

    // Create border quads
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const quad = mesh.addFace([
        vertIds[i],
        vertIds[next],
        insetVertIds[next],
        insetVertIds[i],
      ]);
      if (quad) borderFaceIds.push(quad.id);
    }
  }

  mesh.computeVertexNormals();
  return { innerFaceIds, borderFaceIds, newVertexIds };
}

// ─── 7. Bevel Edges ─────────────────────────────────────────

export interface BevelEdgesResult {
  /** New face IDs created by the bevel (chamfer strips) */
  newFaceIds: number[];
  /** New vertex IDs */
  newVertexIds: number[];
}

/**
 * Offset edges and create chamfer geometry. For each selected edge,
 * create new vertices offset along adjacent face normals and rebuild
 * adjacent faces to include the bevel strip.
 */
export function bevelEdges(
  mesh: HalfEdgeMesh,
  edgeIds: number[],
  bevelOffset: number,
  segments = 1,
): BevelEdgesResult {
  if (edgeIds.length === 0 || bevelOffset <= 0) {
    return { newFaceIds: [], newVertexIds: [] };
  }

  const newFaceIds: number[] = [];
  const newVertexIds: number[] = [];

  // For each edge, we need to:
  // 1. Find the two adjacent faces
  // 2. Create offset vertices on both sides
  // 3. Replace adjacent faces and add a bevel strip

  for (const eid of edgeIds) {
    const he = mesh.halfEdges.get(eid);
    if (!he) continue;

    const originId = mesh.getOriginVertex(he);
    const targetId = he.vertex;
    const originV = mesh.vertices.get(originId);
    const targetV = mesh.vertices.get(targetId);
    if (!originV || !targetV) continue;

    const edgeDir = v3Normalize(v3Sub(targetV.position as V3, originV.position as V3));

    // Compute perpendicular directions for the two sides
    // Side A: face of this half-edge
    // Side B: face of the twin half-edge
    const faceAId = he.face;
    const faceBId = he.twin !== null ? mesh.halfEdges.get(he.twin)!.face : null;

    // Compute offset direction for each side
    let normalA: V3 = [0, 1, 0];
    if (faceAId !== null) {
      const face = mesh.faces.get(faceAId)!;
      normalA = face.normal as V3;
    }
    let normalB: V3 = [0, -1, 0];
    if (faceBId !== null) {
      const face = mesh.faces.get(faceBId)!;
      normalB = face.normal as V3;
    }

    // Offset directions perpendicular to the edge and in the face plane
    const offsetDirA = v3Normalize(v3Cross(edgeDir, normalA));
    const offsetDirB = v3Normalize(v3Cross(normalB, edgeDir));

    // Create bevel strip vertices
    const stripVertsOrigin: number[] = [];
    const stripVertsTarget: number[] = [];

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      // Interpolate between the two offset directions
      const offsetDir = v3Normalize(v3Lerp(offsetDirA, offsetDirB, t));
      const offset = v3Scale(offsetDir, bevelOffset);

      const originPos = v3Add(originV.position as V3, offset);
      const targetPos = v3Add(targetV.position as V3, offset);

      const nvOrigin = mesh.addVertex(originPos[0], originPos[1], originPos[2]);
      const nvTarget = mesh.addVertex(targetPos[0], targetPos[1], targetPos[2]);

      stripVertsOrigin.push(nvOrigin.id);
      stripVertsTarget.push(nvTarget.id);
      newVertexIds.push(nvOrigin.id, nvTarget.id);
    }

    // Create strip quads
    for (let s = 0; s < segments; s++) {
      const face = mesh.addFace([
        stripVertsOrigin[s],
        stripVertsTarget[s],
        stripVertsTarget[s + 1],
        stripVertsOrigin[s + 1],
      ]);
      if (face) newFaceIds.push(face.id);
    }

    // Rebuild adjacent faces replacing the edge vertices with bevel vertices
    if (faceAId !== null) {
      const faceVerts = mesh.faceVertices(faceAId).map((v) => v.id);
      deleteFace(mesh, faceAId);

      // Replace originId with stripVertsOrigin[0], targetId with stripVertsTarget[0]
      const rebuilt = faceVerts.map((vid) => {
        if (vid === originId) return stripVertsOrigin[0];
        if (vid === targetId) return stripVertsTarget[0];
        return vid;
      });
      const f = mesh.addFace(rebuilt);
      if (f) newFaceIds.push(f.id);
    }

    if (faceBId !== null) {
      const faceVerts = mesh.faceVertices(faceBId).map((v) => v.id);
      deleteFace(mesh, faceBId);

      const rebuilt = faceVerts.map((vid) => {
        if (vid === originId) return stripVertsOrigin[segments];
        if (vid === targetId) return stripVertsTarget[segments];
        return vid;
      });
      const f = mesh.addFace(rebuilt);
      if (f) newFaceIds.push(f.id);
    }
  }

  mesh.computeVertexNormals();
  return { newFaceIds, newVertexIds };
}

// ─── 8. Mirror Mesh ─────────────────────────────────────────

export interface MirrorMeshResult {
  /** New vertex IDs from the mirrored half */
  newVertexIds: number[];
  /** New face IDs from the mirrored half */
  newFaceIds: number[];
  /** Vertex pairs that were welded (original, mirrored) */
  weldedVertexPairs: Array<[number, number]>;
}

/**
 * Mirror the mesh across the given axis, optionally welding boundary
 * vertices within a distance threshold.
 */
export function mirrorMesh(
  mesh: HalfEdgeMesh,
  axis: 'x' | 'y' | 'z',
  merge = true,
  threshold = 0.001,
): MirrorMeshResult {
  const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const newVertexIds: number[] = [];
  const newFaceIds: number[] = [];
  const weldedVertexPairs: Array<[number, number]> = [];

  // Map from original vertex ID to mirrored vertex ID
  const vertexMirrorMap = new Map<number, number>();

  // Snapshot existing topology
  const existingVertexIds = [...mesh.vertices.keys()];
  const existingFaces: Array<{ vertIds: number[] }> = [];
  for (const [, face] of mesh.faces) {
    const verts = mesh.faceVertices(face.id);
    existingFaces.push({ vertIds: verts.map((v) => v.id) });
  }

  // Create mirrored vertices
  for (const vid of existingVertexIds) {
    const v = mesh.vertices.get(vid)!;
    const pos: V3 = [...v.position];
    pos[axisIdx] = -pos[axisIdx];
    const nv = mesh.addVertex(pos[0], pos[1], pos[2]);
    nv.normal = [...v.normal];
    nv.normal[axisIdx] = -nv.normal[axisIdx];
    vertexMirrorMap.set(vid, nv.id);
    newVertexIds.push(nv.id);
  }

  // Create mirrored faces (reverse winding for correct normals)
  for (const { vertIds } of existingFaces) {
    const mirroredVerts = vertIds.map((vid) => vertexMirrorMap.get(vid)!);
    // Reverse winding to flip normals
    mirroredVerts.reverse();
    const face = mesh.addFace(mirroredVerts);
    if (face) newFaceIds.push(face.id);
  }

  // Weld boundary vertices near the mirror plane
  if (merge) {
    for (const vid of existingVertexIds) {
      const v = mesh.vertices.get(vid);
      if (!v) continue;

      // Only consider vertices close to the mirror plane
      if (Math.abs(v.position[axisIdx]) > threshold) continue;

      const mirroredId = vertexMirrorMap.get(vid)!;
      const mirroredV = mesh.vertices.get(mirroredId);
      if (!mirroredV) continue;

      if (v3Dist(v.position as V3, mirroredV.position as V3) <= threshold * 2) {
        // Snap original vertex exactly onto the plane
        v.position[axisIdx] = 0;
        mesh.mergeVertices(vid, mirroredId);
        weldedVertexPairs.push([vid, mirroredId]);
        // Remove from newVertexIds since it was merged
        const idx = newVertexIds.indexOf(mirroredId);
        if (idx >= 0) newVertexIds.splice(idx, 1);
      }
    }
  }

  mesh.computeVertexNormals();
  return { newVertexIds, newFaceIds, weldedVertexPairs };
}

// ─── 9. Catmull-Clark Subdivision ────────────────────────────

export interface CatmullClarkResult {
  /** Vertex count after subdivision */
  vertexCount: number;
  /** Face count after subdivision */
  faceCount: number;
}

/**
 * Full Catmull-Clark subdivision surface algorithm:
 * 1. Compute face points (centroid of each face)
 * 2. Compute edge points (avg of edge midpoint and adjacent face points)
 * 3. Move original vertex points using the CC formula
 * 4. Create new quads connecting face points, edge points, and vertex points
 */
export function catmullClarkSubdivide(
  mesh: HalfEdgeMesh,
  iterations = 1,
): CatmullClarkResult {
  for (let iter = 0; iter < iterations; iter++) {
    _catmullClarkOnePass(mesh);
  }
  return {
    vertexCount: mesh.vertices.size,
    faceCount: mesh.faces.size,
  };
}

function _catmullClarkOnePass(mesh: HalfEdgeMesh): void {
  // ── Step 1: Compute face points ──
  const facePoints = new Map<number, number>(); // faceId -> new vertex ID
  for (const [fid] of mesh.faces) {
    const centroid = mesh.faceCentroid(fid);
    const fv = mesh.addVertex(centroid[0], centroid[1], centroid[2]);
    facePoints.set(fid, fv.id);
  }

  // ── Step 2: Compute edge points ──
  // Canonical edge key -> { midpoint, adjFacePoints, newVertexId }
  type EdgeInfo = {
    v1: number;
    v2: number;
    faces: number[];
    vertexId: number;
  };
  const edgePointMap = new Map<string, EdgeInfo>();

  function canonicalEdgeKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  // Collect all unique edges with their adjacent faces
  for (const [fid] of mesh.faces) {
    const hes = mesh.faceHalfEdges(fid);
    for (const he of hes) {
      const origin = mesh.getOriginVertex(he);
      const target = he.vertex;
      const key = canonicalEdgeKey(origin, target);
      let info = edgePointMap.get(key);
      if (!info) {
        info = { v1: origin, v2: target, faces: [], vertexId: -1 };
        edgePointMap.set(key, info);
      }
      info.faces.push(fid);
    }
  }

  // Create edge point vertices
  for (const [, info] of edgePointMap) {
    const v1 = mesh.vertices.get(info.v1)!;
    const v2 = mesh.vertices.get(info.v2)!;
    const midpoint: V3 = [
      (v1.position[0] + v2.position[0]) / 2,
      (v1.position[1] + v2.position[1]) / 2,
      (v1.position[2] + v2.position[2]) / 2,
    ];

    if (info.faces.length === 2) {
      // Interior edge: average of midpoint and adjacent face points
      const fp1Id = facePoints.get(info.faces[0])!;
      const fp2Id = facePoints.get(info.faces[1])!;
      const fp1 = mesh.vertices.get(fp1Id)!;
      const fp2 = mesh.vertices.get(fp2Id)!;
      const fpAvg: V3 = [
        (fp1.position[0] + fp2.position[0]) / 2,
        (fp1.position[1] + fp2.position[1]) / 2,
        (fp1.position[2] + fp2.position[2]) / 2,
      ];
      const edgePoint: V3 = [
        (midpoint[0] + fpAvg[0]) / 2,
        (midpoint[1] + fpAvg[1]) / 2,
        (midpoint[2] + fpAvg[2]) / 2,
      ];
      const ev = mesh.addVertex(edgePoint[0], edgePoint[1], edgePoint[2]);
      info.vertexId = ev.id;
    } else {
      // Boundary edge: just use the midpoint
      const ev = mesh.addVertex(midpoint[0], midpoint[1], midpoint[2]);
      info.vertexId = ev.id;
    }
  }

  // ── Step 3: Move original vertex points ──
  // For each original vertex:
  //   newPos = (F + 2R + (n-3)P) / n
  // where F = avg of adjacent face points, R = avg of adjacent edge midpoints,
  // P = original position, n = valence

  const originalVertexIds = new Set<number>();
  for (const [vid] of mesh.vertices) {
    // Only process vertices that existed before we started adding face/edge points
    if (!facePoints.has(vid) && ![...edgePointMap.values()].some((e) => e.vertexId === vid)) {
      // This check is imprecise; instead track original vertex IDs before modifications
    }
  }

  // We need the original vertex IDs. Since we added facePoints and edgePoints,
  // the original vertices are those with IDs lower than the first face point.
  // More robustly, collect them before the loop:
  // We'll track by checking which vertices were endpoints of original edges.
  const edgePointVertIds = new Set<number>();
  for (const [, info] of edgePointMap) {
    edgePointVertIds.add(info.vertexId);
    originalVertexIds.add(info.v1);
    originalVertexIds.add(info.v2);
  }
  const facePointVertIds = new Set(facePoints.values());

  // Compute new positions for original vertices
  const newPositions = new Map<number, V3>();

  for (const vid of originalVertexIds) {
    const v = mesh.vertices.get(vid);
    if (!v) continue;

    // Find adjacent face points
    const adjFaces = mesh.vertexFaces(vid);
    const adjFacePointPositions: V3[] = [];
    for (const f of adjFaces) {
      const fpId = facePoints.get(f.id);
      if (fpId !== undefined) {
        const fp = mesh.vertices.get(fpId)!;
        adjFacePointPositions.push(fp.position as V3);
      }
    }

    // Find adjacent edge midpoints (original edge midpoints, not edge points)
    const adjEdgeMidpoints: V3[] = [];
    const adjHes = mesh.vertexHalfEdges(vid);
    for (const he of adjHes) {
      const target = mesh.vertices.get(he.vertex);
      if (target) {
        adjEdgeMidpoints.push([
          (v.position[0] + target.position[0]) / 2,
          (v.position[1] + target.position[1]) / 2,
          (v.position[2] + target.position[2]) / 2,
        ]);
      }
    }

    const n = adjFacePointPositions.length;
    if (n === 0) continue;

    // Check if boundary vertex
    const isBoundary = adjHes.some((he) => he.twin === null);

    if (isBoundary) {
      // Boundary vertex: average of adjacent boundary edge midpoints and original
      const boundaryMidpoints: V3[] = [];
      for (const he of adjHes) {
        if (he.twin === null) {
          const target = mesh.vertices.get(he.vertex)!;
          boundaryMidpoints.push([
            (v.position[0] + target.position[0]) / 2,
            (v.position[1] + target.position[1]) / 2,
            (v.position[2] + target.position[2]) / 2,
          ]);
        }
      }
      const bAvg = v3Avg(boundaryMidpoints.length > 0 ? boundaryMidpoints : [v.position as V3]);
      newPositions.set(vid, v3Lerp(v.position as V3, bAvg, 0.5));
    } else {
      // Interior vertex: CC formula
      const F = v3Avg(adjFacePointPositions);
      const R = v3Avg(adjEdgeMidpoints.length > 0 ? adjEdgeMidpoints : [v.position as V3]);
      const P: V3 = v.position as V3;

      const newPos: V3 = [
        (F[0] + 2 * R[0] + (n - 3) * P[0]) / n,
        (F[1] + 2 * R[1] + (n - 3) * P[1]) / n,
        (F[2] + 2 * R[2] + (n - 3) * P[2]) / n,
      ];
      newPositions.set(vid, newPos);
    }
  }

  // ── Step 4: Snapshot old faces, delete them, and create new quads ──
  const oldFaceData: Array<{ fid: number; vertIds: number[] }> = [];
  for (const [fid] of mesh.faces) {
    const verts = mesh.faceVertices(fid);
    oldFaceData.push({ fid, vertIds: verts.map((v) => v.id) });
  }

  // Delete all old faces
  for (const { fid } of oldFaceData) {
    deleteFace(mesh, fid);
  }

  // Apply new positions to original vertices
  for (const [vid, pos] of newPositions) {
    const v = mesh.vertices.get(vid);
    if (v) {
      v.position = [...pos];
    }
  }

  // Create new quads: for each old face, connect face point to edge points
  // to vertex points. For an n-gon face with vertices [v0, v1, ..., vn-1]:
  // Create n quads: (vertex_i, edgePt_i, facePt, edgePt_{i-1})
  for (const { fid, vertIds } of oldFaceData) {
    const fpId = facePoints.get(fid);
    if (fpId === undefined) continue;

    const n = vertIds.length;
    for (let i = 0; i < n; i++) {
      const prevIdx = (i - 1 + n) % n;
      const vid = vertIds[i];
      const nextVid = vertIds[(i + 1) % n];
      const prevVid = vertIds[prevIdx];

      // Edge point for edge (vid, nextVid)
      const epKeyNext = canonicalEdgeKey(vid, nextVid);
      const epNext = edgePointMap.get(epKeyNext);

      // Edge point for edge (prevVid, vid)
      const epKeyPrev = canonicalEdgeKey(prevVid, vid);
      const epPrev = edgePointMap.get(epKeyPrev);

      if (!epNext || !epPrev) continue;

      mesh.addFace([vid, epNext.vertexId, fpId, epPrev.vertexId]);
    }
  }

  // Clean up orphaned vertices that have no adjacent half-edges
  const usedVerts = new Set<number>();
  for (const [, he] of mesh.halfEdges) {
    usedVerts.add(he.vertex);
    const origin = mesh.getOriginVertex(he);
    if (origin >= 0) usedVerts.add(origin);
  }
  for (const [vid] of mesh.vertices) {
    if (!usedVerts.has(vid)) {
      mesh.vertices.delete(vid);
    }
  }

  mesh.computeVertexNormals();
}

// ─── Helper: Delete a face and its half-edges ────────────────

function deleteFace(mesh: HalfEdgeMesh, faceId: number): void {
  const face = mesh.faces.get(faceId);
  if (!face) return;

  const hes = mesh.faceHalfEdges(faceId);
  for (const he of hes) {
    // Unlink twin references
    if (he.twin !== null) {
      const twin = mesh.halfEdges.get(he.twin);
      if (twin) twin.twin = null;
    }
    mesh.halfEdges.delete(he.id);
  }
  mesh.faces.delete(faceId);
}
