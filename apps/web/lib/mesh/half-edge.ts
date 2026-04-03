/**
 * Half-Edge Mesh Data Structure
 *
 * Provides topological queries (vertex → edges, face → edges, edge → faces)
 * that flat arrays cannot. Foundation for all mesh editing, sculpting, UV, rigging.
 *
 * Based on the winged/half-edge structure used in Blender's BMesh.
 */

// ─── Core Types ────────────────────────────────────────────

export interface HEVertex {
  id: number;
  position: [number, number, number];
  normal: [number, number, number];
  /** Any outgoing half-edge from this vertex */
  halfEdge: number | null;
  /** UV coordinates (set during UV unwrap) */
  uv?: [number, number];
  /** Bone weights for skinning: { boneIndex: weight } */
  skinWeights?: Map<number, number>;
}

export interface HEHalfEdge {
  id: number;
  /** Vertex this half-edge points TO */
  vertex: number;
  /** Opposite half-edge (twin/pair) */
  twin: number | null;
  /** Next half-edge in the face loop (CCW) */
  next: number;
  /** Previous half-edge in the face loop */
  prev: number;
  /** Face this half-edge belongs to (null = boundary) */
  face: number | null;
  /** Marks a UV seam edge */
  isSeam?: boolean;
  /** Marks a sharp/crease edge for subdivision */
  crease?: number; // 0-1
}

export interface HEFace {
  id: number;
  /** Any half-edge on this face's boundary loop */
  halfEdge: number;
  /** Cached face normal */
  normal: [number, number, number];
  /** Material index */
  materialIndex: number;
}

export interface HELoop {
  /** Half-edge for this loop corner */
  halfEdge: number;
  /** Per-corner UV */
  uv: [number, number];
  /** Per-corner vertex color */
  color?: [number, number, number, number];
}

// ─── Half-Edge Mesh ────────────────────────────────────────

export class HalfEdgeMesh {
  vertices: Map<number, HEVertex> = new Map();
  halfEdges: Map<number, HEHalfEdge> = new Map();
  faces: Map<number, HEFace> = new Map();
  loops: HELoop[] = [];

  private nextVertexId = 0;
  private nextHalfEdgeId = 0;
  private nextFaceId = 0;

  // ─── Factory Methods ───────────────────────────────────

  addVertex(x: number, y: number, z: number): HEVertex {
    const v: HEVertex = {
      id: this.nextVertexId++,
      position: [x, y, z],
      normal: [0, 1, 0],
      halfEdge: null,
    };
    this.vertices.set(v.id, v);
    return v;
  }

  addFace(vertexIds: number[]): HEFace | null {
    if (vertexIds.length < 3) return null;
    const faceId = this.nextFaceId++;
    const edgeIds: number[] = [];

    // Create half-edges for this face
    for (let i = 0; i < vertexIds.length; i++) {
      const he: HEHalfEdge = {
        id: this.nextHalfEdgeId++,
        vertex: vertexIds[(i + 1) % vertexIds.length],
        twin: null,
        next: -1, // set below
        prev: -1,
        face: faceId,
      };
      this.halfEdges.set(he.id, he);
      edgeIds.push(he.id);
    }

    // Link next/prev in the face loop
    for (let i = 0; i < edgeIds.length; i++) {
      const he = this.halfEdges.get(edgeIds[i])!;
      he.next = edgeIds[(i + 1) % edgeIds.length];
      he.prev = edgeIds[(i - 1 + edgeIds.length) % edgeIds.length];
    }

    // Set vertex → halfEdge references
    for (let i = 0; i < vertexIds.length; i++) {
      const v = this.vertices.get(vertexIds[i]);
      if (v && v.halfEdge === null) {
        v.halfEdge = edgeIds[i];
      }
    }

    const face: HEFace = {
      id: faceId,
      halfEdge: edgeIds[0],
      normal: [0, 1, 0],
      materialIndex: 0,
    };
    this.faces.set(faceId, face);

    // Try to pair twins with existing half-edges
    this._pairTwins(edgeIds);

    // Compute face normal
    this._computeFaceNormal(face);

    return face;
  }

