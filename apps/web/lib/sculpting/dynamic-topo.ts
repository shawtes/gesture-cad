/**
 * Dynamic Topology — Adaptive Mesh Refinement During Sculpt
 *
 * Splits edges that are too long and collapses edges that are too short
 * within the active brush region. This keeps triangle density proportional
 * to detail level, similar to Blender's Dyntopo mode.
 */

import type { HalfEdgeMesh, HEHalfEdge } from "../mesh/half-edge";

// ─── Helpers ─────────────────────────────────────────────

function edgeLengthSq(mesh: HalfEdgeMesh, he: HEHalfEdge): number {
  const originId = mesh.getOriginVertex(he);
  const origin = mesh.vertices.get(originId);
  const target = mesh.vertices.get(he.vertex);
  if (!origin || !target) return 0;

  const dx = target.position[0] - origin.position[0];
  const dy = target.position[1] - origin.position[1];
  const dz = target.position[2] - origin.position[2];
  return dx * dx + dy * dy + dz * dz;
}

function isEdgeInSphere(
  mesh: HalfEdgeMesh,
  he: HEHalfEdge,
  center: [number, number, number],
  radius: number
): boolean {
  const originId = mesh.getOriginVertex(he);
  const origin = mesh.vertices.get(originId);
  const target = mesh.vertices.get(he.vertex);
  if (!origin || !target) return false;

  const radiusSq = radius * radius;

  // Check if either endpoint is within the sphere
  const dx1 = origin.position[0] - center[0];
  const dy1 = origin.position[1] - center[1];
  const dz1 = origin.position[2] - center[2];
  if (dx1 * dx1 + dy1 * dy1 + dz1 * dz1 <= radiusSq) return true;

  const dx2 = target.position[0] - center[0];
  const dy2 = target.position[1] - center[1];
  const dz2 = target.position[2] - center[2];
  if (dx2 * dx2 + dy2 * dy2 + dz2 * dz2 <= radiusSq) return true;

  return false;
}

// ─── Dynamic Topology Refine ─────────────────────────────

/**
 * Split edges longer than `targetEdgeLength` within the brush sphere.
 * Each split inserts a midpoint vertex via mesh.splitEdge().
 *
 * Returns the number of edges split.
 */
export function dynamicTopologyRefine(
  mesh: HalfEdgeMesh,
  center: [number, number, number],
  radius: number,
  targetEdgeLength: number
): number {
  const targetLenSq = targetEdgeLength * targetEdgeLength;
  let splitCount = 0;

  // Collect edge IDs to process (avoid mutating while iterating)
  const edgesToSplit: number[] = [];
  const visited = new Set<number>();

  for (const [id, he] of mesh.halfEdges) {
    // Skip if we already processed the twin of this edge
    if (visited.has(id)) continue;
    if (he.twin !== null) visited.add(he.twin);

    // Only process edges within the brush sphere
    if (!isEdgeInSphere(mesh, he, center, radius)) continue;

    const lenSq = edgeLengthSq(mesh, he);
    if (lenSq > targetLenSq) {
      edgesToSplit.push(id);
    }
  }

  // Split edges (longest first for better results)
  edgesToSplit.sort((a, b) => {
    const heA = mesh.halfEdges.get(a);
    const heB = mesh.halfEdges.get(b);
    if (!heA || !heB) return 0;
    return edgeLengthSq(mesh, heB) - edgeLengthSq(mesh, heA);
  });

  for (const edgeId of edgesToSplit) {
    // Verify the edge still exists (previous splits may have removed it)
    if (!mesh.halfEdges.has(edgeId)) continue;

    const result = mesh.splitEdge(edgeId);
    if (result) splitCount++;
  }

  // Recompute normals in the affected region
  if (splitCount > 0) {
    mesh.computeVertexNormals();
  }

  return splitCount;
}

// ─── Dynamic Topology Collapse ───────────────────────────

/**
 * Collapse edges shorter than `targetEdgeLength * 0.5` within the
 * brush sphere. Each collapse merges two vertices via mesh.collapseEdge().
 *
 * Returns the number of edges collapsed.
 */
export function dynamicTopologyCollapse(
  mesh: HalfEdgeMesh,
  center: [number, number, number],
  radius: number,
  targetEdgeLength: number
): number {
  const minLenSq = (targetEdgeLength * 0.5) * (targetEdgeLength * 0.5);
  let collapseCount = 0;

  // Collect candidate edges
  const edgesToCollapse: number[] = [];
  const visited = new Set<number>();

  for (const [id, he] of mesh.halfEdges) {
    if (visited.has(id)) continue;
    if (he.twin !== null) visited.add(he.twin);

    if (!isEdgeInSphere(mesh, he, center, radius)) continue;

    const lenSq = edgeLengthSq(mesh, he);
    if (lenSq < minLenSq) {
      edgesToCollapse.push(id);
    }
  }

  // Collapse edges (shortest first)
  edgesToCollapse.sort((a, b) => {
    const heA = mesh.halfEdges.get(a);
    const heB = mesh.halfEdges.get(b);
    if (!heA || !heB) return 0;
    return edgeLengthSq(mesh, heA) - edgeLengthSq(mesh, heB);
  });

  for (const edgeId of edgesToCollapse) {
    if (!mesh.halfEdges.has(edgeId)) continue;

    const result = mesh.collapseEdge(edgeId);
    if (result) collapseCount++;
  }

  if (collapseCount > 0) {
    mesh.computeVertexNormals();
  }

  return collapseCount;
}

// ─── Combined Pass ───────────────────────────────────────

/**
 * Run both refine and collapse in a single pass. This is the typical
 * entry point called once per brush stroke sample.
 */
export function dynamicTopologyPass(
  mesh: HalfEdgeMesh,
  center: [number, number, number],
  radius: number,
  targetEdgeLength: number
): { split: number; collapsed: number } {
  const split = dynamicTopologyRefine(mesh, center, radius, targetEdgeLength);
  const collapsed = dynamicTopologyCollapse(mesh, center, radius, targetEdgeLength);
  return { split, collapsed };
}
