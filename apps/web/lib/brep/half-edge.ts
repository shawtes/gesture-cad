/**
 * B-Rep Half-Edge Data Structure
 *
 * Boundary Representation using the half-edge (DCEL) data structure.
 * Each edge is split into two directed half-edges.
 * Satisfies the Euler-Poincare formula: V - E + F = 2(S - G) + L
 *
 * Based on: Mantyla (1988) "An Introduction to Solid Modeling"
 * and Hoffmann (1989) "Geometric and Solid Modeling"
 */

export interface BRepVertex {
  id: string;
  position: [number, number, number];
  /** One outgoing half-edge */
  halfEdge: string | null;
}

export interface BRepHalfEdge {
  id: string;
  /** Origin vertex ID */
  origin: string;
  /** Twin (opposite direction) half-edge ID */
  twin: string | null;
  /** Next half-edge in the face loop */
  next: string | null;
  /** Previous half-edge in the face loop */
  prev: string | null;
  /** Incident face ID */
  face: string | null;
}

export interface BRepEdge {
  id: string;
  /** One of the two half-edges */
  halfEdge: string;
}

export interface BRepLoop {
  id: string;
  /** One half-edge in this loop */
  halfEdge: string;
  /** True if this is an inner loop (hole) */
  isInner: boolean;
}

export interface BRepFace {
  id: string;
  /** Outer boundary loop */
  outerLoop: string;
  /** Inner loops (holes) */
  innerLoops: string[];
  /** Surface geometry reference */
  surfaceId?: string;
  /** Face normal (computed from loop orientation) */
  normal: [number, number, number];
}

export interface BRepShell {
  id: string;
  /** Face IDs in this shell */
  faces: string[];
}

export interface BRepSolid {
  id: string;
  /** Outer shell */
  outerShell: string;
  /** Inner shells (voids) */
  innerShells: string[];
  /** Genus (number of through-holes) */
  genus: number;
}

/**
 * Complete B-Rep topology container.
 */
export interface BRepTopology {
  vertices: Map<string, BRepVertex>;
  halfEdges: Map<string, BRepHalfEdge>;
  edges: Map<string, BRepEdge>;
  loops: Map<string, BRepLoop>;
  faces: Map<string, BRepFace>;
  shells: Map<string, BRepShell>;
  solids: Map<string, BRepSolid>;
}

let brepCounter = 0;
function nextBRepId(prefix: string): string {
  return `${prefix}_${++brepCounter}`;
}

/**
 * Create an empty B-Rep topology.
 */
export function createBRepTopology(): BRepTopology {
  return {
    vertices: new Map(),
    halfEdges: new Map(),
    edges: new Map(),
    loops: new Map(),
    faces: new Map(),
    shells: new Map(),
    solids: new Map(),
  };
}

// ═══════════════════════════════════════════════════════════
// Euler Operators — maintain the Euler-Poincare invariant
// V - E + F = 2(S - G) + L
// ═══════════════════════════════════════════════════════════

/**
 * MVFS — Make Vertex, Face, Shell.
 * Creates the initial topology: one vertex, one face, one shell.
 */
export function mvfs(
  topo: BRepTopology,
  position: [number, number, number]
): { vertexId: string; faceId: string; shellId: string } {
  const vertexId = nextBRepId("v");
  const faceId = nextBRepId("f");
  const shellId = nextBRepId("sh");
  const loopId = nextBRepId("lp");

  const vertex: BRepVertex = { id: vertexId, position, halfEdge: null };
  const loop: BRepLoop = { id: loopId, halfEdge: "", isInner: false };
  const face: BRepFace = { id: faceId, outerLoop: loopId, innerLoops: [], normal: [0, 1, 0] };
  const shell: BRepShell = { id: shellId, faces: [faceId] };

  topo.vertices.set(vertexId, vertex);
  topo.loops.set(loopId, loop);
  topo.faces.set(faceId, face);
  topo.shells.set(shellId, shell);

  return { vertexId, faceId, shellId };
}

/**
 * MEV — Make Edge, Vertex.
 * Splits a vertex by adding a new edge and vertex.
 */
export function mev(
  topo: BRepTopology,
  fromVertexId: string,
  faceId: string,
  newPosition: [number, number, number]
): { vertexId: string; edgeId: string; halfEdgeIds: [string, string] } {
  const newVertexId = nextBRepId("v");
  const edgeId = nextBRepId("e");
  const he1Id = nextBRepId("he");
  const he2Id = nextBRepId("he");

  const newVertex: BRepVertex = { id: newVertexId, position: newPosition, halfEdge: he2Id };
  const he1: BRepHalfEdge = { id: he1Id, origin: fromVertexId, twin: he2Id, next: he2Id, prev: he2Id, face: faceId };
  const he2: BRepHalfEdge = { id: he2Id, origin: newVertexId, twin: he1Id, next: he1Id, prev: he1Id, face: faceId };
  const edge: BRepEdge = { id: edgeId, halfEdge: he1Id };

  // Update from vertex
  const fromVertex = topo.vertices.get(fromVertexId);
  if (fromVertex && !fromVertex.halfEdge) {
    fromVertex.halfEdge = he1Id;
  }

  topo.vertices.set(newVertexId, newVertex);
  topo.halfEdges.set(he1Id, he1);
  topo.halfEdges.set(he2Id, he2);
  topo.edges.set(edgeId, edge);

  return { vertexId: newVertexId, edgeId, halfEdgeIds: [he1Id, he2Id] };
}

/**
 * MEF — Make Edge, Face.
 * Splits a face by connecting two vertices with a new edge.
 */