  private _pairTwins(newEdgeIds: number[]) {
    for (const eid of newEdgeIds) {
      const he = this.halfEdges.get(eid)!;
      if (he.twin !== null) continue;
      const fromVert = this._getOriginVertex(he);
      const toVert = he.vertex;

      // Look for an existing half-edge going the opposite direction
      for (const [otherId, other] of this.halfEdges) {
        if (otherId === eid || other.twin !== null) continue;
        const otherFrom = this._getOriginVertex(other);
        if (otherFrom === toVert && other.vertex === fromVert) {
          he.twin = otherId;
          other.twin = eid;
          break;
        }
      }
    }
  }

  /** Get the origin (start) vertex of a half-edge */
  private _getOriginVertex(he: HEHalfEdge): number {
    const prev = this.halfEdges.get(he.prev);
    return prev ? prev.vertex : -1;
  }

  getOriginVertex(he: HEHalfEdge): number {
    return this._getOriginVertex(he);
  }

  // ─── Topological Queries ───────────────────────────────

  /** Get all half-edges around a vertex (fan) */
  vertexHalfEdges(vertexId: number): HEHalfEdge[] {
    const v = this.vertices.get(vertexId);
    if (!v || v.halfEdge === null) return [];

    const result: HEHalfEdge[] = [];
    let current = v.halfEdge;
    const start = current;

    do {
      const he = this.halfEdges.get(current);
      if (!he) break;
      result.push(he);
      // Navigate to next outgoing edge: go to prev, then twin
      const prev = this.halfEdges.get(he.prev);
      if (!prev || prev.twin === null) break;
      current = prev.twin;
    } while (current !== start);

    return result;
  }

  /** Get all faces around a vertex */
  vertexFaces(vertexId: number): HEFace[] {
    return this.vertexHalfEdges(vertexId)
      .filter((he) => he.face !== null)
      .map((he) => this.faces.get(he.face!)!)
      .filter(Boolean);
  }

  /** Get all vertices of a face */
  faceVertices(faceId: number): HEVertex[] {
    const face = this.faces.get(faceId);
    if (!face) return [];
    const result: HEVertex[] = [];
    let he = this.halfEdges.get(face.halfEdge);
    if (!he) return [];
    const start = he.id;
    let iterations = 0;
    do {
      const origin = this._getOriginVertex(he);
      const v = this.vertices.get(origin);
      if (v) result.push(v);
      he = this.halfEdges.get(he.next);
      if (!he || ++iterations > this.halfEdges.size) break;
    } while (he.id !== start);
    return result;
  }

  /** Get half-edges forming a face loop */
  faceHalfEdges(faceId: number): HEHalfEdge[] {
    const face = this.faces.get(faceId);
    if (!face) return [];
    const result: HEHalfEdge[] = [];
    let he = this.halfEdges.get(face.halfEdge);
    if (!he) return [];
    const start = he.id;
    let iterations = 0;
    do {
      result.push(he);
      he = this.halfEdges.get(he.next);
      if (!he || ++iterations > this.halfEdges.size) break;
    } while (he.id !== start);
    return result;
  }

  /** Get edge loop: traverse quads following parallel edges */
  edgeLoop(startEdgeId: number): number[] {
    const loop: number[] = [startEdgeId];
    let current = startEdgeId;

    // Forward direction — bound by total edge count to prevent infinite loops
    const maxIterations = this.halfEdges.size;
    for (let i = 0; i < maxIterations; i++) {
      const he = this.halfEdges.get(current);
      if (!he || he.twin === null) break;
      const twin = this.halfEdges.get(he.twin)!;
      // In a quad, the opposite edge is next.next
      const opp = this.halfEdges.get(twin.next);
      if (!opp) break;
      const oppNext = this.halfEdges.get(opp.next);
      if (!oppNext) break;
      if (oppNext.id === startEdgeId) break; // closed loop
      loop.push(oppNext.id);
      current = oppNext.id;
    }

    return loop;
  }

