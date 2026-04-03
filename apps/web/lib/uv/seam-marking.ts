/**
 * UV Seam Marking
 *
 * Tools for marking seam edges on a HalfEdgeMesh, clearing seams,
 * querying seam edges, and splitting mesh faces into UV islands
 * by flood-filling across non-seam edges.
 */

import { HalfEdgeMesh } from "../mesh/half-edge";
import type { UVIsland } from "./uv-unwrap";

// ─── Seam Operations ──────────────────────────────────────

/**
 * Toggle the `isSeam` flag on a half-edge and its twin.
 * If the edge is already a seam, it is unmarked; otherwise it is marked.
 */
export function markSeam(mesh: HalfEdgeMesh, edgeId: number): void {
  const he = mesh.halfEdges.get(edgeId);
  if (!he) return;

  const newState = !he.isSeam;
  he.isSeam = newState;

  if (he.twin !== null) {
    const twin = mesh.halfEdges.get(he.twin);
    if (twin) {
      twin.isSeam = newState;
    }
  }
}

/**
 * Clear all seam markings from the mesh.
 */
export function clearSeams(mesh: HalfEdgeMesh): void {
  for (const [, he] of mesh.halfEdges) {
    he.isSeam = false;
  }
}

/**
 * Get IDs of all half-edges that are marked as seams.
 * Each unique edge pair is represented by one ID (the lower of the pair).
 */
export function getSeamEdges(mesh: HalfEdgeMesh): number[] {
  const seen = new Set<number>();
  const result: number[] = [];

  for (const [id, he] of mesh.halfEdges) {
    if (!he.isSeam) continue;
    // Deduplicate: only record the lower ID of the twin pair
    const twinId = he.twin;
    if (twinId !== null && seen.has(twinId)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

// ─── Island Splitting ─────────────────────────────────────

/**
 * Flood-fill faces stopping at seam edges to create UV islands.
 * Each island contains a contiguous group of faces not separated by seams.
 */
export function splitMeshBySeams(mesh: HalfEdgeMesh): UVIsland[] {
  const visited = new Set<number>();
  const islands: UVIsland[] = [];

  for (const [faceId] of mesh.faces) {
    if (visited.has(faceId)) continue;

    const islandFaces: number[] = [];
    const queue: number[] = [faceId];
    visited.add(faceId);

    while (queue.length > 0) {
      const currentFaceId = queue.pop()!;
      islandFaces.push(currentFaceId);

      // Walk half-edges of this face to find neighbors
      const edges = mesh.faceHalfEdges(currentFaceId);
      for (const he of edges) {
        // Stop at seam edges
        if (he.isSeam) continue;
        // Stop at boundary edges
        if (he.twin === null) continue;

        const twin = mesh.halfEdges.get(he.twin);
        if (!twin || twin.face === null) continue;
        if (visited.has(twin.face)) continue;

        visited.add(twin.face);
        queue.push(twin.face);
      }
    }

    // Build UV map for the island by projecting from average normal
    const uvs = new Map<number, [number, number]>();
    let avgNx = 0;
    let avgNy = 0;
    let avgNz = 0;

    for (const fid of islandFaces) {
      const face = mesh.faces.get(fid);
      if (face) {
        avgNx += face.normal[0];
        avgNy += face.normal[1];
        avgNz += face.normal[2];
      }
    }

    const len = Math.sqrt(avgNx * avgNx + avgNy * avgNy + avgNz * avgNz) || 1;
    const normal: [number, number, number] = [avgNx / len, avgNy / len, avgNz / len];

    // Build tangent frame
    const ref: [number, number, number] =
      Math.abs(normal[1]) < 0.999 ? [0, 1, 0] : [1, 0, 0];
    const uAxis: [number, number, number] = normalize3(cross3(normal, ref));
    const vAxis: [number, number, number] = cross3(normal, uAxis);

    // Find a reference origin from the first vertex of the first face
    let origin: [number, number, number] = [0, 0, 0];
    const firstFaceVerts = mesh.faceVertices(islandFaces[0]);
    if (firstFaceVerts.length > 0) {
      origin = firstFaceVerts[0].position;
    }

    for (const fid of islandFaces) {
      const verts = mesh.faceVertices(fid);
      for (const v of verts) {
        if (uvs.has(v.id)) continue;
        const dx = v.position[0] - origin[0];
        const dy = v.position[1] - origin[1];
        const dz = v.position[2] - origin[2];
        const u = dx * uAxis[0] + dy * uAxis[1] + dz * uAxis[2];
        const vCoord = dx * vAxis[0] + dy * vAxis[1] + dz * vAxis[2];
        uvs.set(v.id, [u, vCoord]);
      }
    }

    // Compute bounds
    let minU = Infinity;
    let minV = Infinity;
    let maxU = -Infinity;
    let maxV = -Infinity;
    for (const [, [u, v]] of uvs) {
      if (u < minU) minU = u;
      if (v < minV) minV = v;
      if (u > maxU) maxU = u;
      if (v > maxV) maxV = v;
    }

    islands.push({
      faceIds: islandFaces,
      uvs,
      bounds: { minU, minV, maxU, maxV },
    });
  }

  return islands;
}

// ─── Local vector helpers ─────────────────────────────────

function cross3(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize3(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}