export function mef(
  topo: BRepTopology,
  vertexA: string,
  vertexB: string,
  faceId: string
): { faceId: string; edgeId: string; halfEdgeIds: [string, string] } {
  const newFaceId = nextBRepId("f");
  const edgeId = nextBRepId("e");
  const he1Id = nextBRepId("he");
  const he2Id = nextBRepId("he");
  const newLoopId = nextBRepId("lp");

  const he1: BRepHalfEdge = { id: he1Id, origin: vertexA, twin: he2Id, next: null, prev: null, face: faceId };
  const he2: BRepHalfEdge = { id: he2Id, origin: vertexB, twin: he1Id, next: null, prev: null, face: newFaceId };
  const edge: BRepEdge = { id: edgeId, halfEdge: he1Id };
  const newLoop: BRepLoop = { id: newLoopId, halfEdge: he2Id, isInner: false };
  const newFace: BRepFace = { id: newFaceId, outerLoop: newLoopId, innerLoops: [], normal: [0, 1, 0] };

  topo.halfEdges.set(he1Id, he1);
  topo.halfEdges.set(he2Id, he2);
  topo.edges.set(edgeId, edge);
  topo.loops.set(newLoopId, newLoop);
  topo.faces.set(newFaceId, newFace);

  // Add new face to the first shell found
  for (const shell of topo.shells.values()) {
    if (shell.faces.includes(faceId)) {
      shell.faces.push(newFaceId);
      break;
    }
  }

  return { faceId: newFaceId, edgeId, halfEdgeIds: [he1Id, he2Id] };
}

/**
 * KEMR — Kill Edge, Make Ring.
 * Removes an edge and creates an inner loop (hole in a face).
 */
export function kemr(
  topo: BRepTopology,
  edgeId: string
): { loopId: string } {
  const edge = topo.edges.get(edgeId);
  if (!edge) throw new Error(`Edge ${edgeId} not found`);

  const newLoopId = nextBRepId("lp");
  const he = topo.halfEdges.get(edge.halfEdge);

  const newLoop: BRepLoop = {
    id: newLoopId,
    halfEdge: he?.next || "",
    isInner: true
  };

  // Add inner loop to the face
  if (he?.face) {
    const face = topo.faces.get(he.face);
    if (face) face.innerLoops.push(newLoopId);
  }

  topo.loops.set(newLoopId, newLoop);
  topo.edges.delete(edgeId);
  if (edge.halfEdge) topo.halfEdges.delete(edge.halfEdge);
  const twin = he?.twin;
  if (twin) topo.halfEdges.delete(twin);

  return { loopId: newLoopId };
}

/**
 * KFMRH — Kill Face, Make Ring-Hole.
 * Creates a through-hole by removing a face and connecting shells.
 */
export function kfmrh(
  topo: BRepTopology,
  faceId: string,
  targetFaceId: string
): void {
  const face = topo.faces.get(faceId);
  if (!face) return;

  // Move the killed face's loop to target face as inner loop
  const targetFace = topo.faces.get(targetFaceId);
  if (targetFace) {
    targetFace.innerLoops.push(face.outerLoop);
    const loop = topo.loops.get(face.outerLoop);
    if (loop) loop.isInner = true;
  }

  // Remove face from shells
  for (const shell of topo.shells.values()) {
    const idx = shell.faces.indexOf(faceId);
    if (idx !== -1) shell.faces.splice(idx, 1);
  }

  topo.faces.delete(faceId);
}

/**
 * Validate the Euler-Poincare formula: V - E + F = 2(S - G) + L
 */
export function validateEulerPoincare(topo: BRepTopology): {
  valid: boolean;
  V: number; E: number; F: number; S: number; G: number; L: number;
  lhs: number; rhs: number;
} {
  const V = topo.vertices.size;
  const E = topo.edges.size;
  const F = topo.faces.size;
  const S = topo.shells.size;
  const G = Array.from(topo.solids.values()).reduce((sum, s) => sum + s.genus, 0);
  const L = topo.loops.size;

  const lhs = V - E + F;
  const rhs = 2 * (S - G) + L;

  return { valid: lhs === rhs, V, E, F, S, G, L, lhs, rhs };
}

/**
 * Convert a B-Rep to a tessellated mesh for rendering.
 */
export function brepToMesh(topo: BRepTopology): {
  vertices: number[];
  normals: number[];
  indices: number[];
} {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Simple triangulation: for each face, collect vertices from the outer loop
  for (const face of topo.faces.values()) {
    const loop = topo.loops.get(face.outerLoop);
    if (!loop || !loop.halfEdge) continue;

    const faceVerts: [number, number, number][] = [];
    let currentHE = loop.halfEdge;
    const visited = new Set<string>();

    while (currentHE && !visited.has(currentHE)) {
      visited.add(currentHE);
      const he = topo.halfEdges.get(currentHE);
      if (!he) break;

      const vertex = topo.vertices.get(he.origin);
      if (vertex) faceVerts.push(vertex.position);

      currentHE = he.next || "";
    }

    // Fan triangulation
    if (faceVerts.length >= 3) {
      const baseIdx = vertices.length / 3;
      for (const v of faceVerts) {
        vertices.push(v[0], v[1], v[2]);
        normals.push(face.normal[0], face.normal[1], face.normal[2]);
      }
      for (let i = 1; i < faceVerts.length - 1; i++) {
        indices.push(baseIdx, baseIdx + i, baseIdx + i + 1);
      }
    }
  }

  return { vertices, normals, indices };
}