  /** Get boundary edges (no twin) */
  boundaryEdges(): HEHalfEdge[] {
    const result: HEHalfEdge[] = [];
    for (const [, he] of this.halfEdges) {
      if (he.twin === null) result.push(he);
    }
    return result;
  }

  // ─── Euler Operators ───────────────────────────────────

  /** Split an edge at its midpoint, returns new vertex */
  splitEdge(edgeId: number): HEVertex | null {
    const he = this.halfEdges.get(edgeId);
    if (!he) return null;

    const originId = this._getOriginVertex(he);
    const origin = this.vertices.get(originId);
    const target = this.vertices.get(he.vertex);
    if (!origin || !target) return null;

    // Create midpoint vertex
    const mid = this.addVertex(
      (origin.position[0] + target.position[0]) / 2,
      (origin.position[1] + target.position[1]) / 2,
      (origin.position[2] + target.position[2]) / 2
    );

    // Create new half-edge from mid to target
    const newHe: HEHalfEdge = {
      id: this.nextHalfEdgeId++,
      vertex: he.vertex,
      twin: null,
      next: he.next,
      prev: he.id,
      face: he.face,
    };
    this.halfEdges.set(newHe.id, newHe);

    // Update original edge to point to midpoint
    const oldNext = he.next;
    he.vertex = mid.id;
    he.next = newHe.id;

    // Fix prev of old next
    const oldNextHe = this.halfEdges.get(oldNext);
    if (oldNextHe) oldNextHe.prev = newHe.id;

    mid.halfEdge = newHe.id;

    // Handle twin side
    if (he.twin !== null) {
      const twin = this.halfEdges.get(he.twin)!;
      const newTwin: HEHalfEdge = {
        id: this.nextHalfEdgeId++,
        vertex: originId,
        twin: null,
        next: twin.next,
        prev: twin.id,
        face: twin.face,
      };
      this.halfEdges.set(newTwin.id, newTwin);

      const twinOldNext = twin.next;
      twin.vertex = mid.id;
      twin.next = newTwin.id;

      const twinNextHe = this.halfEdges.get(twinOldNext);
      if (twinNextHe) twinNextHe.prev = newTwin.id;

      // Pair new twins
      newHe.twin = newTwin.id;
      newTwin.twin = newHe.id;
      // Update existing twin pairing
      he.twin = twin.id;
      twin.twin = he.id;
    }

    return mid;
  }

  /** Collapse an edge: merge two vertices into one */
  collapseEdge(edgeId: number): HEVertex | null {
    const he = this.halfEdges.get(edgeId);
    if (!he) return null;

    const keepId = this._getOriginVertex(he);
    const removeId = he.vertex;
    const keep = this.vertices.get(keepId);
    const remove = this.vertices.get(removeId);
    if (!keep || !remove) return null;

    // Move keep to midpoint
    keep.position[0] = (keep.position[0] + remove.position[0]) / 2;
    keep.position[1] = (keep.position[1] + remove.position[1]) / 2;
    keep.position[2] = (keep.position[2] + remove.position[2]) / 2;

    // Redirect all half-edges that pointed to remove
    for (const [, other] of this.halfEdges) {
      if (other.vertex === removeId) {
        other.vertex = keepId;
      }
    }

    // Remove degenerate faces (faces with < 3 unique vertices)
    this._removeAdjacentFaces(edgeId);

    this.vertices.delete(removeId);
    return keep;
  }

  /** Merge two vertices at the same position */
  mergeVertices(v1Id: number, v2Id: number): HEVertex | null {
    const v1 = this.vertices.get(v1Id);
    const v2 = this.vertices.get(v2Id);
    if (!v1 || !v2) return null;

    // Redirect all references from v2 to v1
    for (const [, he] of this.halfEdges) {
      if (he.vertex === v2Id) {
        he.vertex = v1Id;
      }
    }

    v1.position[0] = (v1.position[0] + v2.position[0]) / 2;
    v1.position[1] = (v1.position[1] + v2.position[1]) / 2;
    v1.position[2] = (v1.position[2] + v2.position[2]) / 2;

    this.vertices.delete(v2Id);
    return v1;
  }

  private _removeAdjacentFaces(edgeId: number) {
    const he = this.halfEdges.get(edgeId);
    if (!he) return;

    const facesToCheck = new Set<number>();
    if (he.face !== null) facesToCheck.add(he.face);
    if (he.twin !== null) {
      const twin = this.halfEdges.get(he.twin)!;
      if (twin.face !== null) facesToCheck.add(twin.face);
    }

    for (const fid of facesToCheck) {
      const faceVerts = this.faceVertices(fid);
      const uniqueVerts = new Set(faceVerts.map((v) => v.id));
      if (uniqueVerts.size < 3) {
        this._removeFace(fid);
      }
    }
  }

  private _removeFace(faceId: number) {
    const edges = this.faceHalfEdges(faceId);
    for (const he of edges) {
      he.face = null;
      this.halfEdges.delete(he.id);
    }
    this.faces.delete(faceId);
  }

  // ─── Conversion: TessellatedMesh ↔ HalfEdgeMesh ───────

  /** Import from flat-array TessellatedMesh */
  static fromTessellatedMesh(mesh: {
    vertices: number[];
    normals: number[];
    indices: number[];
  }): HalfEdgeMesh {
    const hem = new HalfEdgeMesh();
    const vertCount = mesh.vertices.length / 3;

    // Add vertices
    for (let i = 0; i < vertCount; i++) {
      const v = hem.addVertex(
        mesh.vertices[i * 3],
        mesh.vertices[i * 3 + 1],
        mesh.vertices[i * 3 + 2]
      );
      if (mesh.normals.length > i * 3 + 2) {
        v.normal = [
          mesh.normals[i * 3],
          mesh.normals[i * 3 + 1],
          mesh.normals[i * 3 + 2],
        ];
      }
    }

    // Add faces (triangles)
    for (let i = 0; i < mesh.indices.length; i += 3) {
      hem.addFace([
        mesh.indices[i],
        mesh.indices[i + 1],
        mesh.indices[i + 2],
      ]);
    }

    hem.computeVertexNormals();
    return hem;
  }

  /** Export to flat-array TessellatedMesh */
  toTessellatedMesh(): {
    vertices: number[];
    normals: number[];
    indices: number[];
  } {
    // Re-index vertices contiguously
    const vertexMap = new Map<number, number>();
    const vertices: number[] = [];
    const normals: number[] = [];
    let idx = 0;

    for (const [vid, v] of this.vertices) {
      vertexMap.set(vid, idx++);
      vertices.push(v.position[0], v.position[1], v.position[2]);
      normals.push(v.normal[0], v.normal[1], v.normal[2]);
    }

    const indices: number[] = [];

    for (const [, face] of this.faces) {
      const faceVerts = this.faceVertices(face.id);
      if (faceVerts.length < 3) continue;

      // Triangulate n-gons via fan
      const v0 = vertexMap.get(faceVerts[0].id)!;
      for (let i = 1; i < faceVerts.length - 1; i++) {
        indices.push(
          v0,
          vertexMap.get(faceVerts[i].id)!,
          vertexMap.get(faceVerts[i + 1].id)!
        );
      }
    }

    return { vertices, normals, indices };
  }

  // ─── Normals ───────────────────────────────────────────

  private _computeFaceNormal(face: HEFace) {
    const verts = this.faceVertices(face.id);
    if (verts.length < 3) return;
    const a = verts[0].position;
    const b = verts[1].position;
    const c = verts[2].position;

    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];

    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    face.normal = [nx / len, ny / len, nz / len];
  }

  computeVertexNormals() {
    // Reset all vertex normals
    for (const [, v] of this.vertices) {
      v.normal = [0, 0, 0];
    }

    // Accumulate face normals (area-weighted)
    for (const [, face] of this.faces) {
      this._computeFaceNormal(face);
      const verts = this.faceVertices(face.id);
      for (const v of verts) {
        v.normal[0] += face.normal[0];
        v.normal[1] += face.normal[1];
        v.normal[2] += face.normal[2];
      }
    }

    // Normalize
    for (const [, v] of this.vertices) {
      const len = Math.sqrt(
        v.normal[0] ** 2 + v.normal[1] ** 2 + v.normal[2] ** 2
      ) || 1;
      v.normal[0] /= len;
      v.normal[1] /= len;
      v.normal[2] /= len;
    }
  }

  // ─── Validation ────────────────────────────────────────

  /** Euler-Poincaré check: V - E + F = 2(1 - g) for genus-g manifold */
  validateManifold(): {
    valid: boolean;
    vertices: number;
    edges: number;
    faces: number;
    eulerCharacteristic: number;
    boundaryLoops: number;
    errors: string[];
  } {
    const V = this.vertices.size;
    const F = this.faces.size;
    const errors: string[] = [];

    // Count unique edges (each pair of twins = 1 edge)
    const edgeSet = new Set<string>();
    for (const [, he] of this.halfEdges) {
      const origin = this._getOriginVertex(he);
      const key = origin < he.vertex ? `${origin}-${he.vertex}` : `${he.vertex}-${origin}`;
      edgeSet.add(key);
    }
    const E = edgeSet.size;

    // Count boundary loops
    const visited = new Set<number>();
    let boundaryLoops = 0;
    for (const [, he] of this.halfEdges) {
      if (he.twin === null && !visited.has(he.id)) {
        boundaryLoops++;
        // Walk boundary
        let current = he.id;
        for (let i = 0; i < this.halfEdges.size; i++) {
          visited.add(current);
          const cur = this.halfEdges.get(current);
          if (!cur) break;
          // Find next boundary edge from target vertex
          let found = false;
          for (const [, other] of this.halfEdges) {
            if (other.twin === null && !visited.has(other.id) && this._getOriginVertex(other) === cur.vertex) {
              current = other.id;
              found = true;
              break;
            }
          }
          if (!found) break;
        }
      }
    }

    const eulerCharacteristic = V - E + F;

    // Check for non-manifold edges (> 2 faces sharing an edge)
    const edgeFaceCount = new Map<string, number>();
    for (const [, he] of this.halfEdges) {
      if (he.face === null) continue;
      const origin = this._getOriginVertex(he);
      const key = origin < he.vertex ? `${origin}-${he.vertex}` : `${he.vertex}-${origin}`;
      edgeFaceCount.set(key, (edgeFaceCount.get(key) || 0) + 1);
    }
    for (const [key, count] of edgeFaceCount) {
      if (count > 2) errors.push(`Non-manifold edge ${key}: ${count} faces`);
    }

    // For a closed manifold: V - E + F = 2
    // For manifold with boundary: V - E + F = 2 - boundaryLoops (approximately)
    const expectedEuler = 2 - boundaryLoops;
    const valid = errors.length === 0 && eulerCharacteristic === expectedEuler;

    return { valid, vertices: V, edges: E, faces: F, eulerCharacteristic, boundaryLoops, errors };
  }

  // ─── Selection Helpers ─────────────────────────────────

  /** Get all vertex IDs connected to a vertex (1-ring neighborhood) */
  vertexNeighbors(vertexId: number): number[] {
    const edges = this.vertexHalfEdges(vertexId);
    return edges.map((he) => he.vertex);
  }

  /** Get face centroid */
  faceCentroid(faceId: number): [number, number, number] {
    const verts = this.faceVertices(faceId);
    if (verts.length === 0) return [0, 0, 0];
    let x = 0, y = 0, z = 0;
    for (const v of verts) {
      x += v.position[0];
      y += v.position[1];
      z += v.position[2];
    }
    const n = verts.length;
    return [x / n, y / n, z / n];
  }

  /** Deep clone this mesh */
  clone(): HalfEdgeMesh {
    const mesh = this.toTessellatedMesh();
    return HalfEdgeMesh.fromTessellatedMesh(mesh);
  }

  /** Create a simple box mesh for testing */
  static createBox(sx = 1, sy = 1, sz = 1): HalfEdgeMesh {
    const hem = new HalfEdgeMesh();
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;

    // 8 vertices of a box
    hem.addVertex(-hx, -hy, -hz); // 0
    hem.addVertex(hx, -hy, -hz);  // 1
    hem.addVertex(hx, hy, -hz);   // 2
    hem.addVertex(-hx, hy, -hz);  // 3
    hem.addVertex(-hx, -hy, hz);  // 4
    hem.addVertex(hx, -hy, hz);   // 5
    hem.addVertex(hx, hy, hz);    // 6
    hem.addVertex(-hx, hy, hz);   // 7

    // 6 faces (quads)
    hem.addFace([0, 1, 2, 3]); // front
    hem.addFace([5, 4, 7, 6]); // back
    hem.addFace([4, 0, 3, 7]); // left
    hem.addFace([1, 5, 6, 2]); // right
    hem.addFace([3, 2, 6, 7]); // top
    hem.addFace([4, 5, 1, 0]); // bottom

    hem.computeVertexNormals();
    return hem;
  }

  /** Create a UV sphere */
  static createSphere(radius = 1, segments = 16, rings = 12): HalfEdgeMesh {
    const hem = new HalfEdgeMesh();

    // Top pole
    hem.addVertex(0, radius, 0);

    // Middle rings
    for (let ring = 1; ring < rings; ring++) {
      const phi = (Math.PI * ring) / rings;
      const y = radius * Math.cos(phi);
      const r = radius * Math.sin(phi);
      for (let seg = 0; seg < segments; seg++) {
        const theta = (2 * Math.PI * seg) / segments;
        hem.addVertex(r * Math.cos(theta), y, r * Math.sin(theta));
      }
    }

    // Bottom pole
    const bottomId = 1 + (rings - 1) * segments;
    hem.addVertex(0, -radius, 0);

    // Top cap triangles
    for (let seg = 0; seg < segments; seg++) {
      const next = (seg + 1) % segments;
      hem.addFace([0, 1 + seg, 1 + next]);
    }

    // Middle quads
    for (let ring = 0; ring < rings - 2; ring++) {
      for (let seg = 0; seg < segments; seg++) {
        const next = (seg + 1) % segments;
        const base = 1 + ring * segments;
        const baseNext = 1 + (ring + 1) * segments;
        hem.addFace([base + seg, baseNext + seg, baseNext + next, base + next]);
      }
    }

    // Bottom cap triangles
    const lastRingBase = 1 + (rings - 2) * segments;
    for (let seg = 0; seg < segments; seg++) {
      const next = (seg + 1) % segments;
      hem.addFace([lastRingBase + seg, bottomId, lastRingBase + next]);
    }

    hem.computeVertexNormals();
    return hem;
  }
}

/** Selection mode for edit mode */
export type SelectionMode = "vertex" | "edge" | "face";

export interface MeshSelection {
  mode: SelectionMode;
  vertexIds: Set<number>;
  edgeIds: Set<number>; // half-edge IDs
  faceIds: Set<number>;
}

export function createEmptySelection(): MeshSelection {
  return {
    mode: "vertex",
    vertexIds: new Set(),
    edgeIds: new Set(),
    faceIds: new Set(),
  };
}
